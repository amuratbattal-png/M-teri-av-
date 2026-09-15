import { fetchSettingsOverrides } from "@musteri-avcisi/shared";
import { scanNextKeyword, type ScanDebugInfo } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  LINKEDIN_SESSION_COOKIE?: string;
  LINKEDIN_CSRF_TOKEN?: string;
}

interface ScanDiagnostics {
  keywordIndex: number;
  found: number;
  posted: boolean;
  postStatus?: number;
  postError?: string;
  scan?: ScanDebugInfo;
}

const CURSOR_KEY = "keyword-cursor-index";
const FAIL_COUNT_KEY = "consecutive-failures";
const ALERT_SENT_KEY = "alert-sent";
/** Bu kadar art arda başarısız taramadan sonra sahibine uyarı e-postası gider (google-search-scanner ile aynı desen). */
const ALERT_THRESHOLD = 3;

/** Panelden (Ayarlar) girilmiş bir değer varsa worker'ın kendi env'ini onunla ezer. */
async function withSettingOverrides(env: Env): Promise<Env> {
  const overrides = await fetchSettingsOverrides(env.CONTROL_WORKER, env.SCAN_SHARED_SECRET);
  return {
    ...env,
    LINKEDIN_SESSION_COOKIE: overrides.linkedin_session_cookie || env.LINKEDIN_SESSION_COOKIE,
    LINKEDIN_CSRF_TOKEN: overrides.linkedin_csrf_token || env.LINKEDIN_CSRF_TOKEN,
  };
}

async function sendAlert(env: Env, message: string): Promise<void> {
  try {
    await env.CONTROL_WORKER.fetch("https://internal/alerts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scan-secret": env.SCAN_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({ source: "linkedin-scanner", message }),
    });
  } catch (err) {
    console.error("uyarı gönderilemedi", err);
  }
}

/**
 * LinkedIn'in dokümante edilmemiş iç API'si art arda hata verirse (ör.
 * çerez süresi doldu, LinkedIn şekli değiştirdi) sahibi fark etmeden
 * sistemin sessizce boş dönmeye devam etmesini önlemek için - bkz.
 * google-search-scanner/src/index.ts aynı desen.
 */
async function trackFailuresAndAlert(env: Env, apiError: string | undefined): Promise<void> {
  const failCountRaw = await env.SCAN_STATE.get(FAIL_COUNT_KEY);
  const failCount = failCountRaw ? Number.parseInt(failCountRaw, 10) : 0;
  const alertSent = (await env.SCAN_STATE.get(ALERT_SENT_KEY)) === "1";

  if (apiError) {
    const nextFailCount = failCount + 1;
    await env.SCAN_STATE.put(FAIL_COUNT_KEY, String(nextFailCount));
    if (nextFailCount >= ALERT_THRESHOLD && !alertSent) {
      await sendAlert(
        env,
        `LinkedIn araması art arda ${nextFailCount} kez hata verdi (muhtemelen çerez süresi doldu ya da LinkedIn API şeklini değiştirdi). Son hata: ${apiError}`,
      );
      await env.SCAN_STATE.put(ALERT_SENT_KEY, "1");
    }
    return;
  }

  if (alertSent) {
    await sendAlert(env, `LinkedIn araması tekrar normal çalışıyor (${failCount} başarısız denemenin ardından).`);
  }
  await env.SCAN_STATE.put(FAIL_COUNT_KEY, "0");
  await env.SCAN_STATE.put(ALERT_SENT_KEY, "0");
}

async function runScan(rawEnv: Env): Promise<ScanDiagnostics> {
  const env = await withSettingOverrides(rawEnv);
  const cursorRaw = await env.SCAN_STATE.get(CURSOR_KEY);
  const cursorIndex = cursorRaw ? Number.parseInt(cursorRaw, 10) : 0;

  const { results, nextCursorIndex, debug } = await scanNextKeyword(cursorIndex, env);

  const diagnostics: ScanDiagnostics = {
    keywordIndex: cursorIndex,
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
  // Çerez hiç tanımlı değilse (henüz kurulmamış worker) uyarı spam'i
  // olmasın diye alarm mekanizmasını atlıyoruz - bu "arıza" değil, henüz
  // aktifleştirilmemiş bir kanal.
  if (env.LINKEDIN_SESSION_COOKIE) {
    await trackFailuresAndAlert(env, debug?.apiError);
  }
  return diagnostics;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manuel test için: cron'un 30 dakikayı beklemeden taramayı hemen
    // tetikler - çerezi girdikten sonra sonucu hemen görmek için.
    // SCAN_SHARED_SECRET ile korunuyor.
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

    return new Response(JSON.stringify({ ok: true, service: "musteri-avcisi-linkedin-scanner" }), {
      headers: { "content-type": "application/json" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
