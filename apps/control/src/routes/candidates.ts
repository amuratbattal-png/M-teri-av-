import { eq, and, sql } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import { CANDIDATE_STATUSES, type ScanResult } from "@musteri-avcisi/shared";
import type { Env } from "../env";
import { draftProposal } from "../lib/proposal";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Tarama worker'larının bulduğu adayları merkezi tabloya yazar.
 * Basit bir eşleşme ile (isim + sektör + kaynak) aynı adayı tekrar
 * eklemeyi engeller. Her yeni aday otomatik olarak `pending_approval`
 * durumuna kadar işlenir - AMA HİÇBİR ŞEY GÖNDERİLMEZ, gönderim sadece
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
      proposalDraft: draftProposal(result.name, result.needTags),
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
