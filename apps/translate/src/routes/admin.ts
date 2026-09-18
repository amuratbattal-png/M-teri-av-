import { eq, desc } from "drizzle-orm";
import { createDb, speakers, sessions } from "../db/client";
import type { Env } from "../env";
import { newId, newJoinCode, newSpeakerToken } from "../lib/ids";
import { renderQrSvg } from "../lib/qrcode";
import {
  renderSpeakersPage,
  renderSessionsPage,
  renderSessionDetailPage,
  type SpeakerRow,
  type SessionListItem,
} from "../render/admin";

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

async function listSpeakers(env: Env): Promise<SpeakerRow[]> {
  const db = createDb(env.DB);
  return db.select().from(speakers).orderBy(desc(speakers.createdAt)).all();
}

async function listSessionItems(env: Env): Promise<SessionListItem[]> {
  const db = createDb(env.DB);
  const speakerRows = await db.select().from(speakers).all();
  const speakerNameById = new Map(speakerRows.map((s) => [s.id, s.name]));

  const sessionRows = await db.select().from(sessions).orderBy(desc(sessions.createdAt)).all();
  return sessionRows.map((s) => ({
    id: s.id,
    joinCode: s.joinCode,
    title: s.title,
    speakerId: s.speakerId,
    speakerName: speakerNameById.get(s.speakerId) ?? "Bilinmeyen konuşmacı",
    sourceLang: s.sourceLang,
    status: s.status,
    createdAt: s.createdAt,
    endedAt: s.endedAt,
  }));
}

export async function handleSpeakersPage(env: Env, error?: string): Promise<Response> {
  const rows = await listSpeakers(env);
  return html(renderSpeakersPage(rows, error));
}

export async function handleCreateSpeaker(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) {
    return Response.redirect(
      new URL(request.url).origin + "/admin/speakers?error=" + encodeURIComponent("Ad boş olamaz"),
      303,
    );
  }
  const db = createDb(env.DB);
  await db.insert(speakers).values({ id: newId(), name, createdAt: new Date().toISOString() });
  return Response.redirect(new URL(request.url).origin + "/admin/speakers", 303);
}

export async function handleDeleteSpeaker(
  request: Request,
  env: Env,
  speakerId: string,
): Promise<Response> {
  const db = createDb(env.DB);
  await db.delete(speakers).where(eq(speakers.id, speakerId));
  return Response.redirect(new URL(request.url).origin + "/admin/speakers", 303);
}

export async function handleSessionsPage(env: Env, error?: string): Promise<Response> {
  const [sessionItems, speakerRows] = await Promise.all([listSessionItems(env), listSpeakers(env)]);
  return html(renderSessionsPage(sessionItems, speakerRows, error));
}

export async function handleCreateSession(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const speakerId = String(form.get("speakerId") ?? "").trim();
  const sourceLang = String(form.get("sourceLang") ?? "tr").trim() || "tr";
  const origin = new URL(request.url).origin;

  if (!title || !speakerId) {
    return Response.redirect(
      origin + "/admin/sessions?error=" + encodeURIComponent("Başlık ve konuşmacı gerekli"),
      303,
    );
  }

  const db = createDb(env.DB);
  const id = newId();
  await db.insert(sessions).values({
    id,
    joinCode: newJoinCode(),
    title,
    speakerId,
    sourceLang,
    speakerToken: newSpeakerToken(),
    status: "active",
    createdAt: new Date().toISOString(),
  });

  return Response.redirect(origin + "/admin/sessions/" + id, 303);
}

async function getSessionOrNull(env: Env, id: string) {
  const db = createDb(env.DB);
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function handleSessionDetailPage(
  env: Env,
  origin: string,
  sessionId: string,
): Promise<Response> {
  const session = await getSessionOrNull(env, sessionId);
  if (!session) return html("Oturum bulunamadı", 404);

  const db = createDb(env.DB);
  const speakerRows = await db.select().from(speakers).where(eq(speakers.id, session.speakerId)).limit(1);
  const speakerName = speakerRows[0]?.name ?? "Bilinmeyen konuşmacı";

  const item: SessionListItem = {
    id: session.id,
    joinCode: session.joinCode,
    title: session.title,
    speakerId: session.speakerId,
    speakerName,
    sourceLang: session.sourceLang,
    status: session.status,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
  };

  const joinUrl = origin + "/join/" + session.joinCode;
  const speakUrl = origin + "/speak/" + session.id + "?token=" + session.speakerToken;
  const qrSvg = await renderQrSvg(joinUrl);
  const status = await getRoomStatus(env, session.id);

  return html(
    renderSessionDetailPage(item, joinUrl, speakUrl, qrSvg, status.participantCount),
  );
}

export async function handleEndSession(request: Request, env: Env, sessionId: string): Promise<Response> {
  const db = createDb(env.DB);
  await db
    .update(sessions)
    .set({ status: "ended", endedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId));

  const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(sessionId));
  await stub.fetch("https://internal/end", { method: "POST" });

  return Response.redirect(new URL(request.url).origin + "/admin/sessions/" + sessionId, 303);
}

export async function getRoomStatus(
  env: Env,
  sessionId: string,
): Promise<{ participantCount: number }> {
  const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(sessionId));
  const res = await stub.fetch("https://internal/status");
  return res.json();
}

export async function handleSessionStatus(env: Env, sessionId: string): Promise<Response> {
  const status = await getRoomStatus(env, sessionId);
  return new Response(JSON.stringify(status), {
    headers: { "content-type": "application/json" },
  });
}
