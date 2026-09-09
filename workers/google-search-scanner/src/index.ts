import { scanNextSector, type ScanDebugInfo } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  SEARCH_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
}

interface ScanDiagnostics {
  sectorIndex: number;
  found: number;
  posted: boolean;
  postStatus?: number;
  postError?: string;
  scan: ScanDebugInfo;
}

const CURSOR_KEY = "sector-cursor-index";

async function runScan(env: Env): Promise<ScanDiagnostics> {
  const cursorRaw = await env.SCAN_STATE.get(CURSOR_KEY);
  const cursorIndex = cursorRaw ? Number.parseInt(cursorRaw, 10) : 0;

  const { results, nextCursorIndex, debug } = await scanNextSector(cursorIndex, env);

  const diagnostics: ScanDiagnostics = {
    sectorIndex: cursorIndex,
    found: results.length,
    posted: false,
    scan: debug,
  };

  if (results.length > 0) {
    const res = await env.CONTROL_WORKER.fetch("https://internal/scan-results", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scan-secret": env.SCAN_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({ results }),
    });
    diagnostics.posted = res.ok;
    diagnostics.postStatus = res.status;
    if (!res.ok) {
      diagnostics.postError = await res.text();
      console.error("control API'ye sonuç gönderilemedi", res.status, diagnostics.postError);
    }
  }

  await env.SCAN_STATE.put(CURSOR_KEY, String(nextCursorIndex));
  return diagnostics;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manuel test için: cron'un 30 dakikayı beklemeden taramayı hemen
    // tetikler. SCAN_SHARED_SECRET ile korunuyor (rastgele biri API
    // kotasını tüketemesin diye).
    if (url.pathname === "/run-now") {
      const provided = url.searchParams.get("secret")?.trim() ?? "";
      const expected = env.SCAN_SHARED_SECRET?.trim() ?? "";
      if (provided !== expected) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      const diagnostics = await runScan(env);
      return new Response(
        JSON.stringify({ ok: true, ranAt: new Date().toISOString(), diagnostics }),
        { headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, service: "musteri-avcisi-google-search-scanner" }),
      { headers: { "content-type": "application/json" } },
    );
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
