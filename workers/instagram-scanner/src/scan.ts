import { SOCIAL_KEYWORDS, PARALLEL_TRACK, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

export interface ScanEnv {
  INSTAGRAM_SESSION_COOKIE?: string;
  INSTAGRAM_CSRF_TOKEN?: string;
}

export interface ScanDebugInfo {
  keyword: string;
  hashtag: string;
  status?: number;
  apiError?: string;
  /** Parser hiçbir şey bulamazsa ham yanıtın (özet/ilk kısım) - teşhis için, bkz. linkedin-scanner'daki aynı desen. */
  rawSample?: string;
  parsedCount: number;
}

/**
 * Anahtar kelimeye göre kaba bir ihtiyaç etiketi tahmini - LinkedIn
 * scanner'daki KEYWORD_NEED_TAGS ile AYNI mantık, gerçek bir AI
 * sınıflandırması değil (bkz. packages/shared/src/keywords.ts).
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
};

/**
 * `SOCIAL_KEYWORDS`'ün Instagram'a özel bir alt kümesi - "iş arıyorum" ve
 * "freelance çalışıyorum" KASITLI olarak DIŞLANDI. Bu sistemin hedefi
 * MÜŞTERİ bulmak (web sitesi/logo/kurumsal kimlik isteyen kişi/firma);
 * bu iki hashtag ise İŞ ARAYAN (istihdam edilmek isteyen) kişileri
 * hedefliyor - tam ters kitle. LinkedIn'de bu ayrım AI'ın lead kalite
 * puanlamasına (bkz. apps/control/src/lib/relevance.ts) bırakılmıştı
 * (iş ilanları/alakasız sonuçlar puanlanıp "Askıda"ya düşüyor), ama
 * Instagram'da bunu baştan taramamak daha temiz - hem gereksiz
 * tarama/AI-puanlama maliyeti olmaz hem de sahibinin "bunlar yanlış
 * kitle" geri bildirimi doğrudan karşılanmış olur. (`SOCIAL_KEYWORDS`
 * kendisi DEĞİŞTİRİLMEDİ - LinkedIn/TikTok hâlâ tam listeyi kullanıyor.)
 */
const INSTAGRAM_KEYWORDS = SOCIAL_KEYWORDS.filter(
  (k) => k !== "iş arıyorum" && k !== "freelance çalışıyorum",
);

const HASHTAG_INFO_URL = "https://www.instagram.com/api/v1/tags/web_info/";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
/**
 * Instagram'ın kendi web arayüzünün (instagram.com/explore/tags/...)
 * kullandığı, herkese açık ama dokümante edilmemiş sabit bir uygulama
 * kimliği - birçok açık kaynak Instagram istemcisinde (ör. instagrapi)
 * bilinen bir değer, gizli/kişiye özel bir şey değil.
 */
const IG_APP_ID = "936619743392459";

/**
 * SOCIAL_KEYWORDS içindeki çok kelimeli Türkçe ifadeleri Instagram
 * hashtag biçimine çevirir (boşluksuz, Türkçe karakter yok - Instagram
 * hashtag'leri boşluk/ç-ş-ğ-ü-ö-ı kabul etmiyor). Gerçek kullanıcıların
 * attığı hashtag'lerle birebir eşleşeceğinin GARANTİSİ yok - bu, kaba
 * bir yaklaşım (ör. "yeni şirket" → "yenisirket").
 */
function toHashtag(keyword: string): string {
  const withoutDiacritics = keyword
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  return withoutDiacritics.replace(/[^a-z0-9]+/g, "");
}

interface InstagramMedia {
  code?: string;
  caption?: { text?: string } | null;
  user?: { username?: string; full_name?: string };
}

/**
 * Instagram'ın RESMİ arama/keşif API'si (Graph API) rastgele hashtag
 * taramasına izin vermiyor - sadece SAHİBİNİN yönettiği hesap için
 * çalışıyor. Bu yüzden LinkedIn'deki (Voyager) yöntemle AYNI mantık:
 * Instagram'ın kendi web arayüzünün kullandığı, dokümante EDİLMEMİŞ
 * `tags/web_info` iç API'sine, sahibinin kendi oturum çerezi (`sessionid`)
 * ile ("giriş yapmış gibi") istek atılıyor.
 *
 * BİLİNEN KISITLAR (dürüstçe söylenmeli, bkz. CLAUDE.md):
 *   - Instagram Kullanım Şartları'na aykırı - sahibi bu riski bilerek
 *     kabul etti. Instagram'ın bot tespiti LinkedIn'den DAHA AGRESİF -
 *     hesabın kısıtlanma/askıya alınma riski LinkedIn'e göre daha
 *     yüksek kabul edildi.
 *   - Bu URL/parametre şekli açık kaynak Instagram istemcilerinden
 *     (ör. instagrapi) biliniyor ama CANLI TEST EDİLMEDİ - Instagram
 *     bunu istediği an değiştirebilir/kırabilir. `debug.rawSample`,
 *     ilk denemede beklenen sonucu vermezse gerçek yanıt şeklini görüp
 *     parser'ı (parseInstagramResults) ayarlamak için var - LinkedIn/
 *     Google Custom Search'te olduğu gibi canlı iterasyon gerekecek.
 *   - Instagram hashtag arar, LinkedIn gibi SERBEST METİN arama YAPMAZ -
 *     bu yüzden anahtar kelime önce toHashtag() ile bir hashtag'e
 *     çevriliyor; gerçek kullanıcıların kullandığı hashtag'lerle birebir
 *     eşleşeceğinin garantisi yok.
 */
/**
 * `Set-Cookie` yanıt header'larından `isim=değer` çiftlerini çıkarır
 * (Path/Secure/HttpOnly/Expires gibi öznitelikleri ATAR). Cloudflare
 * Workers'ın `Headers.getSetCookie()` metodu (Fetch spesifikasyonundaki
 * standart yöntem) birden fazla Set-Cookie'yi AYRI stringler olarak
 * döner - `get("set-cookie")`'nin aksine (o, hepsini virgülle birleştirip
 * bozuyor).
 */
function extractSetCookiePairs(headers: Headers): Record<string, string> {
  // `getSetCookie()` (Fetch spesifikasyonunda standart, birden fazla
  // Set-Cookie'yi ayrı ayrı döner) Cloudflare Workers runtime'ında VAR
  // ama bu repodaki `@cloudflare/workers-types` sürümünün tip
  // tanımlarında henüz YOK - bu yüzden `unknown` üzerinden elle cast
  // ediliyor (paketi güncellemek yerine, tek satırlık kırılgan bir tip
  // boşluğu daha güvenli).
  const headersWithGetSetCookie = headers as unknown as { getSetCookie?: () => string[] };
  const raw =
    typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : [];
  const pairs: Record<string, string> = {};
  for (const cookieStr of raw) {
    const [nameValue] = cookieStr.split(";");
    const eq = nameValue.indexOf("=");
    if (eq === -1) continue;
    pairs[nameValue.slice(0, eq).trim()] = nameValue.slice(eq + 1).trim();
  }
  return pairs;
}

async function searchInstagram(
  keyword: string,
  sessionCookie: string,
  csrfToken: string,
): Promise<{ results: ScanResult[]; debug: ScanDebugInfo }> {
  const hashtag = toHashtag(keyword);
  const requestUrl = `${HASHTAG_INFO_URL}?tag_name=${encodeURIComponent(hashtag)}`;

  const baseCookies: Record<string, string> = { sessionid: sessionCookie, csrftoken: csrfToken };

  const doFetch = (cookies: Record<string, string>) => {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    return fetch(requestUrl, {
      // Çerez geçersiz/eksikse Instagram isteği /accounts/login/'a
      // yönlendiriyor - ÖNCEDEN bu otomatik takip ediliyordu, Instagram'ın
      // login sayfası da kendi içinde tekrar yönlendirdiği için sonsuz bir
      // döngüye girip çirkin bir "Too many redirects" hatasına dönüşüyordu
      // (canlı testte görüldü). `redirect: "manual"` ile yönlendirmeleri
      // KENDİMİZ yakalıyoruz - aşağıda en fazla BİR kez elle takip
      // ediyoruz (çerez tazeleme deseni için, bkz. aşağıdaki not).
      redirect: "manual",
      headers: {
        Cookie: cookieHeader,
        "x-csrftoken": cookies.csrftoken ?? csrfToken,
        "x-ig-app-id": IG_APP_ID,
        "x-requested-with": "XMLHttpRequest",
        accept: "*/*",
        referer: "https://www.instagram.com/",
        "user-agent": BROWSER_USER_AGENT,
      },
    });
  };

  let res = await doFetch(baseCookies);
  let retried = false;

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") ?? "(location header yok)";
    const freshCookies = extractSetCookiePairs(res.headers);
    // CANLI TESTTE GÖRÜLEN DESEN: Instagram, hedefi İSTEĞİN KENDİSİYLE
    // AYNI olan bir 302 dönüp birkaç Set-Cookie (csrftoken/mid/ig_did
    // gibi tazelenmiş değerler) veriyor - bu "oturum geçersiz" değil,
    // bir çerez tazeleme/bot kontrolü adımı; gerçek bir tarayıcı bu
    // çerezleri alıp AYNI isteği otomatik tekrar atar. Biz de bunu
    // TAM OLARAK bir kez (sonsuz döngüye girmeden) yapıyoruz.
    if (location === requestUrl && Object.keys(freshCookies).length > 0) {
      res = await doFetch({ ...baseCookies, ...freshCookies });
      retried = true;
    }
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") ?? "(location header yok)";
    // Header İSİMLERİ teşhis için faydalı (ör. bir Set-Cookie varsa
    // Instagram muhtemelen çerez tazeliyor/bot kontrolü yapıyor) ama
    // DEĞERLERİ asla loglanmamalı - bir Set-Cookie değeri yeni bir
    // oturum jetonu taşıyabilir, bunu Canlı Log/panele yazmak ikinci
    // bir sızıntı riski yaratır (bkz. CLAUDE.md - sahibinin chat'e
    // yapıştırdığı sessionid olayı).
    const headerNames = [...res.headers.keys()].sort().join(", ");
    const hasSetCookie = res.headers.has("set-cookie");
    return {
      results: [],
      debug: {
        keyword,
        hashtag,
        status: res.status,
        apiError:
          `Instagram isteği ${retried ? "çerez tazeleme denemesinden SONRA da " : ""}yönlendirdi: ${location}. ` +
          `Yanıt header'ları: ${headerNames} (Set-Cookie ${hasSetCookie ? "VAR" : "yok"}). ` +
          (retried
            ? "Çerez tazeleme denemesi de işe yaramadı - oturum muhtemelen gerçekten geçersiz, sessionid/csrftoken'ı yeniden al."
            : location === requestUrl
              ? "Hedef isteğin kendisiyle AYNI ama Set-Cookie yoktu, tekrar denenemedi."
              : `sessionid/csrftoken değerlerini kontrol et (tırnaksız, eksiksiz kopyalandığından ve hâlâ Instagram'a giriş yapmış olduğundan emin ol).`),
        parsedCount: 0,
      },
    };
  }

  if (!res.ok) {
    const text = await res.text();
    return {
      results: [],
      debug: {
        keyword,
        hashtag,
        status: res.status,
        apiError: text.slice(0, 300),
        parsedCount: 0,
      },
    };
  }

  const bodyText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch (err) {
    // Çerez geçersizse Instagram genelde JSON değil, bir giriş sayfası
    // (HTML) döner - JSON.parse hatası bunun net bir belirtisi.
    return {
      results: [],
      debug: {
        keyword,
        hashtag,
        status: res.status,
        apiError: `JSON parse hatası (muhtemelen çerez geçersiz, HTML giriş sayfası döndü): ${String(err)}`,
        rawSample: bodyText.slice(0, 500),
        parsedCount: 0,
      },
    };
  }

  const results = parseInstagramResults(data, keyword, hashtag);
  return {
    results,
    debug: {
      keyword,
      hashtag,
      status: res.status,
      parsedCount: results.length,
      rawSample: results.length === 0 ? JSON.stringify(data).slice(0, 1200) : undefined,
    },
  };
}

/**
 * `tags/web_info` yanıtı, gönderileri `data.recent.sections[].layout_content.medias[].media`
 * altında taşır (bilinen açık kaynak istemcilerden - CANLI DOĞRULANMADI).
 * `top.sections` de aynı şekilde denenir (recent boşsa).
 */
function parseInstagramResults(data: unknown, keyword: string, hashtag: string): ScanResult[] {
  const root = data as { data?: { recent?: unknown; top?: unknown } } | undefined;
  const sectionsSources = [root?.data?.recent, root?.data?.top];
  const results: ScanResult[] = [];

  for (const source of sectionsSources) {
    const sections = (source as { sections?: unknown[] } | undefined)?.sections;
    if (!Array.isArray(sections)) continue;

    for (const section of sections) {
      const medias = (section as { layout_content?: { medias?: unknown[] } })?.layout_content?.medias;
      if (!Array.isArray(medias)) continue;

      for (const entry of medias) {
        const media = (entry as { media?: InstagramMedia })?.media;
        const username = media?.user?.username;
        if (!media || !username) continue;

        const postUrl = media.code ? `https://www.instagram.com/p/${media.code}/` : null;
        results.push({
          name: media.user?.full_name?.trim() || username,
          sectorSlug: PARALLEL_TRACK.slug,
          sourceChannel: "instagram",
          sourceUrl: `https://www.instagram.com/${username}/`,
          needTags: KEYWORD_NEED_TAGS[keyword] ?? ["website_new"],
          rawMetadata: {
            keyword,
            hashtag,
            username,
            postUrl,
            caption: media.caption?.text?.slice(0, 300),
          },
        });
      }
    }
  }

  // Aynı hashtag'de birden fazla gönderi paylaşmış bir kullanıcı birden
  // fazla kez gelmesin diye kullanıcı adına göre tekilleştir.
  const seen = new Set<string>();
  return results.filter((r) => {
    const username = (r.rawMetadata as { username?: string })?.username;
    if (!username || seen.has(username)) return false;
    seen.add(username);
    return true;
  });
}

export async function scanNextKeyword(
  cursorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug?: ScanDebugInfo }> {
  const keyword = INSTAGRAM_KEYWORDS[cursorIndex % INSTAGRAM_KEYWORDS.length];
  const nextCursorIndex = (cursorIndex + 1) % INSTAGRAM_KEYWORDS.length;

  if (!env.INSTAGRAM_SESSION_COOKIE || !env.INSTAGRAM_CSRF_TOKEN) {
    const missing = [
      !env.INSTAGRAM_SESSION_COOKIE && "INSTAGRAM_SESSION_COOKIE (sessionid)",
      !env.INSTAGRAM_CSRF_TOKEN && "INSTAGRAM_CSRF_TOKEN (csrftoken)",
    ].filter(Boolean).join(", ");
    console.warn(`${missing} tanımlı değil - "${keyword}" taraması atlandı.`);
    return {
      results: [],
      nextCursorIndex,
      debug: {
        keyword,
        hashtag: toHashtag(keyword),
        apiError: `Eksik: ${missing}. Ayarlar panelinden kaydedilip kaydedilmediğini kontrol et.`,
        parsedCount: 0,
      },
    };
  }

  try {
    const { results, debug } = await searchInstagram(
      keyword,
      env.INSTAGRAM_SESSION_COOKIE,
      env.INSTAGRAM_CSRF_TOKEN,
    );
    if (debug.apiError) {
      console.error("Instagram arama hatası", debug);
    }
    return { results, nextCursorIndex, debug };
  } catch (err) {
    console.error("Instagram arama çağrısı başarısız", err);
    return {
      results: [],
      nextCursorIndex,
      debug: { keyword, hashtag: toHashtag(keyword), apiError: String(err), parsedCount: 0 },
    };
  }
}
