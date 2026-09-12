import { SECTORS, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

/**
 * Yahoo'nun resmi/ücretsiz bir arama API'si YOK - eskiden "Yahoo BOSS"
 * (Build your Own Search Service) vardı, yıllar önce kapatıldı. Bu
 * yüzden bu kanal artık bir API ANAHTARI GEREKTİRMİYOR - bkz. CLAUDE.md
 * "Yahoo kazıma" notu, sahibiyle netleştirildi: Google Custom Search'ün
 * hâlâ bozuk olması (403, ertelenmiş) ve NVIDIA'nın bir arama motoru
 * API'si olmaması üzerine, LinkedIn'deki (Voyager iç API'si) ve
 * Instagram/Facebook/TikTok'taki (OG etiket kazıma) ile AYNI "riskli/
 * kırılgan ama ücretsiz" ilkesiyle ilerlendi: search.yahoo.com'un
 * herkese açık arama sonuçları sayfası doğrudan fetch() ile çekilip
 * HTML'den regex ile ayıklanıyor.
 */
export interface ScanEnv {
  // Kasıtlı olarak boş - artık bir kimlik bilgisi/anahtar gerekmiyor.
  // (Eski YAHOO_SEARCH_API_KEY hâlâ Ayarlar katalogda duruyor ama
  // kullanılmıyor - bkz. apps/control/src/lib/settings-catalog.ts.)
}

const YAHOO_FETCH_TIMEOUT_MS = 8000;
/** Yahoo'yu gerçek bir tarayıcı gibi göstermeye çalışan User-Agent - bkz. google-search-scanner extractSocialLinks/fetchSocialSnippet ile aynı ilke. */
const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface ScanDebugInfo {
  sectorLabel: string;
  query: string;
  resultsFound: number;
  apiError?: string;
  /**
   * Parser hiç sonuç bulamazsa ham HTML'in bir kısmı - LinkedIn Voyager
   * entegrasyonunda olduğu gibi (bkz. CLAUDE.md) canlı test + iterasyon
   * için gerekli. Bu sandbox'ın Yahoo'ya ağ erişimi olmadığından, aşağıdaki
   * `parseYahooResults` GERÇEK bir yanıtla hiç test edilmedi - ilk canlı
   * denemede `rawSample` muhtemelen ayarlanması gereken ilk yer olacak.
   */
  rawSample?: string;
}

interface YahooResult {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Yahoo'nun klasik yönlendirme linkinden (`.../RU=<url-encoded-hedef>/...`
 * biçiminde - iyi bilinen, uzun süredir değişmemiş bir Yahoo deseni)
 * gerçek hedef URL'i çıkarır. Bulamazsa href'i olduğu gibi döner (bazı
 * sonuçlar doğrudan harici linkler olabilir, yönlendirme olmadan).
 */
function extractYahooRedirectTarget(href: string): string {
  const match = href.match(/\/RU=([^/]+)\//);
  if (!match) return href;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return href;
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * search.yahoo.com'un HTML kaynağından sonuçları ayıklar. Yahoo'nun
 * sonuç kutuları geleneksel olarak `class="algo"` ile işaretleniyor -
 * her biri bir başlık linki (`<h3 class="title"><a href="...">`) + bir
 * özet (`<p class="fz-ms">` ya da benzer bir sınıf) içeriyor.
 *
 * GARANTİ YOK: Yahoo işaretlemeyi (markup) istediği an değiştirebilir,
 * bu regex'ler buna göre ayarlanmalı - `rawSample` bunun için var.
 */
function parseYahooResults(html: string): YahooResult[] {
  const results: YahooResult[] = [];

  // Her "algo" bloğunu bir sonrakine kadar (ya da sonuç listesinin
  // sonuna kadar) kabaca ayırıyoruz - gerçek bir HTML parser değil.
  const algoBlocks = html.split(/<div[^>]+class="[^"]*\balgo\b[^"]*"/i).slice(1);

  for (const block of algoBlocks) {
    const titleMatch = block.match(
      /<h3[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!titleMatch) continue;
    const href = titleMatch[1];
    const title = stripTags(titleMatch[2]);
    if (!title || !href) continue;

    const snippetMatch = block.match(/<p[^>]*class="[^"]*\bfz-ms\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]).slice(0, 300) : undefined;

    results.push({ title, url: extractYahooRedirectTarget(href), snippet: snippet || undefined });
    if (results.length >= 15) break; // aşırı büyük yanıtları işlemeyelim
  }

  return results;
}

/**
 * Yahoo'nun arama sonuçları sayfasını gerçek bir tarayıcı gibi çeker.
 * Başarısız olursa (bot duvarı/timeout/HTTP hatası) `fetchSiteHtml` ile
 * AYNI "karar veremeyiz, hatayı raporla" ilkesiyle boş sonuç + `apiError`
 * döner - hiçbir zaman fırlatmaz, çağıran taraf akışı durdurmaz.
 */
async function searchYahoo(
  query: string,
): Promise<{ results: YahooResult[]; apiError?: string; rawSample?: string }> {
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), YAHOO_FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_LIKE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { results: [], apiError: `status=${res.status} ${res.statusText}` };
    }

    const html = await res.text();
    const results = parseYahooResults(html);

    if (results.length === 0) {
      return { results: [], apiError: "parser hiç sonuç bulamadı", rawSample: html.slice(0, 2000) };
    }
    return { results };
  } catch (err) {
    return { results: [], apiError: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sektörler arasında sırayla ilerler - google-search-scanner'ın
 * "google_search" kanalıyla AYNI sorgu deseni ("yeni açıldı"/"web sitesi
 * yaptırmak istiyorum" gibi ifadeler). Sektör × şehir matrisi DEĞİL -
 * ilk basit sürüm (google_maps'teki 81 il kombinasyonuna şimdilik
 * genişletilmedi, istenirse sonra eklenebilir - önce temel kazımanın
 * gerçekten çalıştığı canlıda doğrulanmalı).
 */
export async function scanNextSector(
  cursorSectorIndex: number,
  _env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug: ScanDebugInfo }> {
  const sector = SECTORS[cursorSectorIndex % SECTORS.length];
  const nextCursorIndex = (cursorSectorIndex + 1) % SECTORS.length;
  const query = `"${sector.labelTr}" ("yeni açıldı" OR "web sitesi yaptırmak istiyorum" OR "sitemizi yenilemek istiyoruz")`;

  const { results: yahooResults, apiError, rawSample } = await searchYahoo(query);

  const results: ScanResult[] = yahooResults.map((r) => ({
    name: r.title,
    sectorSlug: sector.slug,
    sourceChannel: "yahoo_search",
    sourceUrl: r.url,
    // Arama sonucundan gelen bir sonuç için en güvenli varsayım "web
    // sitesi ihtiyacı" sinyali - google-search-scanner'ın "google_search"
    // kanalıyla aynı mantık, gerçek ihtiyaç türü içerik okunmadan
    // kesinleştirilemez.
    needTags: ["website_new"] as NeedTag[],
    rawMetadata: r.snippet ? { snippet: r.snippet } : undefined,
  }));

  return {
    results,
    nextCursorIndex,
    debug: { sectorLabel: sector.labelTr, query, resultsFound: results.length, apiError, rawSample },
  };
}
