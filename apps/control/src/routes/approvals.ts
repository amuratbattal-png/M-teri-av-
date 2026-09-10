import { eq } from "drizzle-orm";
import { createDb, candidates, communicationLog } from "@musteri-avcisi/db";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Onay noktası: sistemdeki HİÇBİR mesaj/teklif buradan geçmeden
 * gönderilemez.
 *
 * NOT (mimari karar): gönderim artık OTOMATİK değil - sahibi "tüm
 * gönderimleri ben yapacağım" dedi. Burada sadece "approved" durumuna
 * geçiriyoruz; OUTREACH_QUEUE'ya hiçbir şey konmuyor, WhatsApp/e-posta
 * worker'larına otomatik istek atılmıyor. Sahibi Onaylananlar
 * sayfasında (`apps/dashboard`) teklif metnini düzenleyip wa.me/mailto
 * linkleriyle kendi hesabından manuel gönderiyor, sonra
 * `/candidates/:id/mark-sent` ile durumu "sent"e çekiyor.
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

  return json({ ok: true, candidateId });
}

export async function handleReject(env: Env, candidateId: string): Promise<Response> {
  const db = createDb(env.DB);
  await db.update(candidates).set({ status: "rejected" }).where(eq(candidates.id, candidateId));
  return json({ ok: true, candidateId });
}

/** Sahibinin Onaylananlar sayfasında teklif metnini elle düzenlemesi için. */
export async function handleUpdateProposal(
  request: Request,
  env: Env,
  candidateId: string,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { proposalDraft?: string };
  if (typeof body.proposalDraft !== "string") {
    return json({ error: "invalid body: expected { proposalDraft: string }" }, 400);
  }
  const db = createDb(env.DB);
  await db
    .update(candidates)
    .set({ proposalDraft: body.proposalDraft })
    .where(eq(candidates.id, candidateId));
  return json({ ok: true, candidateId });
}

/**
 * Sahibi WhatsApp/e-postayı kendi hesabından MANUEL gönderdikten sonra
 * bunu çağırır - sistem hiçbir şeyi otomatik göndermiyor. Durumu
 * "sent"e çeker ve communication_log'a kayıt düşer (Gönderilenler
 * sayfası bunu okur).
 */
export async function handleMarkSent(
  request: Request,
  env: Env,
  candidateId: string,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { channel?: string };
  if (body.channel !== "whatsapp" && body.channel !== "email") {
    return json({ error: "invalid body: expected { channel: 'whatsapp' | 'email' }" }, 400);
  }
  const db = createDb(env.DB);

  const rows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  const candidate = rows[0];
  if (!candidate) return json({ error: "candidate not found" }, 404);

  const now = new Date().toISOString();
  await db
    .update(candidates)
    .set({ status: "sent", sentAt: now, lastContactChannel: body.channel })
    .where(eq(candidates.id, candidateId));

  await db.insert(communicationLog).values({
    id: crypto.randomUUID(),
    candidateId,
    channel: body.channel,
    direction: "outbound",
    content: candidate.proposalDraft ?? "",
    status: "sent",
    createdAt: now,
  });

  return json({ ok: true, candidateId });
}
