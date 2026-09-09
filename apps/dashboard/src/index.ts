import type { Candidate } from "@musteri-avcisi/shared";
import { renderPage } from "./render";

export interface Env {
  CONTROL_WORKER: Fetcher;
  DASHBOARD_USERNAME: string;
  DASHBOARD_PASSWORD: string;
}

function requireAuth(request: Request, env: Env): Response | null {
  const header = request.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = atob(encoded).split(":");
      if (user === env.DASHBOARD_USERNAME && pass === env.DASHBOARD_PASSWORD) {
        return null;
      }
    }
  }
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="musteri-avcisi-dashboard"' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const unauthorized = requireAuth(request, env);
    if (unauthorized) return unauthorized;

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      const [statsRes, candidatesRes] = await Promise.all([
        env.CONTROL_WORKER.fetch("https://internal/stats"),
        env.CONTROL_WORKER.fetch("https://internal/candidates?status=pending_approval"),
      ]);
      const { counts } = (await statsRes.json()) as { counts: Record<string, number> };
      const { candidates } = (await candidatesRes.json()) as { candidates: Candidate[] };

      return new Response(renderPage(counts, candidates), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const approveMatch = url.pathname.match(/^\/approve\/([^/]+)$/);
    if (approveMatch && request.method === "POST") {
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${approveMatch[1]}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvedBy: env.DASHBOARD_USERNAME }),
      });
      return Response.redirect(url.origin + "/", 303);
    }

    const rejectMatch = url.pathname.match(/^\/reject\/([^/]+)$/);
    if (rejectMatch && request.method === "POST") {
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${rejectMatch[1]}/reject`, {
        method: "POST",
      });
      return Response.redirect(url.origin + "/", 303);
    }

    return new Response("not found", { status: 404 });
  },
};
