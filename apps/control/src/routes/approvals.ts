import { eq } from "drizzle-orm";
import { createDb, candidates } from "@musteri-avcisi/db";
import type { Env, OutreachJob } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Onay noktası: sistemdeki HİÇBİR mesaj/teklif buradan geçmeden
 * gönderilemez. Sahibi (approvedBy) burada teyit etmeden OUTREACH_QUEUE'ya
 * hiçbir şey konmaz.
 */
export async function handleApprove(
  request: Request,
  env: Env,
  candidateId: string,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { approvedBy?: string };
  const db = createDb(env.DB);

  const rows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  const candidate = rows[0];
  if (!candidate) return json({ error: "candidate not found" }, 404);
  if (candidate.status !== "pending_approval") {
    return json({ error: `candidate not pending approval (status=${candidate.status})` }, 409);
  }

  const now = new Date().toISOString();
  await db
    .update(candidates)
    .set({ status: "approved", approvedBy: body.approvedBy ?? "unknown", approvedAt: now })
    .where(eq(candidates.id, candidateId));

  // Tercih sırası: WhatsApp varsa WhatsApp, yoksa e-posta.
  const channel: OutreachJob["channel"] = candidate.contactWhatsapp ? "whatsapp" : "email";
  await env.OUTREACH_QUEUE.send({ candidateId, channel });

  return json({ ok: true, candidateId, dispatchedTo: channel });
}

export async function handleReject(env: Env, candidateId: string): Promise<Response> {
  const db = createDb(env.DB);
  await db.update(candidates).set({ status: "rejected" }).where(eq(candidates.id, candidateId));
  return json({ ok: true, candidateId });
}
