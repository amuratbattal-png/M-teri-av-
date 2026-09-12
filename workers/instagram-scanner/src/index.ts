import { fetchSettingsOverrides } from "@musteri-avcisi/shared";
import { scanNextKeyword } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  INSTAGRAM_API_KEY?: string;
}

const CURSOR_KEY = "keyword-cursor-index";

/** Panelden (Ayarlar) girilmiş bir anahtar varsa worker'ın kendi env'ini onunla ezer. */
async function withSettingOverrides(env: Env): Promise<Env> {
  const overrides = await fetchSettingsOverrides(env.CONTROL_WORKER, env.SCAN_SHARED_SECRET);
  return {
    ...env,
    INSTAGRAM_API_KEY: overrides.instagram_api_key || env.INSTAGRAM_API_KEY,
  };
}

async function runScan(rawEnv: Env): Promise<void> {
  const env = await withSettingOverrides(rawEnv);
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
    return new Response(
      JSON.stringify({ ok: true, service: "musteri-avcisi-instagram-scanner" }),
      { headers: { "content-type": "application/json" } },
    );
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
