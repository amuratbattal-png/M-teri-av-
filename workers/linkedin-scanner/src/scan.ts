import { SOCIAL_KEYWORDS, PARALLEL_TRACK, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

export interface ScanEnv {
  LINKEDIN_SESSION_COOKIE?: string;
  LINKEDIN_CSRF_TOKEN?: string;
}

export interface ScanDebugInfo {
  keyword: string;
  status?: number;
  apiError?: string;
  /** Ham yanıtın ilk kısmı - parser hiçbir şey bulamazsa gerçek şekli görüp buna göre ayarlamak için. */
  rawSample?: string;
  parsedCount: number;
}

/**
 * Anahtar kelimeye göre kaba bir ihtiyaç etiketi tahmini - gerçek bir AI
 * sınıflandırması değil, basit bir sözlük eşlemesi (bkz.
 * packages/shared/src/keywords.ts SOCIAL_KEYWORDS).
 */
const KEYWORD_NEED_TAGS: Record<string, NeedTag[]> = {
  "yeni şirket": ["website_new", "corporate_identity", "logo"],
  "girişimcilik": ["website_new", "corporate_identity"],
  "startup kurdum": ["website_new", "corporate_identity", "logo"],
  "yeni iş yerimiz açıldı": ["website_new", "visual_identity"],
  "web sitesi yaptırmak istiyorum": ["website_new"],
  "logo tasarımı": ["logo"],
  "kurumsal kimlik": ["corporate_identity"],
  "yeni ofisimiz": ["visual_identity", "poster_design"],
  "iş arıyorum": ["website_new"],
  "freelance çalışıyorum": ["website_new", "social_media_management"],
};

const VOYAGER_SEARCH_URL = "https://www.linkedin.com/voyager/api/search/dash/clusters";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * LinkedIn'in RESMİ bir arama API'si yok. Bu, LinkedIn'in kendi web
 * arayüzünün kullandığı, dokümante EDİLMEMİŞ "Voyager" iç API'sine
 * `li_at` oturum çereziyle ("giriş yapmış gibi") istek atıyor.
 *
 * BİLİNEN KISITLAR (dürüstçe söylenmeli):
 *   - LinkedIn Kullanım Şartları'na aykırı - sahibi bu riski bilerek
 *     kabul etti (bkz. CLAUDE.md).
 *   - Bu URL/parametre şekli, herkese açık kaynaklardan (linkedin-api
 *     gibi açık kaynak "scraper" projelerinden) biliniyor ama CANLI
 *     TEST EDİLMEDİ - LinkedIn bunu istediği an değiştirebilir/
 *     kırabilir. `debug.rawSample`, ilk denemede beklenen sonucu
 *     vermezse gerçek yanıt şeklini görüp parser'ı (parseVoyagerResults)
 *     ayarlamak için var - Google Custom Search entegrasyonunda
 *     olduğu gibi canlı iterasyon gerekecek.
 */
async function searchLinkedIn(
  keyword: string,
  sessionCookie: string,
  csrfToken: string,
): Promise<{ results: ScanResult[]; debug: ScanDebugInfo }> {
  // İlk iki canlı denemede 400 (Bad Request) alındı - bkz. CLAUDE.md.
  // İkinci denemede tam istek URL'si görüldü ve ÇİFT encode hatası ortaya
  // çıktı: `query` değeri önce kendimiz `encodeURIComponent` ile
  // encode edilmiş, sonra `URLSearchParams.toString()` bunu TEKRAR encode
  // etmiş (`%20` → `%2520`) - sunucu tarafında keyword içinde literal
  // "%20" metni olarak görünüyordu, gerçek boşluk değil. Daha da önemlisi,
  // `URLSearchParams` RESTli sorgu söz diziminin parçası olan `(`, `)`,
  // `:`, `,` karakterlerini de encode ediyor - gerçek LinkedIn
  // istemcileri (ör. tomquirk/linkedin-api) bu yüzden URL'yi
  // `URLSearchParams` ile DEĞİL, elle string birleştirerek kuruyor; bu
  // yapısal karakterler literal (encode edilmemiş) kalmalı, sadece
  // keyword'ün kendisi (boşluk vb.) bir KEZ encode edilmeli. Ayrıca:
  //   - `accept: application/json` DEĞİL, Voyager'ın beklediği
  //     `application/vnd.linkedin.normalized+json+2.1`.
  //   - `resultType:List(CONTENT)` filtresi kaldırıldı (geçersiz enum
  //     olabilirdi).
  // `decorationId`'deki "-172" versiyon numarası hâlâ kırılgan bir değer -
  // bu iki düzeltmeden sonra da 400 gelirse asıl şüpheli bu.
  const encodedKeyword = encodeURIComponent(keyword);
  const query =
    `(keywords:${encodedKeyword},flagshipSearchIntent:SEARCH_SRP,` +
    `queryParameters:(keywords:List(${encodedKeyword})),` +
    `includeFiltersInResponse:false)`;
  const requestUrl =
    `${VOYAGER_SEARCH_URL}?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-172` +
    `&origin=GLOBAL_SEARCH_HEADER&q=all&query=${query}&start=0&count=10`;

  const res = await fetch(requestUrl, {
    headers: {
      Cookie: `li_at=${sessionCookie}; JSESSIONID="${csrfToken}"`,
      "csrf-token": csrfToken,
      "x-restli-protocol-version": "2.0.0",
      accept: "application/vnd.linkedin.normalized+json+2.1",
      "x-li-lang": "tr_TR",
      "user-agent": BROWSER_USER_AGENT,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      results: [],
      // requestUrl'de secret/çerez YOK (query param'larda sadece keyword
      // ve sabit değerler var) - hâlâ 400 gelirse tam sorguyu görüp bilinen
      // çalışan desenlerle karşılaştırmak için debug'a eklendi.
      debug: {
        keyword,
        status: res.status,
        apiError: `${text.slice(0, 300)} | url: ${requestUrl}`,
        parsedCount: 0,
      },
    };
  }

  const bodyText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch (err) {
    return {
      results: [],
      debug: {
        keyword,
        status: res.status,
        apiError: `JSON parse hatası: ${String(err)}`,
        rawSample: bodyText.slice(0, 500),
        parsedCount: 0,
      },
    };
  }

  const results = parseVoyagerResults(data, keyword);
  return {
    results,
    debug: {
      keyword,
      status: res.status,
      parsedCount: results.length,
      // Hiç sonuç çıkmadıysa ham yanıtın ilk 500 karakteri genelde işe
      // yaramıyor (canlı testte sadece filtre UI metadata'sı çıktı,
      // totalResultCount > 0 olmasına rağmen) - bunun yerine yanıtın
      // GERÇEK ŞEKLİNİ (hangi anahtarın altında kaç öğe var) özetleyen
      // summarizeVoyagerResponse() kullanılıyor.
      rawSample: results.length === 0 ? summarizeVoyagerResponse(data) : undefined,
    },
  };
}

/**
 * Ham yanıtın ilk N karakteri genelde işe yaramıyor çünkü LinkedIn'in
 * Voyager yanıtları önce büyük bir metadata/filtre bloğu, asıl sonuçlar
 * (`included` dizisi) çok sonra geliyor (bkz. CLAUDE.md - ilk canlı
 * testte totalResultCount:427 olmasına rağmen ilk 500 karakter hiçbir
 * sonuç içermiyordu). Bunun yerine yanıtın YAPISINI (hangi anahtarın
 * altında kaç öğe/ne tip veri var) özetler - gerçek yanıt verisini değil,
 * sadece şeklini taşıdığı için çok daha küçük ve daha kullanışlı.
 */
function summarizeVoyagerResponse(data: unknown): string {
  if (typeof data !== "object" || data === null) return String(data);
  const obj = data as Record<string, unknown>;
  const summary: Record<string, unknown> = { topLevelKeys: Object.keys(obj) };

  const describeArray = (arr: unknown[]) => ({
    length: arr.length,
    sampleTypes: arr.slice(0, 5).map((item) => {
      if (typeof item !== "object" || item === null) return typeof item;
      const rec = item as Record<string, unknown>;
      return typeof rec.$type === "string" ? rec.$type : Object.keys(rec).slice(0, 6);
    }),
  });

  if (Array.isArray(obj.included)) {
    summary.included = describeArray(obj.included);
  }
  const dataField = obj.data;
  if (typeof dataField === "object" && dataField !== null) {
    const inner = dataField as Record<string, unknown>;
    summary.dataKeys = Object.keys(inner);
    if (Array.isArray(inner.included)) summary.dataIncluded = describeArray(inner.included);
    if (Array.isArray(inner.elements)) summary.dataElements = describeArray(inner.elements);
    const metadata = inner.metadata;
    if (typeof metadata === "object" && metadata !== null) {
      summary.metadataKeys = Object.keys(metadata as Record<string, unknown>);
    }
  }

  return JSON.stringify(summary).slice(0, 1200);
}

/**
 * LinkedIn Voyager yanıtları, sonuçları `included` dizisinde URN'lerle
 * referanslanan ayrı "entity" nesneleri olarak taşır - basit bir
 * "data.elements" listesi DEĞİL. Bu ilk sürüm, en yaygın şekli (actor/
 * başlık metni olan feed update'leri) yakalamaya çalışıyor - LinkedIn'in
 * gerçek yanıt şekli canlı test edilmeden kesin değil.
 */
function parseVoyagerResults(data: unknown, keyword: string): ScanResult[] {
  const included = Array.isArray((data as { included?: unknown[] })?.included)
    ? ((data as { included: unknown[] }).included as Array<Record<string, unknown>>)
    : [];
  const results: ScanResult[] = [];

  for (const item of included) {
    const actor = item.actor as Record<string, unknown> | undefined;
    const title = item.title as Record<string, unknown> | undefined;
    const actorNameText =
      (actor?.name as Record<string, unknown> | undefined)?.text ??
      title?.text ??
      item.actorName;
    if (typeof actorNameText !== "string" || !actorNameText.trim()) continue;

    const url =
      (actor?.navigationUrl as string | undefined) ?? (item.navigationUrl as string | undefined) ?? null;

    results.push({
      name: actorNameText.trim(),
      sectorSlug: PARALLEL_TRACK.slug,
      sourceChannel: "linkedin",
      sourceUrl: url,
      needTags: KEYWORD_NEED_TAGS[keyword] ?? ["website_new"],
      contactLinkedin: url,
      rawMetadata: { keyword, rawType: item.$type },
    });
  }

  return results;
}

export async function scanNextKeyword(
  cursorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug?: ScanDebugInfo }> {
  const keyword = SOCIAL_KEYWORDS[cursorIndex % SOCIAL_KEYWORDS.length];
  const nextCursorIndex = (cursorIndex + 1) % SOCIAL_KEYWORDS.length;

  if (!env.LINKEDIN_SESSION_COOKIE || !env.LINKEDIN_CSRF_TOKEN) {
    // Önceden bu durumda debug hiç dönmüyordu - /run-now yanıtında "scan"
    // alanı sessizce yok oluyordu, sahibi HANGİ değerin eksik olduğunu
    // göremiyordu (bkz. CLAUDE.md - Ayarlar panelinden girilen li_at/
    // JSESSIONID worker'a ulaşmıyor gibi görünen olay). Artık hangisinin
    // eksik olduğu (gerçek değer değil, sadece var/yok) diagnostics'te
    // görünüyor.
    const missing = [
      !env.LINKEDIN_SESSION_COOKIE && "LINKEDIN_SESSION_COOKIE (li_at)",
      !env.LINKEDIN_CSRF_TOKEN && "LINKEDIN_CSRF_TOKEN (JSESSIONID)",
    ].filter(Boolean).join(", ");
    console.warn(`${missing} tanımlı değil - "${keyword}" taraması atlandı.`);
    return {
      results: [],
      nextCursorIndex,
      debug: { keyword, apiError: `Eksik: ${missing}. Ayarlar panelinden kaydedilip kaydedilmediğini kontrol et.`, parsedCount: 0 },
    };
  }

  try {
    const { results, debug } = await searchLinkedIn(
      keyword,
      env.LINKEDIN_SESSION_COOKIE,
      env.LINKEDIN_CSRF_TOKEN,
    );
    if (debug.apiError) {
      console.error("LinkedIn arama hatası", debug);
    }
    return { results, nextCursorIndex, debug };
  } catch (err) {
    console.error("LinkedIn arama çağrısı başarısız", err);
    return { results: [], nextCursorIndex, debug: { keyword, apiError: String(err), parsedCount: 0 } };
  }
}
