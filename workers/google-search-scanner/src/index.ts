import { SECTORS, CITIES } from "@musteri-avcisi/shared";
import { scanNextSector, diagnoseCustomSearch, type ScanDebugInfo } from "./scan";

/** scanNextSector'daki sektör × şehir matrisiyle AYNI hesap - ilerleme raporlaması için (bkz. runScan). */
const MATRIX_SIZE = SECTORS.length * CITIES.length;

export interface Env {
  SCAN_STATE: KVNamespace;
  CONTROL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_ENGINE_ID?: string;
}

interface ScanDiagnostics {
  sectorIndex: number;
  found: number;
  posted: boolean;
  postStatus?: number;
  postError?: string;
  scan: ScanDebugInfo;
}

/**
 * `?secret=` query param'ını SCAN_SHARED_SECRET ile karşılaştırır.
 * NOT: sadece `provided !== expected` yeterli DEĞİL - SCAN_SHARED_SECRET
 * henüz bu worker'a secret olarak set edilmemişse (env değeri undefined,
 * `?? ""` ile expected="" olur) ve istek `?secret=` parametresini hiç
 * içermiyorsa (provided de "" olur), "" !== "" => false döner ve istek
 * YANLIŞLIKLA yetkili sayılır. Secret'ın gerçekten DOLU olması ayrıca
 * kontrol edilmeli.
 */
function checkScanSecret(url: URL, env: Env): boolean {
  const provided = url.searchParams.get("secret")?.trim() ?? "";
  const expected = env.SCAN_SHARED_SECRET?.trim() ?? "";
  return Boolean(expected) && provided === expected;
}

const CURSOR_KEY = "sector-cursor-index";
const FAIL_COUNT_KEY = "consecutive-failures";
const ALERT_SENT_KEY = "alert-sent";
/** Bu kadar art arda başarısız taramadan sonra sahibine uyarı e-postası gider (~1.5 saat, 30dk cron ile). */
const ALERT_THRESHOLD = 3;

async function sendAlert(env: Env, message: string): Promise<void> {
  try {
    await env.CONTROL_WORKER.fetch("https://internal/alerts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scan-secret": env.SCAN_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({ source: "google-search-scanner", message }),
    });
  } catch (err) {
    console.error("uyarı gönderilemedi", err);
  }
}

/**
 * Places API (google_maps kanalı - tek gerçek aktif kaynak) art arda
 * hata verirse sahibi fark etmeden sistemin sessizce boş dönmeye devam
 * etmesini önlemek için: ALERT_THRESHOLD'a ulaşınca BİR KEZ uyarı
 * e-postası gönderir (spam yapmaz), sorun düzelince de "tekrar normal"
 * bildirimi atar.
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
        `Google Places API art arda ${nextFailCount} kez hata verdi. Son hata: ${apiError}`,
      );
      await env.SCAN_STATE.put(ALERT_SENT_KEY, "1");
    }
    return;
  }

  // Başarılı - sayaç sıfırlanır. Daha önce uyarı gönderilmişse "düzeldi" bildirimi at.
  if (alertSent) {
    await sendAlert(env, `Google Places API tekrar normal çalışıyor (${failCount} başarısız denemenin ardından).`);
  }
  await env.SCAN_STATE.put(FAIL_COUNT_KEY, "0");
  await env.SCAN_STATE.put(ALERT_SENT_KEY, "0");
}

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

  // Dashboard'daki Rapor sayfasının "tur nerede kaldı" göstergesi için -
  // en iyi çaba (best-effort): başarısız olursa taramayı engellemez,
  // sadece loglanır.
  try {
    await env.CONTROL_WORKER.fetch("https://internal/scan-progress", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scan-secret": env.SCAN_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({
        trackSlug: "google_maps_city_matrix",
        sourceChannel: "google_maps",
        cursorIndex: nextCursorIndex,
        total: MATRIX_SIZE,
      }),
    });
  } catch (err) {
    console.error("tarama ilerlemesi raporlanamadı", err);
  }

  // SEARCH_API_KEY hiç tanımlı değilse (henüz kurulmamış worker) uyarı
  // spam'i olmasın diye alarm mekanizmasını atlıyoruz - bu "arıza" değil,
  // henüz aktifleştirilmemiş bir kanal.
  if (env.SEARCH_API_KEY) {
    await trackFailuresAndAlert(env, debug.apiError);
  }
  return diagnostics;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manuel test için: cron'un 30 dakikayı beklemeden taramayı hemen
    // tetikler. SCAN_SHARED_SECRET ile korunuyor (rastgele biri API
    // kotasını tüketemesin diye).
    if (url.pathname === "/run-now") {
      if (!checkScanSecret(url, env)) {
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

    // Sadece "google_search" (Custom Search JSON API) kanalını izole test
    // eder - /run-now'ın aksine sektör × şehir turunu (ve Places API
    // anahtarını) beklemeden, tek bir istekle sonuç döner. Google'ın 403
    // hatasını araştırırken hızlı, tekrarlanabilir bir teşhis için (bkz.
    // CLAUDE.md "Bilinen sorun").
    if (url.pathname === "/diagnose-search") {
      if (!checkScanSecret(url, env)) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      const diagnosis = await diagnoseCustomSearch(env);
      return new Response(JSON.stringify({ ranAt: new Date().toISOString(), diagnosis }, null, 2), {
        headers: { "content-type": "application/json" },
      });
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
