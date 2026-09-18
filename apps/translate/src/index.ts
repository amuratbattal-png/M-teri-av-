import type { Env } from "./env";
import { requireAdminAuth } from "./lib/auth";
import { renderFatalErrorPage } from "./render/layout";
import {
  handleSpeakersPage,
  handleCreateSpeaker,
  handleDeleteSpeaker,
  handleSessionsPage,
  handleCreateSession,
  handleSessionDetailPage,
  handleEndSession,
  handleSessionStatus,
} from "./routes/admin";
import { handleJoinPage, handleSpeakPage } from "./routes/public";

export { SessionRoom } from "./durable-object";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/health") {
    return json({ ok: true, service: "canli-ceviri" });
  }

  // /admin/* HARİCİNDE HİÇBİR ŞEY şifre istemez - katılımcı (/join) ve
  // konuşmacı (/speak) linkleri bilerek açık, kimliği ayrı mekanizmalarla
  // doğrulanıyor (bkz. NOTES.md "Kimlik doğrulama" bölümü).
  if (pathname.startsWith("/admin")) {
    const unauthorized = requireAdminAuth(request, env);
    if (unauthorized) return unauthorized;
    return handleAdminRoute(request, env, url);
  }

  if (pathname === "/" && method === "GET") {
    return Response.redirect(url.origin + "/admin/sessions", 302);
  }

  const joinMatch = pathname.match(/^\/join\/([^/]+)$/);
  if (joinMatch && method === "GET") {
    return handleJoinPage(env, joinMatch[1]);
  }

  const speakMatch = pathname.match(/^\/speak\/([^/]+)$/);
  if (speakMatch && method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    return handleSpeakPage(env, speakMatch[1], token);
  }

  // WebSocket bağlantıları - Durable Object'e (oturum başına bir örnek)
  // olduğu gibi iletiliyor; rol/dil/token bilgisi query string'de.
  const wsMatch = pathname.match(/^\/ws\/([^/]+)$/);
  if (wsMatch) {
    const sessionId = wsMatch[1];
    const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(sessionId));
    return stub.fetch(request);
  }

  return json({ error: "not found" }, 404);
}

async function handleAdminRoute(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/admin" && method === "GET") {
    return Response.redirect(url.origin + "/admin/sessions", 302);
  }

  if (pathname === "/admin/speakers" && method === "GET") {
    return handleSpeakersPage(env, url.searchParams.get("error") || undefined);
  }
  if (pathname === "/admin/speakers" && method === "POST") {
    return handleCreateSpeaker(request, env);
  }
  const deleteSpeakerMatch = pathname.match(/^\/admin\/speakers\/([^/]+)\/delete$/);
  if (deleteSpeakerMatch && method === "POST") {
    return handleDeleteSpeaker(request, env, deleteSpeakerMatch[1]);
  }

  if (pathname === "/admin/sessions" && method === "GET") {
    return handleSessionsPage(env, url.searchParams.get("error") || undefined);
  }
  if (pathname === "/admin/sessions" && method === "POST") {
    return handleCreateSession(request, env);
  }

  const statusMatch = pathname.match(/^\/admin\/sessions\/([^/]+)\/status$/);
  if (statusMatch && method === "GET") {
    return handleSessionStatus(env, statusMatch[1]);
  }

  const endMatch = pathname.match(/^\/admin\/sessions\/([^/]+)\/end$/);
  if (endMatch && method === "POST") {
    return handleEndSession(request, env, endMatch[1]);
  }

  const detailMatch = pathname.match(/^\/admin\/sessions\/([^/]+)$/);
  if (detailMatch && method === "GET") {
    return handleSessionDetailPage(env, url.origin, detailMatch[1]);
  }

  return json({ error: "not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleFetch(request, env);
    } catch (err) {
      console.error("canlı çeviri isteği başarısız", err);
      const message = err instanceof Error ? err.message : String(err);
      // WebSocket upgrade istekleri HTML hata sayfasını kabul etmez -
      // bu durumda düz metin/JSON dönmek daha doğru.
      if (request.headers.get("Upgrade") === "websocket") {
        return json({ error: "internal_error", message }, 500);
      }
      return new Response(renderFatalErrorPage(message), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
