import { scanNextKeyword } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  LINKEDIN_SESSION_COOKIE?: string;
}

const CURSOR_KEY = "keyword-cursor-index";

async function runScan(env: Env): Promise<void> {
  const cursorRaw = await env.SCAN_STATE.get(CURSOR_KEY);
  const cursorIndex = cursorRaw ? Number.parseInt(cursorRaw, 10) : 0;

  const { results, nextCursorIndex } = await scanNextKeyword(cursorIndex, env);

  if (results.length > 0) {
    const res = await env.CONTROL_WORKER.fetch("https://internal/scan-results", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scan-secret": env.SCAN_SHARED_SECRET,
      },
      body: JSON.stringify({ results }),
    });
    if (!res.ok) {
      console.error("control API'ye sonuç gönderilemedi", res.status, await res.text());
    }
  }

  await env.SCAN_STATE.put(CURSOR_KEY, String(nextCursorIndex));
}

export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, service: "musteri-avcisi-linkedin-scanner" }), {
      headers: { "content-type": "application/json" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
