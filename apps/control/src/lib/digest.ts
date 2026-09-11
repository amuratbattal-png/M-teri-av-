import { sql } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import type { Env } from "../env";

/**
 * Günlük özet e-postası - "Bugün X yeni aday bulundu, Y onay bekliyor,
 * Z takip tarihi geldi" gibi sabah özeti. Sessiz arıza bildirimleriyle
 * (routes/alerts.ts) AYNI EMAIL_WORKER/ALERT_EMAIL altyapısını kullanır -
 * ek kimlik bilgisi gerekmiyor. `apps/control/src/index.ts`'teki
 * `scheduled()` handler'ından, wrangler.toml'daki cron tetikleyicisiyle
 * (her gün 06:00 UTC = 09:00 İstanbul) çağrılır.
 *
 * "Onay olmadan gönderim yok" kuralını ihlal etmiyor - bu bir müşteri
 * teklifi değil, sahibine giden bir sistem bildirimi (alerts.ts'teki
 * gibi).
 */
export async function sendDailyDigest(env: Env): Promise<void> {
  if (!env.ALERT_EMAIL || !env.EMAIL_WORKER) {
    console.warn("ALERT_EMAIL veya EMAIL_WORKER tanımlı değil - günlük özet atlandı.");
    return;
  }

  const db = createDb(env.DB);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const pendingRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(candidates)
    .where(sql`${candidates.status} = 'pending_approval'`);
  const discoveredRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(candidates)
    .where(sql`${candidates.discoveredAt} >= ${since24h}`);
  const followUpRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(candidates)
    .where(sql`${candidates.followUpDate} IS NOT NULL AND ${candidates.followUpDate} <= ${todayStr}`);

  const pending = Number(pendingRows[0]?.count ?? 0);
  const discoveredLast24h = Number(discoveredRows[0]?.count ?? 0);
  const followUpsDue = Number(followUpRows[0]?.count ?? 0);

  // Hiç yeni bir şey yoksa (hafta sonu, tarama sonuç bulamadı vb.)
  // yine de gönderiyoruz - "sistem sessizce durdu mu?" endişesini de
  // gidersin diye (sıfır sayı = sistem çalışıyor ama bulacak bir şey
  // yok, farklı bir bilgi).
  const lines = [
    `Bugünkü özet (${todayStr}):`,
    "",
    `- Onay bekleyen aday: ${pending}`,
    `- Son 24 saatte bulunan yeni aday: ${discoveredLast24h}`,
    `- Bugüne kadar (dahil) takip tarihi gelmiş aday: ${followUpsDue}`,
    "",
    "Detaylar için dashboard'a bakabilirsin.",
  ];

  try {
    await env.EMAIL_WORKER.fetch("https://internal/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-outreach-secret": env.OUTREACH_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({
        to: env.ALERT_EMAIL,
        subject: `[Müşteri Avcısı] Günlük özet - ${todayStr}`,
        content: lines.join("\n"),
      }),
    });
  } catch (err) {
    console.error("günlük özet e-postası gönderilemedi", err);
  }
}
