import { eq, and, isNull, sql } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import {
  CANDIDATE_STATUSES,
  SECTORS,
  PARALLEL_TRACK,
  type NeedTag,
  type ScanResult,
} from "@musteri-avcisi/shared";
import type { Env } from "../env";
import { draftProposal } from "../lib/proposal";
import { assessLeadQuality, ON_HOLD_MAX_SCORE } from "../lib/relevance";
import { getEffectiveSettings } from "../lib/settings";
import { logActivity } from "../lib/activity-log";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Slug'dan Türkçe sektör etiketi - apps/dashboard'daki sectorLabel() ile aynı mantık. */
function sectorLabel(slug: string): string {
  if (slug === PARALLEL_TRACK.slug) return PARALLEL_TRACK.labelTr;
  return SECTORS.find((s) => s.slug === slug)?.labelTr ?? slug;
}

/**
 * Tarama worker'larının bulduğu adayları merkezi tabloya yazar.
 * Basit bir eşleşme ile (isim + sektör + kaynak) aynı adayı tekrar
 * eklemeyi engeller. Kaydetmeden önce NVIDIA ile 1-5 yıldız bir "lead
 * kalitesi" puanlaması (bkz. lib/relevance.ts assessLeadQuality) yapılır
 * - özellikle LinkedIn'de anahtar kelime taramasının çoğunlukla iş ilanı
 * döndürmesi sorununa karşı (bkz. CLAUDE.md). Puan `ON_HOLD_MAX_SCORE`
 * (2) ve altındaysa aday yine de kaydedilir (kaybolmaz, denetlenebilir)
 * ama doğrudan `on_hold` ("Askıda") durumuna geçer - onay bekleyenler
 * listesini kirletmez, teklif metni de boşuna üretilmez; sahibi Askıda
 * sayfasından isterse onaya gönderebilir isterse kalıcı reddedebilir.
 * Puan 3+ ise (ya da AI hiç puanlamadıysa - FAIL-OPEN, bkz.
 * assessLeadQuality) her zamanki gibi `pending_approval`'a kadar işlenir
 * - AMA HİÇBİR ŞEY GÖNDERİLMEZ, gönderim sadece `/candidates/:id/approve`
 * çağrıldığında tetiklenir.
 */
export async function handleScanResults(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("x-scan-secret")?.trim();
  if (!auth || auth !== env.SCAN_SHARED_SECRET?.trim()) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = (await request.json()) as { results: ScanResult[] };
  if (!Array.isArray(body?.results)) {
    return json({ error: "invalid body: expected { results: ScanResult[] }" }, 400);
  }

  const db = createDb(env.DB);
  const created: string[] = [];
  const proposalSettings = await getEffectiveSettings(env);

  for (const result of body.results) {
    const existing = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(
        and(
          eq(candidates.name, result.name),
          eq(candidates.sectorSlug, result.sectorSlug),
          eq(candidates.sourceChannel, result.sourceChannel),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const cityLabel = result.rawMetadata?.cityLabel;

    const quality = await assessLeadQuality(
      {
        candidateName: result.name,
        sectorLabel: sectorLabel(result.sectorSlug),
        needTags: result.needTags,
        sourceChannel: result.sourceChannel,
        rawMetadata: result.rawMetadata,
      },
      proposalSettings,
    );
    if (quality.error) {
      console.warn(`AI lead puanlaması atlandı/başarısız (${result.name}): ${quality.error}`);
      await logActivity(
        env,
        "warn",
        "lead-quality",
        `${result.name} (${result.sourceChannel}): AI puanlayamadı - ${quality.error}`,
      );
    } else {
      await logActivity(
        env,
        "info",
        "lead-quality",
        `${result.name} (${result.sourceChannel}): ${quality.score}/5 yıldız - ${quality.reason || "gerekçe yok"}`,
      );
    }

    if (typeof quality.score === "number" && quality.score <= ON_HOLD_MAX_SCORE) {
      // Düşük puan (ör. iş ilanı) - kaydedilir ama doğrudan "Askıda"ya
      // gider, teklif metni boşuna üretilmez ve onay bekleyenler listesi
      // kirlenmez. Askıda sayfasından hâlâ onaya gönderilebilir ya da
      // kalıcı reddedilebilir (kaybolmaz).
      await db.insert(candidates).values({
        id,
        name: result.name,
        sectorSlug: result.sectorSlug,
        sourceChannel: result.sourceChannel,
        sourceUrl: result.sourceUrl ?? null,
        country: "TR",
        needTags: result.needTags,
        contactEmail: result.contactEmail ?? null,
        contactPhone: result.contactPhone ?? null,
        contactWhatsapp: result.contactWhatsapp ?? null,
        contactLinkedin: result.contactLinkedin ?? null,
        discoveredAt: now,
        status: "on_hold",
        aiScore: quality.score,
        evaluationNotes: `AI: düşük puan (${quality.score}/5) - ${quality.reason || "gerekçe yok"}`,
        rawMetadata: result.rawMetadata ?? null,
      });
      await logActivity(
        env,
        "warn",
        "scan",
        `${result.name}: Askıda'ya alındı (puan ${quality.score}/5) - onay bekleyenlere eklenmedi.`,
      );
      created.push(id);
      continue;
    }

    const proposal = await draftProposal(
      {
        candidateName: result.name,
        needTags: result.needTags,
        sectorLabel: sectorLabel(result.sectorSlug),
        cityLabel: typeof cityLabel === "string" ? cityLabel : undefined,
      },
      proposalSettings,
    );
    if (!proposal.usedAI) {
      console.warn(`AI teklif metni üretilemedi (${result.name}): ${proposal.error}`);
      await logActivity(env, "warn", "proposal", `${result.name}: teklif AI ile yazılamadı - ${proposal.error}`);
    } else {
      await logActivity(env, "info", "proposal", `${result.name}: teklif metni AI ile yazıldı.`);
    }

    await db.insert(candidates).values({
      id,
      name: result.name,
      sectorSlug: result.sectorSlug,
      sourceChannel: result.sourceChannel,
      sourceUrl: result.sourceUrl ?? null,
      country: "TR",
      needTags: result.needTags,
      contactEmail: result.contactEmail ?? null,
      contactPhone: result.contactPhone ?? null,
      contactWhatsapp: result.contactWhatsapp ?? null,
      contactLinkedin: result.contactLinkedin ?? null,
      discoveredAt: now,
      status: "pending_approval",
      aiScore: quality.score ?? null,
      proposalDraft: proposal.text,
      rawMetadata: result.rawMetadata ?? null,
    });

    created.push(id);
  }

  if (body.results.length > 0) {
    const channel = body.results[0]?.sourceChannel ?? "bilinmiyor";
    await logActivity(
      env,
      "info",
      "scan",
      `${channel}: ${body.results.length} sonuç alındı, ${created.length} yeni kayıt oluşturuldu (${body.results.length - created.length} zaten vardı).`,
    );
  }

  return json({ created: created.length, ids: created });
}

export async function handleListCandidates(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const db = createDb(env.DB);
  const rows = status
    ? await db.select().from(candidates).where(eq(candidates.status, status))
    : await db.select().from(candidates);

  return json({ candidates: rows });
}

/**
 * Sahibinin "sadece yeni müşterileri ve sonuçları görecek" isteğine
 * hizmet eden özet sayaçlar - dashboard bu endpoint'i kullanır.
 */
export async function handleStats(env: Env): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db
    .select({ status: candidates.status, count: sql<number>`count(*)` })
    .from(candidates)
    .groupBy(candidates.status);

  const counts = Object.fromEntries(CANDIDATE_STATUSES.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const row of rows) counts[row.status] = Number(row.count);

  return json({ counts });
}

/**
 * "Rapor" sayfası için kırılım verisi - sektör/kanal/durum bazında sayaçlar
 * (D1'de sqlite JSON içinden GROUP BY yapmak yerine, şehir kırılımı için
 * rawMetadata'yı da çekip JS tarafında sayıyoruz - veri hacmi henüz küçük).
 * Etiketleme (Türkçe sektör/kanal adı) dashboard tarafında yapılıyor -
 * diğer endpoint'lerle aynı konvansiyon.
 */
export async function handleReport(env: Env): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db
    .select({
      sectorSlug: candidates.sectorSlug,
      sourceChannel: candidates.sourceChannel,
      status: candidates.status,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates);

  const bySector: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byCity: Record<string, number> = {};

  for (const row of rows) {
    bySector[row.sectorSlug] = (bySector[row.sectorSlug] ?? 0) + 1;
    byChannel[row.sourceChannel] = (byChannel[row.sourceChannel] ?? 0) + 1;
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const cityLabel = (row.rawMetadata as Record<string, unknown> | null)?.cityLabel;
    if (typeof cityLabel === "string") {
      byCity[cityLabel] = (byCity[cityLabel] ?? 0) + 1;
    }
  }

  return json({ total: rows.length, bySector, byChannel, byStatus, byCity });
}

/** Tek çağrıda işlenecek en fazla aday sayısı - bkz. handleRescoreUnscored. */
const RESCORE_BATCH_SIZE = 15;

/**
 * "Eski verileri de kontrol etsin" - sahibinin isteği (bkz. CLAUDE.md
 * "model end-of-life" olayı). NVIDIA modeli haftalarca ölü kaldığı için
 * (FAIL-OPEN sayesinde) `pending_approval` durumundaki birçok aday HİÇ
 * puanlanmadan (`ai_score IS NULL`) onay bekleyenler listesine girdi -
 * bu, o dönemde gerçekten alakasız (ör. iş ilanı) olabilecek adayların
 * da Askıda'ya değil doğrudan Onaylar'a düşmüş olabileceği anlamına
 * geliyor. Bu endpoint böyle adayları BULUP artık çalışan modelle
 * yeniden puanlıyor (ve teklif metnini de yeniden yazdırıyor - o da
 * aynı dönemde şablona düşmüş olabilir).
 *
 * TEK ÇAĞRIDA TÜMÜNÜ işlemek yerine (yüzlerce aday olabilir, bir
 * Cloudflare Worker isteği bunu güvenle bitiremeyebilir) küçük bir
 * batch (bkz. RESCORE_BATCH_SIZE) işler ve kaç tane kaldığını
 * döndürür - dashboard bunu `remaining > 0` kaldıkça tekrar tekrar
 * çağırıyor (bkz. apps/dashboard/src/render.ts renderSettingsPage
 * script'i).
 */
export async function handleRescoreUnscored(env: Env): Promise<Response> {
  const db = createDb(env.DB);
  const settings = await getEffectiveSettings(env);

  const batch = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.status, "pending_approval"), isNull(candidates.aiScore)))
    .limit(RESCORE_BATCH_SIZE);

  let movedToOnHold = 0;
  for (const candidate of batch) {
    const cityLabel = (candidate.rawMetadata as Record<string, unknown> | null)?.cityLabel;
    const needTags = candidate.needTags as NeedTag[];

    const quality = await assessLeadQuality(
      {
        candidateName: candidate.name,
        sectorLabel: sectorLabel(candidate.sectorSlug),
        needTags,
        sourceChannel: candidate.sourceChannel,
        rawMetadata: candidate.rawMetadata,
      },
      settings,
    );
    if (quality.error) {
      await logActivity(
        env,
        "warn",
        "lead-quality",
        `[Yeniden puanlama] ${candidate.name} (${candidate.sourceChannel}): AI puanlayamadı - ${quality.error}`,
      );
      // Puanlanamadıysa (FAIL-OPEN) dokunmadan geç - bir daha ki toplu
      // çalıştırmada tekrar denenir, ama sonsuz döngüye girmemesi için
      // aiScore'u 0 ile işaretleyip "denendi ama başarısız" diye ayırt
      // etmek yerine basitçe atlıyoruz (bir sonraki genel taramada zaten
      // yeniden denenecek değil - bu adaylar zaten mevcut, tek yol
      // Ayarlar'dan tekrar "Yeniden Puanla"ya basmak).
      continue;
    }
    if (typeof quality.score !== "number") continue; // assessLeadQuality sözleşmesi: error yoksa score dolu olmalı, TS bunu bilemiyor.

    await logActivity(
      env,
      "info",
      "lead-quality",
      `[Yeniden puanlama] ${candidate.name} (${candidate.sourceChannel}): ${quality.score}/5 yıldız - ${quality.reason || "gerekçe yok"}`,
    );

    if (quality.score <= ON_HOLD_MAX_SCORE) {
      await db
        .update(candidates)
        .set({
          status: "on_hold",
          aiScore: quality.score,
          evaluationNotes: `AI (yeniden puanlama): düşük puan (${quality.score}/5) - ${quality.reason || "gerekçe yok"}`,
        })
        .where(eq(candidates.id, candidate.id));
      movedToOnHold++;
      continue;
    }

    // Alakalı bulundu - puanı kaydet, teklif metnini de o dönem şablona
    // düşmüş olabileceği için yeniden yazdır (artık AI çalışıyor).
    const proposal = await draftProposal(
      {
        candidateName: candidate.name,
        needTags,
        sectorLabel: sectorLabel(candidate.sectorSlug),
        cityLabel: typeof cityLabel === "string" ? cityLabel : undefined,
      },
      settings,
    );
    await db
      .update(candidates)
      .set({ aiScore: quality.score, proposalDraft: proposal.text })
      .where(eq(candidates.id, candidate.id));
  }

  const [{ remaining }] = await db
    .select({ remaining: sql<number>`count(*)` })
    .from(candidates)
    .where(and(eq(candidates.status, "pending_approval"), isNull(candidates.aiScore)));

  return json({ processed: batch.length, movedToOnHold, remaining: Number(remaining) });
}
