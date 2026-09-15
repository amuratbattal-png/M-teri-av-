import { fetchSettingsOverrides } from "@musteri-avcisi/shared";
import { scanNewCompanies } from "./scan";

export interface Env {
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  TRADE_REGISTRY_API_KEY?: string;
}

/** Panelden (Ayarlar) girilmiş bir anahtar varsa worker'ın kendi env'ini onunla ezer. */
async function withSettingOverrides(env: Env): Promise<Env> {
  const overrides = await fetchSettingsOverrides(env.CONTROL_WORKER, env.SCAN_SHARED_SECRET);
  return {
    ...env,
    TRADE_REGISTRY_API_KEY: overrides.trade_registry_api_key || env.TRADE_REGISTRY_API_KEY,
  };
}

async function runScan(rawEnv: Env): Promise<void> {
  const env = await withSettingOverrides(rawEnv);
  const results = await scanNewCompanies(env);
  if (results.length === 0) return;

  const res = await env.CONTROL_WORKER.fetch("https://internal/scan-results", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-scan-secret": env.SCAN_SHARED_SECRET?.trim() ?? "",
    },
    body: JSON.stringify({ results }),
  });
  if (!res.ok) {
    console.error("control API'ye sonuç gönderilemedi", res.status, await res.text());
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ ok: true, service: "musteri-avcisi-company-formation-tracker" }),
      { headers: { "content-type": "application/json" } },
    );
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
