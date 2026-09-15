import { WordPressClient, type WordPressSite } from "./wp-client";

export interface Env {
  WORDPRESS_AGENT_ENABLED: string; // "true" | "false"
  WORDPRESS_SITES_JSON?: string; // JSON: WordPressSite[]
}

interface ActionRequest {
  siteUrl: string;
  action: string;
  payload?: unknown;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "musteri-avcisi-wordpress-agent" });
    }

    if (url.pathname !== "/actions" || request.method !== "POST") {
      return json({ error: "not found" }, 404);
    }

    if (env.WORDPRESS_AGENT_ENABLED !== "true") {
      return json({ ok: false, reason: "wordpress_agent_disabled" }, 501);
    }

    if (!env.WORDPRESS_SITES_JSON) {
      return json({ ok: false, reason: "not_configured" }, 501);
    }

    const body = (await request.json()) as ActionRequest;
    const sites = JSON.parse(env.WORDPRESS_SITES_JSON) as WordPressSite[];
    const site = sites.find((s) => s.url === body.siteUrl);
    if (!site) return json({ error: "unknown siteUrl" }, 404);

    const client = new WordPressClient(site);

    // TODO: gerçek işlem yönlendirmesi. Şimdilik desteklenen işlem yok -
    // kapsam netleşince buraya action -> WordPressClient metodu eşlemesi
    // eklenecek.
    switch (body.action) {
      default:
        return json({ ok: false, reason: `unsupported action: ${body.action}` }, 400);
    }
  },
};
