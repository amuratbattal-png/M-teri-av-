import { sql, desc, isNotNull } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface SectorCount {
  sectorSlug: string;
  count: number;
}

export interface CityCount {
  citySlug: string | null;
  cityLabel: string | null;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

/**
 * Dashboard'daki Rapor sayfası (`/rapor`) için: durum/sektör/şehir
 * kırılımları. Tüm sayaçlar tek D1 sorgusuyla (GROUP BY) hesaplanıyor -
 * candidates tablosunun tamamını worker'a çekmiyor, D1 içinde toplanıyor.
 * Şehir bilgisi ayrı bir sütun değil (bkz. CLAUDE.md) -
 * `raw_metadata`'dan `json_extract` ile okunuyor.
 */
export async function handleGetReport(env: Env): Promise<Response> {
  const db = createDb(env.DB);

  const byStatus = await db
    .select({ status: candidates.status, count: sql<number>`count(*)` })
    .from(candidates)
    .groupBy(candidates.status);

  const bySector = await db
    .select({ sectorSlug: candidates.sectorSlug, count: sql<number>`count(*)` })
    .from(candidates)
    .groupBy(candidates.sectorSlug)
    .orderBy(desc(sql`count(*)`));

  const cityExpr = sql<string>`json_extract(${candidates.rawMetadata}, '$.citySlug')`;
  const cityLabelExpr = sql<string>`json_extract(${candidates.rawMetadata}, '$.cityLabel')`;
  const byCity = await db
    .select({ citySlug: cityExpr, cityLabel: cityLabelExpr, count: sql<number>`count(*)` })
    .from(candidates)
    .where(isNotNull(cityExpr))
    .groupBy(cityExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return json({
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })) satisfies StatusCount[],
    bySector: bySector.map((r) => ({ sectorSlug: r.sectorSlug, count: Number(r.count) })) satisfies SectorCount[],
    byCity: byCity.map((r) => ({
      citySlug: r.citySlug,
      cityLabel: r.cityLabel,
      count: Number(r.count),
    })) satisfies CityCount[],
  });
}
