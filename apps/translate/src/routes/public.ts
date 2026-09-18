import { eq } from "drizzle-orm";
import { createDb, sessions, speakers } from "../db/client";
import type { Env } from "../env";
import { renderParticipantPage } from "../render/participant";
import { renderSpeakerPage } from "../render/speaker";
import { publicPage, esc } from "../render/layout";

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function notFoundPage(message: string): Response {
  return html(publicPage("Bulunamadı", `<main><h1>${esc(message)}</h1></main>`), 404);
}

export async function handleJoinPage(env: Env, joinCode: string): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db.select().from(sessions).where(eq(sessions.joinCode, joinCode)).limit(1);
  const session = rows[0];
  if (!session) return notFoundPage("Bu katılım kodu geçerli değil.");

  const speakerRows = await db
    .select()
    .from(speakers)
    .where(eq(speakers.id, session.speakerId))
    .limit(1);
  const speakerName = speakerRows[0]?.name ?? "Bilinmeyen konuşmacı";

  return html(
    renderParticipantPage({
      sessionId: session.id,
      title: session.title,
      speakerName,
      sourceLang: session.sourceLang,
      ended: session.status !== "active",
    }),
  );
}

export async function handleSpeakPage(env: Env, sessionId: string, token: string): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return notFoundPage("Oturum bulunamadı.");
  if (session.status !== "active") {
    return html(publicPage("Oturum sona erdi", `<main><h1>Bu oturum sona erdi.</h1></main>`));
  }
  if (token !== session.speakerToken) {
    return html(
      publicPage("Yetkisiz", `<main><h1>Geçersiz konuşmacı bağlantısı.</h1></main>`),
      401,
    );
  }

  return html(
    renderSpeakerPage({
      sessionId: session.id,
      token: session.speakerToken,
      title: session.title,
      sourceLang: session.sourceLang,
    }),
  );
}
