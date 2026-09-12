import { eq, and, sql } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import {
  CANDIDATE_STATUSES,
  SECTORS,
  PARALLEL_TRACK,
  type ScanResult,
} from "@musteri-avcisi/shared";
import type { Env } from "../env";
import { draftProposal } from "../lib/proposal";
import { assessRelevance } from "../lib/relevance";
import { getEffectiveSettings } from "../lib/settings";

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
 * eklemeyi engeller. Kaydetmeden önce NVIDIA ile bir "alakalı mı"
 * kontrolü (bkz. lib/relevance.ts assessRelevance) yapılır - özellikle
 * LinkedIn'de anahtar kelime taramasının çoğunlukla iş ilanı döndürmesi
 * sorununa karşı (bkz. CLAUDE.md). Alakasız bulunursa aday yine de
 * kaydedilir (kaybolmaz, denetlenebilir) ama doğrudan `rejected`
 * durumuna geçer - onay bekleyenler listesini kirletmez, teklif metni de
 * boşuna üretilmez. Alakalı bulunursa (ya da AI atlandıysa/başarısız
 * olduysa - FAIL-OPEN, bkz. assessRelevance) her zamanki gibi
 * `pending_approval`'a kadar işlenir - AMA HİÇBİR ŞEY GÖNDERİLMEZ,
 * gönderim sadece `/candidates/:id/approve` çağrıldığında tetiklenir.
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

    const relevance = await assessRelevance(
      {
        candidateName: result.name,
        sectorLabel: sectorLabel(result.sectorSlug),
        needTags: result.needTags,
        sourceChannel: result.sourceChannel,
        rawMetadata: result.rawMetadata,
      },
      proposalSettings,
    );
    if (relevance.error) {
      console.warn(`AI alaka kontrolü atlandı/başarısız (${result.name}): ${relevance.error}`);
    }

    if (!relevance.relevant) {
      // Alakasız (ör. iş ilanı) - kaydedilir ama doğrudan reddedilir,
      // teklif metni boşuna üretilmez ve onay bekleyenler listesi
      // kirlenmez. "Tüm Adaylar" sayfasında hâlâ görülüp geri
      // alınabilir (kaybolmaz).
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
        status: "rejected",
        evaluationNotes: `AI: alakasız görünüyor - ${relevance.reason || "gerekçe yok"}`,
        rawMetadata: result.rawMetadata ?? null,
      });
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
      proposalDraft: proposal.text,
      rawMetadata: result.rawMetadata ?? null,
    });

    created.push(id);
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
