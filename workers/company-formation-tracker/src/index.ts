import { scanNewCompanies } from "./scan";

export interface Env {
  CONTROL_API_URL: string;
  SCAN_SHARED_SECRET: string;
  TRADE_REGISTRY_API_KEY?: string;
}

async function runScan(env: Env): Promise<void> {
  const results = await scanNewCompanies(env);
  if (results.length === 0) return;

  const res = await fetch(`${env.CONTROL_API_URL}/scan-results`, {
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
