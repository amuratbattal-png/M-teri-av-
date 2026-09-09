import { scanNextSector } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_API_URL: string;
  SCAN_SHARED_SECRET: string;
  SEARCH_API_KEY?: string;
}

const CURSOR_KEY = "sector-cursor-index";

async function runScan(env: Env): Promise<void> {
  const cursorRaw = await env.SCAN_STATE.get(CURSOR_KEY);
  const cursorIndex = cursorRaw ? Number.parseInt(cursorRaw, 10) : 0;

  const { results, nextCursorIndex } = await scanNextSector(cursorIndex, env);

  if (results.length > 0) {
    const res = await fetch(`${env.CONTROL_API_URL}/scan-results`, {
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

  await env.SCAN_STATE.put(CURSOR_KEY, String(nextCursorIndex));
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
        // GEÇİCİ TEŞHİS: gerçek değerleri göstermeden sadece uzunlukları
        // dönüyor - sorunu bulunca bu blok kaldırılacak.
        return new Response(
          JSON.stringify({
            error: "unauthorized",
            debug: {
              providedLength: provided.length,
              expectedLength: expected.length,
              expectedIsSet: env.SCAN_SHARED_SECRET !== undefined,
            },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
      await runScan(env);
      return new Response(
        JSON.stringify({ ok: true, ranAt: new Date().toISOString() }),
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
