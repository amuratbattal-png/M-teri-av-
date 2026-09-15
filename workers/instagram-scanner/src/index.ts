import { fetchSettingsOverrides } from "@musteri-avcisi/shared";
import { scanNextKeyword, type ScanDebugInfo } from "./scan";

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  INSTAGRAM_SESSION_COOKIE?: string;
  INSTAGRAM_CSRF_TOKEN?: string;
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
/** Bu kadar art arda başarısız taramadan sonra sahibine uyarı e-postası gider (linkedin-scanner/google-search-scanner ile aynı desen). */
const ALERT_THRESHOLD = 3;

/** Panelden (Ayarlar) girilmiş bir değer varsa worker'ın kendi env'ini onunla ezer. */
async function withSettingOverrides(env: Env): Promise<Env> {
  const overrides = await fetchSettingsOverrides(env.CONTROL_WORKER, env.SCAN_SHARED_SECRET);
  return {
    ...env,
    INSTAGRAM_SESSION_COOKIE: overrides.instagram_session_cookie || env.INSTAGRAM_SESSION_COOKIE,
    INSTAGRAM_CSRF_TOKEN: overrides.instagram_csrf_token || env.INSTAGRAM_CSRF_TOKEN,
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
      body: JSON.stringify({ source: "instagram-scanner", message }),
    });
  } catch (err) {
    console.error("uyarı gönderilemedi", err);
  }
}

/**
 * Instagram'ın dokümante edilmemiş iç API'si art arda hata verirse (ör.
 * çerez süresi doldu, Instagram şekli değiştirdi, ya da hesap
 * kısıtlandı) sahibi fark etmeden sistemin sessizce boş dönmeye devam
 * etmesini önlemek için - bkz. linkedin-scanner/google-search-scanner
 * aynı desen.
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
        `Instagram araması art arda ${nextFailCount} kez hata verdi (muhtemelen çerez süresi doldu, Instagram API şeklini değiştirdi ya da hesap kısıtlandı - bkz. CLAUDE.md kabul edilen risk). Son hata: ${apiError}`,
      );
      await env.SCAN_STATE.put(ALERT_SENT_KEY, "1");
    }
    return;
  }

  if (alertSent) {
    await sendAlert(env, `Instagram araması tekrar normal çalışıyor (${failCount} başarısız denemenin ardından).`);
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
  if (env.INSTAGRAM_SESSION_COOKIE) {
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

    return new Response(JSON.stringify({ ok: true, service: "musteri-avcisi-instagram-scanner" }), {
      headers: { "content-type": "application/json" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScan(env);
  },
};
