/**
 * Yahoo'nun resmi/ücretsiz bir arama API'si YOK (Yahoo BOSS yıllar önce
 * kapatıldı) - bu yüzden hem `workers/yahoo-search-scanner` (sektör
 * bazlı KEŞİF sorguları) hem `workers/google-search-scanner` (bulunan
 * bir firmanın adını arayıp hakkında bilgi toplayan ZENGİNLEŞTİRME
 * sorguları - bkz. CLAUDE.md "firma ismini yahooda arattırıp bilgi
 * toplayacak" notu) AYNI mantığı kullanıyor: search.yahoo.com'un
 * herkese açık arama sonuçları sayfası doğrudan `fetch()` ile çekilip
 * HTML'den regex ile ayıklanıyor. Kod tekrarı olmasın diye (DRY) bu
 * ortak pakete taşındı.
 *
 * CANLI TEST SONUCU (bkz. CLAUDE.md): Yahoo, otomatik/çerezsiz
 * istekleri SORGUYA BAKMAKSIZIN sistematik olarak bir doğrulama
 * döngüsüne (`_bv/v.gif` beacon) sokup engelliyor - iki farklı sektör
 * sorgusunda BİREBİR AYNI hata (`Too many redirects`) görüldü. Sahibi
 * bunu bilerek YİNE DE denemeye devam etmeyi seçti (firma adıyla arama
 * farklı davranabilir ihtimaline karşı) - ama başarı ihtimali ÇOK
 * DÜŞÜK olarak kabul edildi. Başarısız olursa `apiError` ile net bir
 * şekilde raporlanır, hiçbir zaman fırlatmaz/akışı durdurmaz.
 */

const YAHOO_FETCH_TIMEOUT_MS = 8000;
/** Yahoo'yu gerçek bir tarayıcı gibi göstermeye çalışan User-Agent. */
const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface YahooSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface YahooSearchOutcome {
  results: YahooSearchResult[];
  apiError?: string;
  /** Parser hiç sonuç bulamazsa (büyük ihtimalle bot duvarı) ham HTML'in bir kısmı - teşhis için. */
  rawSample?: string;
}

/**
 * Yahoo'nun klasik yönlendirme linkinden (`.../RU=<url-encoded-hedef>/...`
 * biçiminde - iyi bilinen, uzun süredir değişmemiş bir Yahoo deseni)
 * gerçek hedef URL'i çıkarır. Bulamazsa href'i olduğu gibi döner.
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
 * GARANTİ YOK: Yahoo işaretlemeyi (markup) istediği an değiştirebilir.
 */
export function parseYahooResults(html: string): YahooSearchResult[] {
  const results: YahooSearchResult[] = [];
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
 * Başarısız olursa (bot duvarı/timeout/HTTP hatası) hiçbir zaman
 * fırlatmaz - `apiError` ile raporlar, çağıran taraf akışı durdurmaz.
 */
export async function searchYahoo(query: string): Promise<YahooSearchOutcome> {
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
