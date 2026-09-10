import { eq, desc } from "drizzle-orm";
import { createDb, candidates, communicationLog } from "@musteri-avcisi/db";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Gönderilen (veya gönderimi denenip başarısız olan) mesajların listesi -
 * dashboard'daki "Gönderilenler" sayfası bunu kullanır. Adayın
 * ad/sektörünü de aynı satırda döndürmek için candidates ile join edilir.
 */
export async function handleListCommunications(env: Env): Promise<Response> {
  const db = createDb(env.DB);

  const rows = await db
    .select({
      id: communicationLog.id,
      candidateId: communicationLog.candidateId,
      channel: communicationLog.channel,
      direction: communicationLog.direction,
      status: communicationLog.status,
      createdAt: communicationLog.createdAt,
      candidateName: candidates.name,
      sectorSlug: candidates.sectorSlug,
      rawMetadata: candidates.rawMetadata,
    })
    .from(communicationLog)
    .leftJoin(candidates, eq(communicationLog.candidateId, candidates.id))
    .orderBy(desc(communicationLog.createdAt));

  return json({ communications: rows });
}
