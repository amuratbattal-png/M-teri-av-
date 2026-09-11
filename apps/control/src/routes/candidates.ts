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
import { loadSettings } from "../lib/settings";
import { logActivity } from "../lib/activity";

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
 * Tarama worker'larının bulduğu adayları merkezi tabloya yazar. Aynı
 * adayın tekrar eklenmesini önlemek için:
 * - `google_maps` sonuçlarında Places API'nin verdiği `placeId` varsa
 *   (kanal + placeId eşleşmesi) ONU kullanır - bu, Google'ın kendi
 *   işletme kimliği olduğu için en güvenilir eşleşme.
 * - Yoksa isim + sektör + kaynak + (varsa) şehir ile eşleştirir. ŞEHİR
 *   ÖNEMLİ: Maps taraması artık 81 il üzerinden yapıldığı için ("X
 *   Kuaför" gibi yaygın isimler onlarca ilde ayrı ayrı gerçek işletme
 *   olabilir) - şehri hesaba katmayan bir eşleşme, farklı şehirlerdeki
 *   gerçek adayları "zaten var" sanıp sessizce atlar. Şehir bilgisi
 *   olmayan kaynaklarda (ör. google_search) eskisi gibi sadece isim +
 *   sektör + kaynak kullanılır.
 *
 * Her yeni aday otomatik olarak `pending_approval` durumuna kadar
 * işlenir - AMA HİÇBİR ŞEY GÖNDERİLMEZ, gönderim sadece
 * `/candidates/:id/approve` çağrıldığında tetiklenir.
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
  // Bu taramadaki tüm sonuçlar için TEK sefer okunur (her aday için ayrı
  // DB sorgusu yerine) - Ayarlar sayfasından değiştirilen teklif
  // şablonu/AI ayarları burada uygulanır.
  const settings = await loadSettings(env);

  for (const result of body.results) {
    const placeId = result.rawMetadata?.placeId;
    const citySlug = result.rawMetadata?.citySlug;

    const dedupConditions = [
      eq(candidates.sectorSlug, result.sectorSlug),
      eq(candidates.sourceChannel, result.sourceChannel),
    ];
    if (typeof placeId === "string" && placeId) {
      dedupConditions.push(sql`json_extract(${candidates.rawMetadata}, '$.placeId') = ${placeId}`);
    } else {
      dedupConditions.push(eq(candidates.name, result.name));
      if (typeof citySlug === "string" && citySlug) {
        dedupConditions.push(
          sql`json_extract(${candidates.rawMetadata}, '$.citySlug') = ${citySlug}`,
        );
      }
    }

    const existing = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(...dedupConditions))
      .limit(1);

    if (existing.length > 0) continue;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const cityLabel = result.rawMetadata?.cityLabel;

    const proposal = await draftProposal(
      {
        candidateName: result.name,
        needTags: result.needTags,
        sectorLabel: sectorLabel(result.sectorSlug),
        cityLabel: typeof cityLabel === "string" ? cityLabel : undefined,
      },
      env,
      settings,
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
      websiteUrl: result.websiteUrl ?? null,
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
    await logActivity(env, id, "created", `Kaynak: ${result.sourceChannel}`);

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
 *
 * `counts.follow_up_due`, gerçek bir `CandidateStatus` DEĞİL - bugüne
 * kadar (dahil) takip tarihi gelmiş aday sayısı. Dashboard'daki "Takip"
 * nav rozetini bu besliyor; ayrı bir round-trip gerekmesin diye buraya
 * eklendi (bkz. apps/dashboard/src/index.ts fetchStats).
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

  const today = new Date().toISOString().slice(0, 10);
  const followUpRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(candidates)
    .where(sql`${candidates.followUpDate} IS NOT NULL AND ${candidates.followUpDate} <= ${today}`);
  counts.follow_up_due = Number(followUpRows[0]?.count ?? 0);

  return json({ counts });
}
