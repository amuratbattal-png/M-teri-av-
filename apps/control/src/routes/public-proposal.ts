import { eq } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import { SECTORS, PARALLEL_TRACK } from "@musteri-avcisi/shared";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sectorLabel(slug: string): string {
  if (slug === PARALLEL_TRACK.slug) return PARALLEL_TRACK.labelTr;
  return SECTORS.find((s) => s.slug === slug)?.labelTr ?? slug;
}

/**
 * `apps/dashboard`'daki `/teklif/:token` (hosted teklif sayfası)
 * bunu çağırır - dashboard'un KENDİSİ Basic Auth'suz, herkese açık
 * bir sayfa olduğu için (adayın/müşterinin kendisi açıyor), buraya
 * SADECE minimal/güvenli alanlar döner: isim, sektör, teklif metni,
 * durum. Not/etiket/iletişim bilgisi gibi İÇE dönük veriler ASLA
 * dönmez - bu, dashboard->control çağrısı olduğu için
 * (CONTROL_SHARED_SECRET ile korunan normal kanaldan geçiyor, bkz.
 * index.ts) hâlâ kimlik doğrulamalı bir istek, ama alan seçimi
 * kasıtlı olarak dar tutuldu.
 */
export async function handleGetPublicProposal(env: Env, token: string): Promise<Response> {
  if (!token) return json({ error: "not found" }, 404);

  const db = createDb(env.DB);
  const rows = await db.select().from(candidates).where(eq(candidates.proposalToken, token)).limit(1);
  const candidate = rows[0];
  if (!candidate) return json({ error: "not found" }, 404);

  return json({
    name: candidate.name,
    sectorLabel: sectorLabel(candidate.sectorSlug),
    proposalDraft: candidate.proposalDraft,
    status: candidate.status,
  });
}
