import { SECTORS, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

export interface ScanEnv {
  SEARCH_API_KEY?: string;
  /**
   * Brave Search API anahtarı - düz web araması (kanal: "brave_search")
   * için. Ayrı bir sağlayıcı olduğu için Places API anahtarından
   * bağımsız. Tanımlı değilse web araması atlanır, sadece Maps taranır.
   * https://api.search.brave.com
   */
  BRAVE_SEARCH_API_KEY?: string;
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

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
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
 * Brave Search API ile düz web araması - Maps'te olmayan sinyalleri
 * (forum/sosyal medya/haber gibi kaynaklarda "yeni şirket açıldı",
 * "web sitesi yaptırmak istiyorum" gibi ifadeler) yakalamak için.
 * (Kanal: "brave_search")
 * https://api-dashboard.search.brave.com/app/documentation/web-search/get-started
 *
 * NOT: Google Custom Search API yerine Brave kullanılıyor - Google
 * tarafında hesabın Organization Policy kısıtlaması nedeniyle Custom
 * Search API'ye erişim sürekli 403 ile reddediliyordu (bkz. CLAUDE.md).
 * Brave'in ücretsiz katmanı (aylık 2.000 sorgu) bizim kullanımımız
 * için yeterli ve bu sorunu yaşamıyor.
 */
async function searchBraveWeb(
  query: string,
  apiKey: string,
): Promise<{ data: BraveSearchResponse; apiError?: string }> {
  const params = new URLSearchParams({
    q: query,
    country: "tr",
    search_lang: "tr",
    count: "10",
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Brave Search API hatası", res.status, text);
    return {
      data: {},
      apiError: `status=${res.status} bodyLen=${text.length} body=${text.slice(0, 300)}`,
    };
  }

  return { data: (await res.json()) as BraveSearchResponse };
}

/**
 * Basit "eski site" sinyali: sayfa kaynağında mobil uyum (viewport) meta
 * etiketi yoksa, muhtemelen responsive olmayan/eski bir site - yenileme
 * teklifi için aday sayılır.
 *
 * TODO: daha güvenilir sinyaller eklenebilir (SSL yok, çok eski bir CMS
 * imzası, son güncelleme tarihi çok eski vb.) - bu ilk, basit bir sürüm.
 */
async function looksOutdated(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const html = await res.text();
    return !/<meta[^>]+name=["']viewport["']/i.test(html);
  } catch {
    // Siteye erişilemiyorsa (zaman aşımı, sertifika hatası vb.) karar
    // veremeyiz - güvenli tarafta kalıp aday olarak işaretlemiyoruz.
    return false;
  }
}

export interface ScanDebugInfo {
  sectorLabel: string;
  query: string;
  placesReturned: number;
  apiError?: string;
  apiKeyLength: number;
  webSearchEnabled: boolean;
  webQuery?: string;
  webResultsReturned?: number;
  webApiError?: string;
}

/** "google_maps" kanalı: Places API sonuçlarını ScanResult'a çevirir. */
async function collectMapsResults(
  sector: (typeof SECTORS)[number],
  apiKey: string,
): Promise<{ results: ScanResult[]; placesReturned: number; apiError?: string }> {
  const query = `${sector.labelTr} Türkiye`;
  const { data, apiError } = await searchPlaces(query, apiKey);
  const places = data.places ?? [];
  const results: ScanResult[] = [];

  for (const place of places) {
    const name = place.displayName?.text;
    if (!name) continue;

    let needTags: NeedTag[];
    if (!place.websiteUri) {
      needTags = ["website_new"];
    } else {
      const outdated = await looksOutdated(place.websiteUri);
      if (!outdated) continue; // sağlıklı bir sitesi var, hedef değil
      needTags = ["website_redesign"];
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
      contactPhone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
      rawMetadata: { placeId: place.id, formattedAddress: place.formattedAddress },
    });
  }

  return { results, placesReturned: places.length, apiError };
}

/** "brave_search" kanalı: düz web araması sonuçlarını ScanResult'a çevirir. */
async function collectWebSearchResults(
  sector: (typeof SECTORS)[number],
  apiKey: string,
): Promise<{ results: ScanResult[]; query: string; returned: number; apiError?: string }> {
  const query = `"${sector.labelTr}" ("yeni açıldı" OR "web sitesi yaptırmak istiyorum" OR "sitemizi yenilemek istiyoruz")`;
  const { data, apiError } = await searchBraveWeb(query, apiKey);
  const items = data.web?.results ?? [];
  const results: ScanResult[] = [];

  for (const item of items) {
    if (!item.title || !item.url) continue;
    results.push({
      name: item.title,
      sectorSlug: sector.slug,
      sourceChannel: "brave_search",
      sourceUrl: item.url,
      // Web aramasından gelen bir sonuç için en güvenli varsayım "web
      // sitesi ihtiyacı" sinyali - gerçek ihtiyaç türü sayfa/açıklama
      // okunmadan kesinleştirilemez, bu ilk basit sürüm.
      needTags: ["website_new"],
      rawMetadata: { description: item.description },
    });
  }

  return { results, query, returned: items.length, apiError };
}

export async function scanNextSector(
  cursorSectorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug: ScanDebugInfo }> {
  const sector = SECTORS[cursorSectorIndex % SECTORS.length];
  const nextCursorIndex = (cursorSectorIndex + 1) % SECTORS.length;

  if (!env.SEARCH_API_KEY) {
    console.warn(
      `SEARCH_API_KEY tanımlı değil - "${sector.labelTr}" sektörü için gerçek tarama atlandı.`,
    );
    return {
      results: [],
      nextCursorIndex,
      debug: {
        sectorLabel: sector.labelTr,
        query: `${sector.labelTr} Türkiye`,
        placesReturned: 0,
        apiError: "SEARCH_API_KEY tanımlı değil",
        apiKeyLength: 0,
        webSearchEnabled: false,
      },
    };
  }

  const maps = await collectMapsResults(sector, env.SEARCH_API_KEY);
  const results = [...maps.results];

  const debug: ScanDebugInfo = {
    sectorLabel: sector.labelTr,
    query: `${sector.labelTr} Türkiye`,
    placesReturned: maps.placesReturned,
    apiError: maps.apiError,
    apiKeyLength: env.SEARCH_API_KEY.length,
    webSearchEnabled: Boolean(env.BRAVE_SEARCH_API_KEY),
  };

  if (env.BRAVE_SEARCH_API_KEY) {
    const web = await collectWebSearchResults(sector, env.BRAVE_SEARCH_API_KEY);
    results.push(...web.results);
    debug.webQuery = web.query;
    debug.webResultsReturned = web.returned;
    debug.webApiError = web.apiError;
  } else {
    console.warn(
      `BRAVE_SEARCH_API_KEY tanımlı değil - "${sector.labelTr}" için düz web araması (brave_search) atlandı, sadece Maps tarandı.`,
    );
  }

  return { results, nextCursorIndex, debug };
}
