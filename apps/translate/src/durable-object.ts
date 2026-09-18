import { eq } from "drizzle-orm";
import { createDb, sessions, transcriptEntries } from "./db/client";
import type { Env } from "./env";
import { translateText } from "./lib/translate";

/**
 * Her WebSocket bağlantısına `serializeAttachment` ile iliştirilen küçük
 * meta veri - Cloudflare'in Hibernation API'si sayesinde bu, Durable
 * Object hafızadan tahliye edilse (hibernate) bile bağlantıyla birlikte
 * KALICI kalıyor; yani katılımcı/konuşmacı listesini kendi Map'imizde
 * TUTMUYORUZ (o hibernate'te silinirdi) - her ihtiyaçta
 * `this.state.getWebSockets()` ile o anki gerçek bağlantı listesi
 * (attachment'larıyla birlikte) okunuyor. Bu, "katılımcı sınırı
 * olmayacak" isteğine karşılık, çok sayıda eşzamanlı bağlantıyı hafıza
 * baskısı yaratmadan taşımak için Cloudflare'in önerdiği desen.
 */
interface WsAttachment {
  role: "speaker" | "participant";
  sessionId: string;
  sourceLang: string;
  /** Konuşmacı için her zaman sourceLang ile aynı; katılımcı için seçtiği hedef dil. */
  lang: string;
}

interface SessionRow {
  id: string;
  sourceLang: string;
  speakerToken: string;
  status: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const HISTORY_LIMIT = 20;

export class SessionRoom {
  private readonly state: DurableObjectState;
  private readonly env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Admin panelinden düz HTTP ile çağrılan iç uçlar (WebSocket DEĞİL).
    if (url.pathname === "/status" && request.method === "GET") {
      return json({ participantCount: this.countParticipants() });
    }
    if (url.pathname === "/end" && request.method === "POST") {
      this.broadcastAll({ type: "session_ended" });
      this.closeAll(1000, "Oturum sona erdi");
      return json({ ok: true });
    }

    const match = url.pathname.match(/^\/ws\/([^/]+)$/);
    if (!match || request.headers.get("Upgrade") !== "websocket") {
      return new Response("not found", { status: 404 });
    }
    const sessionId = match[1];

    const db = createDb(this.env.DB);
    const rows = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    const session = rows[0] as SessionRow | undefined;
    if (!session) return new Response("Oturum bulunamadı", { status: 404 });
    if (session.status !== "active") {
      return new Response("Bu oturum sona ermiş", { status: 410 });
    }

    const role = url.searchParams.get("role") === "speaker" ? "speaker" : "participant";
    if (role === "speaker") {
      const token = url.searchParams.get("token") ?? "";
      if (token !== session.speakerToken) {
        return new Response("Geçersiz konuşmacı bağlantısı", { status: 401 });
      }
    }
    const lang =
      role === "participant"
        ? url.searchParams.get("lang") || session.sourceLang
        : session.sourceLang;

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    const attachment: WsAttachment = { role, sessionId, sourceLang: session.sourceLang, lang };
    server.serializeAttachment(attachment);

    if (role === "participant") {
      await this.sendHistoryTo(server, db, sessionId, lang);
    }
    this.broadcastParticipantCount();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const attachment = ws.deserializeAttachment() as WsAttachment | null;
    if (!attachment) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (!isRecord(parsed) || typeof parsed.type !== "string") return;

    if (attachment.role === "speaker") {
      await this.handleSpeakerMessage(ws, attachment, parsed);
    } else {
      this.handleParticipantMessage(ws, attachment, parsed);
    }
  }

  async webSocketClose(): Promise<void> {
    this.broadcastParticipantCount();
  }

  async webSocketError(): Promise<void> {
    this.broadcastParticipantCount();
  }

  private async handleSpeakerMessage(
    ws: WebSocket,
    attachment: WsAttachment,
    parsed: Record<string, unknown>,
  ): Promise<void> {
    if (parsed.type === "interim" && typeof parsed.text === "string") {
      // Sadece kaynak dildeki katılımcılara - çeviri gerekmiyor, ücretsiz
      // ve anlık bir "canlı altyazı" hissi için. Diğer diller nihai
      // (final) çeviriyi bekler.
      this.sendToParticipants(attachment.sourceLang, { type: "interim", text: parsed.text });
      return;
    }

    if (parsed.type === "final" && typeof parsed.text === "string") {
      const text = parsed.text.trim();
      if (!text) return;
      await this.handleFinalTranscript(ws, attachment, text);
      return;
    }

    if (parsed.type === "end_session") {
      const db = createDb(this.env.DB);
      await db
        .update(sessions)
        .set({ status: "ended", endedAt: new Date().toISOString() })
        .where(eq(sessions.id, attachment.sessionId));
      this.broadcastAll({ type: "session_ended" });
      this.closeAll(1000, "Oturum sona erdi");
    }
  }

  private async handleFinalTranscript(
    ws: WebSocket,
    attachment: WsAttachment,
    text: string,
  ): Promise<void> {
    const sourceLang = attachment.sourceLang;
    const db = createDb(this.env.DB);

    const seq = await this.nextSeq();
    const entryId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.insert(transcriptEntries).values({
      id: entryId,
      sessionId: attachment.sessionId,
      seq,
      sourceText: text,
      sourceLang,
      translations: {},
      createdAt,
    });

    try {
      ws.send(JSON.stringify({ type: "ack", seq }));
    } catch {
      // konuşmacı bağlantısı zaten kopmuş olabilir, önemli değil
    }

    // Kaynak dildeki katılımcılara hemen gönder - çeviri beklemeye gerek yok.
    this.sendToParticipants(sourceLang, {
      type: "final",
      id: entryId,
      seq,
      sourceText: text,
      sourceLang,
      lang: sourceLang,
      text,
      createdAt,
      translationOk: true,
    });

    const distinctLangs = new Set<string>();
    for (const socket of this.state.getWebSockets()) {
      const att = socket.deserializeAttachment() as WsAttachment | null;
      if (att?.role === "participant" && att.lang !== sourceLang) distinctLangs.add(att.lang);
    }
    if (distinctLangs.size === 0) return;

    // Her benzersiz hedef dil için PARALEL çeviri - aynı dili paylaşan N
    // katılımcı için tek çağrı yeterli. Sonuçlar tek bir nesnede
    // birleştirilip D1'e TEK seferde yazılıyor (bkz. aşağıdaki not - ayrı
    // ayrı yazmak paralel çağrılar arasında birbirini ezme riski taşırdı).
    const translationsToSave: Record<string, string> = {};
    await Promise.all(
      Array.from(distinctLangs).map(async (lang) => {
        const result = await translateText(this.env, text, sourceLang, lang);
        if (result.ok) translationsToSave[lang] = result.text;
        this.sendToParticipants(lang, {
          type: "final",
          id: entryId,
          seq,
          sourceText: text,
          sourceLang,
          lang,
          text: result.text,
          createdAt,
          translationOk: result.ok,
        });
      }),
    );

    if (Object.keys(translationsToSave).length > 0) {
      await db
        .update(transcriptEntries)
        .set({ translations: translationsToSave })
        .where(eq(transcriptEntries.id, entryId));
    }
  }

  private handleParticipantMessage(
    ws: WebSocket,
    attachment: WsAttachment,
    parsed: Record<string, unknown>,
  ): void {
    if (parsed.type === "change_lang" && typeof parsed.lang === "string") {
      const updated: WsAttachment = { ...attachment, lang: parsed.lang };
      ws.serializeAttachment(updated);
      const db = createDb(this.env.DB);
      void this.sendHistoryTo(ws, db, attachment.sessionId, parsed.lang);
    }
  }

  /**
   * DO depolaması (`state.storage`) - hafızadan tahliye (hibernate) edilse
   * bile kalıcı; sıra numarası (seq) burada tutuluyor. Tek bir konuşmacı
   * aynı anda konuştuğu için (eşzamanlı yazma yarışı pratikte yok) basit
   * oku-yaz-artır yeterli.
   */
  private async nextSeq(): Promise<number> {
    const current = (await this.state.storage.get<number>("seq")) ?? 0;
    const next = current + 1;
    await this.state.storage.put("seq", next);
    return next;
  }

  private async sendHistoryTo(
    ws: WebSocket,
    db: ReturnType<typeof createDb>,
    sessionId: string,
    lang: string,
  ): Promise<void> {
    const rows = await db
      .select()
      .from(transcriptEntries)
      .where(eq(transcriptEntries.sessionId, sessionId))
      .orderBy(transcriptEntries.seq)
      .all();
    const recent = rows.slice(-HISTORY_LIMIT);

    const entries = await Promise.all(
      recent.map(async (entry) => {
        if (lang === entry.sourceLang) {
          return {
            id: entry.id,
            seq: entry.seq,
            sourceText: entry.sourceText,
            sourceLang: entry.sourceLang,
            lang,
            text: entry.sourceText,
            createdAt: entry.createdAt,
            translationOk: true,
          };
        }
        const cached = entry.translations?.[lang];
        if (cached) {
          return {
            id: entry.id,
            seq: entry.seq,
            sourceText: entry.sourceText,
            sourceLang: entry.sourceLang,
            lang,
            text: cached,
            createdAt: entry.createdAt,
            translationOk: true,
          };
        }
        const result = await translateText(this.env, entry.sourceText, entry.sourceLang, lang);
        if (result.ok) {
          const merged = { ...(entry.translations ?? {}), [lang]: result.text };
          await db
            .update(transcriptEntries)
            .set({ translations: merged })
            .where(eq(transcriptEntries.id, entry.id));
        }
        return {
          id: entry.id,
          seq: entry.seq,
          sourceText: entry.sourceText,
          sourceLang: entry.sourceLang,
          lang,
          text: result.text,
          createdAt: entry.createdAt,
          translationOk: result.ok,
        };
      }),
    );

    try {
      ws.send(JSON.stringify({ type: "history", entries }));
    } catch {
      // bağlantı bu arada kapanmış olabilir
    }
  }

  private countParticipants(): number {
    let count = 0;
    for (const socket of this.state.getWebSockets()) {
      const att = socket.deserializeAttachment() as WsAttachment | null;
      if (att?.role === "participant") count++;
    }
    return count;
  }

  private broadcastParticipantCount(): void {
    const count = this.countParticipants();
    for (const socket of this.state.getWebSockets()) {
      const att = socket.deserializeAttachment() as WsAttachment | null;
      if (att?.role === "speaker") {
        try {
          socket.send(JSON.stringify({ type: "participant_count", count }));
        } catch {
          // yoksay
        }
      }
    }
  }

  private sendToParticipants(lang: string, payload: unknown): void {
    const message = JSON.stringify(payload);
    for (const socket of this.state.getWebSockets()) {
      const att = socket.deserializeAttachment() as WsAttachment | null;
      if (att?.role === "participant" && att.lang === lang) {
        try {
          socket.send(message);
        } catch {
          // bağlantı kopmuş olabilir, sıradaki katılımcıya devam
        }
      }
    }
  }

  private broadcastAll(payload: unknown): void {
    const message = JSON.stringify(payload);
    for (const socket of this.state.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        // yoksay
      }
    }
  }

  private closeAll(code: number, reason: string): void {
    for (const socket of this.state.getWebSockets()) {
      try {
        socket.close(code, reason);
      } catch {
        // yoksay
      }
    }
  }
}
