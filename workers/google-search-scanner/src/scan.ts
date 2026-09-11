import { SECTORS, CITIES, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

export interface ScanEnv {
  SEARCH_API_KEY?: string;
  /**
   * Custom Search API için ayrı, kendi anahtarı (önerilen - Places API
   * anahtarından bağımsız, sadece Custom Search API'ye kısıtlı).
   * Tanımlı değilse SEARCH_API_KEY'e geri döner (o da her iki API'ye
   * izinliyse çalışır).
   */
  GOOGLE_SEARCH_API_KEY?: string;
  /** Google Programmable Search Engine (Custom Search JSON API) kimliği - gizli değil, sadece bir kimlik. */
  GOOGLE_SEARCH_ENGINE_ID?: string;
}

interface PlacesSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
  }>;
}

interface WebSearchResponse {
  items?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
}

const RESULTS_PER_SECTOR = 15;
const WEBSITE_FETCH_TIMEOUT_MS = 5000;

/**
 * Google Places API (New) - Text Search ile bir sektördeki işletmeleri arar.
 * (Kanal: "google_maps")
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 */
async function searchPlaces(
  query: string,
  apiKey: string,
): Promise<{ data: PlacesSearchResponse; apiError?: string }> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "tr",
      regionCode: "TR",
      maxResultCount: RESULTS_PER_SECTOR,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "(yok)";
    console.error("Places API hatası", res.status, text);
    return {
      data: {},
      apiError: `status=${res.status} statusText=${res.statusText} content-type=${contentType} bodyLen=${text.length} body=${text}`,
    };
  }

  return { data: (await res.json()) as PlacesSearchResponse };
}

/**
 * Google Custom Search JSON API ile düz web araması - Maps'te olmayan
 * sinyalleri (forum/sosyal medya/haber gibi kaynaklarda "yeni şirket
 * açıldı", "web sitesi yaptırmak istiyorum" gibi ifadeler) yakalamak
 * için. (Kanal: "google_search")
 * https://developers.google.com/custom-search/v1/overview
 *
 * NOT: Bu, Places API'den AYRI bir API - aynı SEARCH_API_KEY kullanılsa
 * bile Google Cloud Console'da "Custom Search API" ayrıca enable
 * edilmeli ve anahtarın API restriction listesine eklenmeli. Ayrıca
 * programmablesearchengine.google.com üzerinden bir arama motoru (cx)
 * oluşturulup "Search the entire web" açılmalı.
 */
/**
 * Google'ın döndürdüğü standart hata gövdesi. "errors[].reason" ve
 * özellikle "errors[].extendedHelp" asıl teşhis sinyalini taşıyor:
 * "accessNotConfigured" gibi bir reason'da extendedHelp linki genelde
 * `...customsearch.googleapis.com/overview?project=<PROJECT_NUMBER>`
 * şeklinde, anahtarın Google tarafında GERÇEKTE hangi proje numarasına
 * bağlı olduğunu gösteriyor - "proje/anahtar eşleşmesi" şüphesini kesin
 * olarak doğrulamak/elemek için en güvenilir tek sinyal bu.
 */
interface GoogleApiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ message?: string; domain?: string; reason?: string; extendedHelp?: string }>;
  };
}

export interface WebSearchApiError {
  /** İnsan tarafından okunması kolay, tek satırlık özet - loglarda/uyarı e-postasında kullanılır. */
  summary: string;
  httpStatus: number;
  /** Google'ın ham gövdesi, HİÇ KESİLMEDEN - bilinmeyen/yeni bir hata şekli çıkarsa kaybolmasın diye. */
  rawBody: string;
  /** Gövde JSON olarak ayrıştırılabildiyse çıkarılan alanlar (bkz. GoogleApiErrorBody). */
  status?: string;
  reason?: string;
  domain?: string;
  message?: string;
  /** Genelde gerçek proje numarasını içeren yardım linki - bkz. üstteki not. */
  extendedHelp?: string;
}

async function searchGoogleWeb(
  query: string,
  apiKey: string,
  searchEngineId: string,
): Promise<{ data: WebSearchResponse; apiError?: WebSearchApiError }> {
  const params = new URLSearchParams({
    key: apiKey,
    cx: searchEngineId,
    q: query,
    num: "10",
    gl: "tr",
    hl: "tr",
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    console.error("Custom Search API hatası", res.status, text);

    const apiError: WebSearchApiError = {
      summary: `status=${res.status} bodyLen=${text.length}`,
      httpStatus: res.status,
      rawBody: text,
    };
    try {
      const parsed = JSON.parse(text) as GoogleApiErrorBody;
      const firstError = parsed.error?.errors?.[0];
      apiError.status = parsed.error?.status;
      apiError.message = parsed.error?.message;
      apiError.reason = firstError?.reason;
      apiError.domain = firstError?.domain;
      apiError.extendedHelp = firstError?.extendedHelp;
      apiError.summary = [
        `status=${res.status}`,
        parsed.error?.status ? `googleStatus=${parsed.error.status}` : null,
        firstError?.reason ? `reason=${firstError.reason}` : null,
        parsed.error?.message ? `message="${parsed.error.message}"` : null,
        firstError?.extendedHelp ? `extendedHelp=${firstError.extendedHelp}` : null,
      ]
        .filter(Boolean)
        .join(" ");
    } catch {
      // Gövde JSON değil (ör. HTML hata sayfası) - rawBody zaten tam halde döndü, o yeterli.
    }

    return { data: {}, apiError };
  }

  return { data: (await res.json()) as WebSearchResponse };
}

/**
 * Sitenin ana sayfasını çeker. Hata/zaman aşımı durumunda null döner -
 * çağıran taraf bunu "karar veremeyiz, güvenli tarafta kal" olarak
 * yorumlamalı.
 */
async function fetchSiteHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Basit "eski site" sinyali: sayfa kaynağında mobil uyum (viewport) meta
 * etiketi yoksa, muhtemelen responsive olmayan/eski bir site - yenileme
 * teklifi için aday sayılır.
 *
 * TODO: daha güvenilir sinyaller eklenebilir (SSL yok, çok eski bir CMS
 * imzası, son güncelleme tarihi çok eski vb.) - bu ilk, basit bir sürüm.
 */
function looksOutdated(html: string): boolean {
  return !/<meta[^>]+name=["']viewport["']/i.test(html);
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
/** "info@", "iletisim@" gibi genel adresler, kişi adı içeren adreslerden
 * daha güvenilir bir iletişim noktası - varsa öncelik bunlara verilir. */
const GENERIC_EMAIL_PREFIXES = ["info", "iletisim", "contact", "destek", "merhaba", "hello"];

/**
 * Sitenin HTML kaynağından basit bir regex ile e-posta adresi çıkarır
 * (kanal: "google_maps", need tag "website_redesign" olan adaylar için -
 * eski sitesi olan ama Places API'nin e-posta vermediği işletmelerde bu,
 * teklifi doğrudan e-postayla göndermeyi mümkün kılıyor).
 *
 * TODO: sadece ana sayfa taranıyor - "/iletisim", "/contact" gibi alt
 * sayfalar taranmıyor, bu ilk basit sürüm.
 */
function extractEmail(html: string): string | null {
  const matches = html.match(EMAIL_REGEX);
  if (!matches) return null;

  const candidates = matches
    .map((m) => m.toLowerCase())
    // Görsel dosya adlarında ("logo@2x.png" gibi) yanlışlıkla e-posta
    // sanılabilecek eşleşmeleri ele
    .filter((m) => !/\.(png|jpe?g|gif|svg|webp|css|js)$/.test(m));
  if (candidates.length === 0) return null;

  const generic = candidates.find((m) =>
    GENERIC_EMAIL_PREFIXES.some((p) => m.startsWith(`${p}@`)),
  );
  return generic ?? candidates[0];
}

export interface ScanDebugInfo {
  sectorLabel: string;
  cityLabel: string;
  query: string;
  placesReturned: number;
  apiError?: string;
  apiKeyLength: number;
  webSearchEnabled: boolean;
  webQuery?: string;
  webResultsReturned?: number;
  webApiError?: WebSearchApiError;
  /** GOOGLE_SEARCH_API_KEY (veya yoksa SEARCH_API_KEY) uzunluğu - secret
   * yapıştırma sırasında bozulmayı tespit etmek için (bu projede daha
   * önce iki kez yaşandı, bkz. CLAUDE.md "Bilinen risk"). Gerçek bir
   * Google API anahtarı normalde 39 karakter ve "AIza" ile başlar. */
  webApiKeyLength?: number;
  webApiKeyPrefix?: string;
}

/**
 * "google_maps" kanalı: Places API sonuçlarını ScanResult'a çevirir.
 *
 * Sorgu "{sektör} {şehir}" şeklinde - taramanın tamamı 81 ilin hepsini
 * kapsıyor (bkz. scanNextSector'daki sektör × şehir matrisi). Bu, "sadece
 * Türkiye" yerine daha isabetli/yerel sonuçlar getiriyor.
 */
async function collectMapsResults(
  sector: (typeof SECTORS)[number],
  city: (typeof CITIES)[number],
  apiKey: string,
): Promise<{ results: ScanResult[]; placesReturned: number; apiError?: string }> {
  const query = `${sector.labelTr} ${city.labelTr}`;
  const { data, apiError } = await searchPlaces(query, apiKey);
  const places = data.places ?? [];
  const results: ScanResult[] = [];

  for (const place of places) {
    const name = place.displayName?.text;
    if (!name) continue;

    let needTags: NeedTag[];
    let contactEmail: string | null = null;
    if (!place.websiteUri) {
      needTags = ["website_new"];
    } else {
      const html = await fetchSiteHtml(place.websiteUri);
      if (!html) continue; // siteye erişilemedi, karar veremeyiz
      if (!looksOutdated(html)) continue; // sağlıklı bir sitesi var, hedef değil
      needTags = ["website_redesign"];
      // Aynı fetch'in sonucundan e-posta da çıkarıyoruz - ekstra istek yok.
      // Places API e-posta vermiyor, bu yüzden e-posta ile gönderim
      // (dashboard'daki mailto: linki) sadece eski sitesi taranan
      // adaylarda mümkün oluyor.
      contactEmail = extractEmail(html);
    }

    results.push({
      name,
      sectorSlug: sector.slug,
      sourceChannel: "google_maps",
      sourceUrl:
        place.websiteUri ??
        (place.formattedAddress
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${name} ${place.formattedAddress}`,
            )}`
          : null),
      needTags,
      contactEmail,
      contactPhone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
      rawMetadata: {
        placeId: place.id,
        formattedAddress: place.formattedAddress,
        citySlug: city.slug,
        cityLabel: city.labelTr,
      },
    });
  }

  return { results, placesReturned: places.length, apiError };
}

/** "google_search" kanalı: düz web araması sonuçlarını ScanResult'a çevirir. */
async function collectWebSearchResults(
  sector: (typeof SECTORS)[number],
  apiKey: string,
  searchEngineId: string,
): Promise<{ results: ScanResult[]; query: string; returned: number; apiError?: WebSearchApiError }> {
  const query = `"${sector.labelTr}" ("yeni açıldı" OR "web sitesi yaptırmak istiyorum" OR "sitemizi yenilemek istiyoruz")`;
  const { data, apiError } = await searchGoogleWeb(query, apiKey, searchEngineId);
  const items = data.items ?? [];
  const results: ScanResult[] = [];

  for (const item of items) {
    if (!item.title || !item.link) continue;
    results.push({
      name: item.title,
      sectorSlug: sector.slug,
      sourceChannel: "google_search",
      sourceUrl: item.link,
      // Web aramasından gelen bir sonuç için en güvenli varsayım "web
      // sitesi ihtiyacı" sinyali - gerçek ihtiyaç türü sayfa/snippet
      // okunmadan kesinleştirilemez, bu ilk basit sürüm.
      needTags: ["website_new"],
      rawMetadata: { snippet: item.snippet },
    });
  }

  return { results, query, returned: items.length, apiError };
}

/**
 * Sektör × şehir matrisinde ilerler: cursor tüm (sektör, şehir) çiftlerini
 * sırayla dolaşır (önce bir sektörün tüm şehirleri, sonra sıradaki sektöre
 * geçer). Matris boyutu SECTORS.length * CITIES.length - tam bir tur uzun
 * sürer ama bu bilinen/kabul edilmiş bir durum (bkz. CLAUDE.md).
 */
export async function scanNextSector(
  cursorSectorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug: ScanDebugInfo }> {
  const matrixSize = SECTORS.length * CITIES.length;
  const cursor = cursorSectorIndex % matrixSize;
  const sector = SECTORS[cursor % SECTORS.length];
  const city = CITIES[Math.floor(cursor / SECTORS.length) % CITIES.length];
  const nextCursorIndex = (cursor + 1) % matrixSize;
  const query = `${sector.labelTr} ${city.labelTr}`;

  if (!env.SEARCH_API_KEY) {
    console.warn(
      `SEARCH_API_KEY tanımlı değil - "${sector.labelTr}" / "${city.labelTr}" için gerçek tarama atlandı.`,
    );
    return {
      results: [],
      nextCursorIndex,
      debug: {
        sectorLabel: sector.labelTr,
        cityLabel: city.labelTr,
        query,
        placesReturned: 0,
        apiError: "SEARCH_API_KEY tanımlı değil",
        apiKeyLength: 0,
        webSearchEnabled: false,
      },
    };
  }

  const maps = await collectMapsResults(sector, city, env.SEARCH_API_KEY);
  const results = [...maps.results];

  const debug: ScanDebugInfo = {
    sectorLabel: sector.labelTr,
    cityLabel: city.labelTr,
    query,
    placesReturned: maps.placesReturned,
    apiError: maps.apiError,
    apiKeyLength: env.SEARCH_API_KEY.length,
    webSearchEnabled: Boolean(env.GOOGLE_SEARCH_ENGINE_ID),
  };

  const webSearchApiKey = env.GOOGLE_SEARCH_API_KEY ?? env.SEARCH_API_KEY;
  debug.webApiKeyLength = webSearchApiKey.length;
  debug.webApiKeyPrefix = webSearchApiKey.slice(0, 4);
  if (env.GOOGLE_SEARCH_ENGINE_ID) {
    const web = await collectWebSearchResults(sector, webSearchApiKey, env.GOOGLE_SEARCH_ENGINE_ID);
    results.push(...web.results);
    debug.webQuery = web.query;
    debug.webResultsReturned = web.returned;
    debug.webApiError = web.apiError;
  } else {
    console.warn(
      `GOOGLE_SEARCH_ENGINE_ID tanımlı değil - "${sector.labelTr}" için düz Google araması (google_search) atlandı, sadece Maps tarandı.`,
    );
  }

  return { results, nextCursorIndex, debug };
}

export interface CustomSearchDiagnosis {
  configured: boolean;
  query?: string;
  apiKeyLength?: number;
  apiKeyPrefix?: string;
  apiKeySource?: "GOOGLE_SEARCH_API_KEY" | "SEARCH_API_KEY";
  searchEngineId?: string;
  resultsReturned?: number;
  ok?: boolean;
  error?: WebSearchApiError;
}

/**
 * `google_search` (Custom Search JSON API) kanalını, tam sektör × şehir
 * turunu beklemeden, TEK BAŞINA test eder. Places API'nin (SEARCH_API_KEY)
 * tanımlı olup olmamasından bağımsız çalışır - sadece Custom Search API'ye
 * özgü anahtar/motor kimliği yeterlidir. `/diagnose-search` endpoint'i
 * (bkz. index.ts) bunu çağırır.
 */
export async function diagnoseCustomSearch(env: ScanEnv): Promise<CustomSearchDiagnosis> {
  if (!env.GOOGLE_SEARCH_ENGINE_ID) {
    return { configured: false };
  }

  const apiKeySource = env.GOOGLE_SEARCH_API_KEY ? "GOOGLE_SEARCH_API_KEY" : "SEARCH_API_KEY";
  const apiKey = env.GOOGLE_SEARCH_API_KEY ?? env.SEARCH_API_KEY;
  if (!apiKey) {
    return { configured: false };
  }

  const query = "test";
  const { data, apiError } = await searchGoogleWeb(query, apiKey, env.GOOGLE_SEARCH_ENGINE_ID);

  return {
    configured: true,
    query,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.slice(0, 4),
    apiKeySource,
    searchEngineId: env.GOOGLE_SEARCH_ENGINE_ID,
    resultsReturned: data.items?.length ?? 0,
    ok: !apiError,
    error: apiError,
  };
}
