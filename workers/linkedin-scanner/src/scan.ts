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
  // İlk canlı denemede 400 (Bad Request) alındı - bkz. CLAUDE.md. İki
  // değişiklik yapıldı (bilinen açık kaynak "linkedin-api" istemcilerinden
  // - ör. tomquirk/linkedin-api - alınan desenler):
  //   1. `accept: application/json` DEĞİL, Voyager'ın beklediği
  //      `application/vnd.linkedin.normalized+json+2.1` - bazı Voyager
  //      endpoint'leri Accept başlığı tam bu değilse 400 dönüyor.
  //   2. `resultType:List(CONTENT)` filtresi kaldırıldı - "CONTENT" bu
  //      decorationId için geçerli bir enum değeri olmayabilir (400'ün
  //      sebebi bu da olabilir). Şimdilik filtresiz, geniş arama.
  // `decorationId`'deki "-172" versiyon numarası da LinkedIn'in sık
  // değiştirdiği, kırılgan bir değer - hâlâ 400 alınırsa asıl şüpheli bu.
  const query =
    `(keywords:${encodeURIComponent(keyword)},flagshipSearchIntent:SEARCH_SRP,` +
    `queryParameters:(keywords:List(${encodeURIComponent(keyword)})),` +
    `includeFiltersInResponse:false)`;
  const params = new URLSearchParams({
    decorationId: "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-172",
    origin: "GLOBAL_SEARCH_HEADER",
    q: "all",
    query,
    start: "0",
    count: "10",
  });
  const requestUrl = `${VOYAGER_SEARCH_URL}?${params.toString()}`;

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
      // Hiç sonuç çıkmadıysa ham yanıtı da taşı - gerçek şekli görüp parser'ı ayarlamak için.
      rawSample: results.length === 0 ? bodyText.slice(0, 500) : undefined,
    },
  };
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
