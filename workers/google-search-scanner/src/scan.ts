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
async function searchGoogleWeb(
  query: string,
  apiKey: string,
  searchEngineId: string,
): Promise<{ data: WebSearchResponse; apiError?: string }> {
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
    return {
      data: {},
      apiError: `status=${res.status} bodyLen=${text.length} body=${text.slice(0, 300)}`,
    };
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

/**
 * Sitenin HTML kaynağından ücretsiz, basit bir "içerik özeti" çıkarır -
 * <title> etiketi + <body>'nin görünür metninden kısa bir parça. Sahibinin
 * "firmayı google vs arasın verilere göre puan versin" isteğine, ayrı bir
 * ücretli/kırılgan arama API'si eklemeden (bkz. CLAUDE.md - o seçenek
 * maliyet/güvenilirlik nedeniyle reddedildi) karşılık veriyor: zaten
 * "eski site mi?" kontrolü için indirilen bu HTML'den ek istek yapmadan
 * bir sinyal çıkarıp `lib/relevance.ts` assessLeadQuality'nin AI
 * puanlamasına ("Ek bağlam" alanı üzerinden) besleniyor.
 *
 * Basit/kaba bir çıkarım - gerçek bir HTML parser değil, script/style
 * içeriğini ve etiketleri kabaca temizleyip ilk birkaç yüz karakteri alır.
 */
function extractPageSnippet(html: string): { title?: string; textSnippet?: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 150)
    : undefined;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const textSnippetRaw = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const textSnippet = textSnippetRaw ? textSnippetRaw.slice(0, 300) : undefined;

  return { title, textSnippet };
}

const SOCIAL_FETCH_TIMEOUT_MS = 4000;
/** Instagram/Facebook/TikTok'u gerçek bir tarayıcı gibi göstermeye çalışan User-Agent - bkz. fetchSocialSnippet notu. */
const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Firmanın kendi web sitesinin HTML'inden (zaten indirilmiş - ekstra
 * istek yok) Instagram/Facebook/TikTok profil linklerini regex ile
 * çıkarır. Genelde site header/footer'ında "bizi takip edin" ikonlarında
 * bulunur. Sadece İLK eşleşen linki alır (genelde asıl işletme profili
 * budur - sayfa içinde paylaşım butonları/widget'lar da aynı domain'e
 * link verebilir ama bunlar nadiren tam bir profil path'i taşır).
 */
function extractSocialLinks(html: string): {
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
} {
  const instagramMatch = html.match(
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._-]{2,30})/i,
  );
  const facebookMatch = html.match(
    /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9.\-]{2,60})/i,
  );
  const tiktokMatch = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/(@[a-zA-Z0-9._-]{2,30})/i);

  // "share", "sharer.php", "login", "policies" gibi profil OLMAYAN,
  // genel/işlevsel path'leri ele - profil sanıp boşuna fetch atmayalım.
  const genericFacebookPaths = new Set(["sharer", "sharer.php", "login", "policies", "help"]);
  const facebookHandle = facebookMatch?.[1]?.split("/")[0];

  return {
    instagramUrl: instagramMatch ? `https://www.instagram.com/${instagramMatch[1]}` : undefined,
    facebookUrl:
      facebookHandle && !genericFacebookPaths.has(facebookHandle.toLowerCase())
        ? `https://www.facebook.com/${facebookHandle}`
        : undefined,
    tiktokUrl: tiktokMatch ? `https://www.tiktok.com/${tiktokMatch[1]}` : undefined,
  };
}

/** `extractPageSnippet`'teki <title> mantığının Open Graph meta etiketleri için karşılığı - property/content sırası herhangi bir yönde olabildiği için iki regex de deneniyor. */
function extractOgTag(html: string, property: "og:title" | "og:description"): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim().slice(0, 300);
  }
  return undefined;
}

/**
 * Sahibinin "instagram tiktok facebook buralarda da arasın, buradaki
 * bilgileri kaydetsin" isteği (bkz. CLAUDE.md) - AMA bu platformların
 * RESMİ arama API'si yok (Meta Graph API/TikTok API sadece SİZİN
 * yönettiğiniz hesaplar için çalışıyor, LinkedIn'deki gibi bir "iç API"
 * arka kapısı da yok) - bu yüzden rastgele bir firma adını arayıp
 * profilini BULAMIYORUZ, sadece firmanın KENDİ web sitesinde link
 * verdiği bir profili varsa (bkz. extractSocialLinks) o profilin
 * HERKESE AÇIK sayfasını en iyi ihtimalle okumaya çalışıyoruz.
 *
 * Sahibiyle konuşulup KABUL EDİLEN risk: bu "kırılgan" bir yöntem -
 * garantisi YOK. Düz bir `fetch()` (JS çalıştırmıyor) bu platformların
 * çoğu zaman bot/login duvarına çarpar. Buna rağmen denemeye değer,
 * çünkü Instagram/Facebook/TikTok, ÖNİZLEME kartları (WhatsApp/Twitter'a
 * bir link yapıştırınca çıkan resim+açıklama) için Open Graph meta
 * etiketlerini (`og:title`, `og:description`) SUNUCU TARAFINDA, JS
 * gerektirmeden render eder - bazen anonim bir isteğe bile bu meta
 * etiketleriyle yanıt verirler (özellikle Instagram/Facebook'ta halka
 * açık işletme sayfaları için). Hiçbir garanti yok - başarısız
 * olursa (hata, timeout, olmayan meta etiketi) sessizce `null` döner,
 * aday yine normal akışında (bu bilgi olmadan) işlenmeye devam eder -
 * `fetchSiteHtml` ile AYNI "karar veremeyiz, güvenli tarafta kal" ilkesi.
 */
async function fetchSocialSnippet(
  url: string,
): Promise<{ title?: string; description?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOCIAL_FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_LIKE_USER_AGENT,
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const title = extractOgTag(html, "og:title");
    const description = extractOgTag(html, "og:description");
    if (!title && !description) return null;
    return { title, description };
  } catch {
    return null;
  }
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
  webApiError?: string;
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
    // Sahibinin "firmayı google vs arasın verilere göre puan versin"
    // isteği için (bkz. CLAUDE.md) - zaten indirdiğimiz HTML'den ücretsiz
    // bir içerik özeti, `lib/relevance.ts`'teki AI puanlamasına besleniyor.
    let siteSnippet: { title?: string; textSnippet?: string } | undefined;
    // Sahibinin "instagram tiktok facebook buralarda da arasın, bilgileri
    // kaydetsin, teklif metnini de buna göre belirlesin" isteği (bkz.
    // CLAUDE.md) - kabul edilen risk: garantisi yok, bkz. fetchSocialSnippet.
    const socialInfo: { platform: string; url: string; title?: string; description?: string }[] = [];
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
      siteSnippet = extractPageSnippet(html);

      const social = extractSocialLinks(html);
      const socialEntries: Array<[string, string | undefined]> = [
        ["instagram", social.instagramUrl],
        ["facebook", social.facebookUrl],
        ["tiktok", social.tiktokUrl],
      ];
      for (const [platform, url] of socialEntries) {
        if (!url) continue;
        const snippet = await fetchSocialSnippet(url);
        if (snippet) {
          socialInfo.push({ platform, url, title: snippet.title, description: snippet.description });
        } else {
          // Sayfa okunamadı (bot duvarı/timeout vb.) ama linki en azından
          // bulduk - içerik olmasa da URL'i kaydetmek yine faydalı
          // (sahibi popup'tan elle bakabilir).
          socialInfo.push({ platform, url });
        }
      }
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
        ...(siteSnippet?.title ? { siteTitle: siteSnippet.title } : {}),
        ...(siteSnippet?.textSnippet ? { siteTextSnippet: siteSnippet.textSnippet } : {}),
        ...(socialInfo.length ? { socialProfiles: socialInfo } : {}),
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
): Promise<{ results: ScanResult[]; query: string; returned: number; apiError?: string }> {
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
