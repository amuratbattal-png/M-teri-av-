import type { Candidate } from "@musteri-avcisi/shared";
import {
  renderApprovalsPage,
  renderAllCandidatesPage,
  renderApprovedPage,
  renderSentPage,
  type CommunicationRow,
} from "./render";

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

async function fetchStats(env: Env): Promise<Record<string, number>> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/stats");
  const { counts } = (await res.json()) as { counts: Record<string, number> };
  return counts;
}

async function fetchCandidates(env: Env, status?: string): Promise<Candidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await env.CONTROL_WORKER.fetch(`https://internal/candidates${qs}`);
  const { candidates } = (await res.json()) as { candidates: Candidate[] };
  return candidates;
}

async function fetchCommunications(env: Env): Promise<CommunicationRow[]> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/communications");
  const { communications } = (await res.json()) as { communications: CommunicationRow[] };
  return communications;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const unauthorized = requireAuth(request, env);
    if (unauthorized) return unauthorized;

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const [counts, pending] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "pending_approval"),
      ]);
      return new Response(renderApprovalsPage(counts, pending, sector, city), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/onaylananlar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const [counts, approved] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "approved"),
      ]);
      return new Response(renderApprovedPage(counts, approved, sector, city), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/adaylar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const [counts, all] = await Promise.all([fetchStats(env), fetchCandidates(env)]);
      return new Response(renderAllCandidatesPage(counts, all, sector, city), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/gonderilenler" && request.method === "GET") {
      const channel = url.searchParams.get("channel") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const [counts, communications] = await Promise.all([
        fetchStats(env),
        fetchCommunications(env),
      ]);
      return new Response(renderSentPage(counts, communications, channel, status), {
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
