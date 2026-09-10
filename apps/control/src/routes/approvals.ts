import { eq } from "drizzle-orm";
import { createDb, candidates, communicationLog } from "@musteri-avcisi/db";
import { SECTORS, PARALLEL_TRACK, type NeedTag } from "@musteri-avcisi/shared";
import type { Env } from "../env";
import { draftProposal } from "../lib/proposal";

/** Slug'dan Türkçe sektör etiketi - apps/dashboard'daki sectorLabel() ile aynı mantık. */
function sectorLabel(slug: string): string {
  if (slug === PARALLEL_TRACK.slug) return PARALLEL_TRACK.labelTr;
  return SECTORS.find((s) => s.slug === slug)?.labelTr ?? slug;
}

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

/**
 * Toplu onay - dashboard'daki "Seçilenleri Onayla" için. Her aday
 * tek tek handleApprove ile aynı kurala tabi (sadece pending_approval
 * durumundakiler onaylanır, diğerleri sessizce atlanır).
 */
export async function handleBulkApprove(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    candidateIds?: string[];
    approvedBy?: string;
  };
  if (!Array.isArray(body.candidateIds) || body.candidateIds.length === 0) {
    return json({ error: "invalid body: expected { candidateIds: string[] }" }, 400);
  }

  const db = createDb(env.DB);
  const now = new Date().toISOString();
  const approved: string[] = [];
  const skipped: string[] = [];

  for (const candidateId of body.candidateIds) {
    const rows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
    const candidate = rows[0];
    if (!candidate || candidate.status !== "pending_approval") {
      skipped.push(candidateId);
      continue;
    }
    await db
      .update(candidates)
      .set({ status: "approved", approvedBy: body.approvedBy ?? "unknown", approvedAt: now })
      .where(eq(candidates.id, candidateId));
    approved.push(candidateId);
  }

  return json({ ok: true, approved, skipped });
}

/**
 * Serbest metin not (mini-CRM alanı) - "İlgilenmiyor", "Ay sonu tekrar
 * ara" gibi takip notları için. Şemada zaten vardı (evaluation_notes)
 * ama hiçbir endpoint/arayüz kullanmıyordu, bu onu devreye alıyor.
 */
export async function handleUpdateNotes(
  request: Request,
  env: Env,
  candidateId: string,
): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { evaluationNotes?: string };
  if (typeof body.evaluationNotes !== "string") {
    return json({ error: "invalid body: expected { evaluationNotes: string }" }, 400);
  }
  const db = createDb(env.DB);
  await db
    .update(candidates)
    .set({ evaluationNotes: body.evaluationNotes })
    .where(eq(candidates.id, candidateId));
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
 * Sahibi popup'taki "AI ile Yeniden Yaz" butonuna basınca çağrılır -
 * teklif metnini NVIDIA API ile (bkz. lib/proposal.ts) sıfırdan
 * yeniden yazdırır ve kaydeder. NVIDIA_API_KEY tanımlı değilse basit
 * şablona düşer (hata vermez).
 */
export async function handleRegenerateProposal(env: Env, candidateId: string): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  const candidate = rows[0];
  if (!candidate) return json({ error: "candidate not found" }, 404);

  const cityLabel = (candidate.rawMetadata as Record<string, unknown> | null)?.cityLabel;
  const proposalDraft = await draftProposal(
    {
      candidateName: candidate.name,
      needTags: candidate.needTags as NeedTag[],
      sectorLabel: sectorLabel(candidate.sectorSlug),
      cityLabel: typeof cityLabel === "string" ? cityLabel : undefined,
    },
    env,
  );

  await db.update(candidates).set({ proposalDraft }).where(eq(candidates.id, candidateId));
  return json({ ok: true, candidateId, proposalDraft });
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
