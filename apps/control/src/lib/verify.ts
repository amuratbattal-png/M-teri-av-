/**
 * Ayarlar sayfasındaki "Doğrula" butonları için - o an formda yazılı olan
 * değeri (kaydedilmiş olması ŞART DEĞİL) gerçek sağlayıcıya karşı test
 * eder. Sadece koddaki entegrasyonu GERÇEKTEN yazılmış kanallar için var
 * (bkz. workers/google-search-scanner/src/scan.ts, channels/email,
 * channels/whatsapp) - henüz iskelet halinde olan kanallar (Yahoo,
 * LinkedIn, TikTok, Instagram, ticaret sicili, sesli arama) için
 * uydurma bir "doğrulama" yapmak yanıltıcı olur, o yüzden yok. O
 * kanalların gerçek entegrasyonu yazılınca buraya da eklenecek.
 *
 * Her doğrulayıcı `fields` objesinden ihtiyacı olan anahtar(lar)ı okur -
 * bu obje, formda o an yazılı olan TÜM `field__*` değerlerinin (+ NVIDIA
 * alanlarının) anlık kopyası, D1'den değil (bkz. routes/settings.ts
 * handleVerifySetting) - kaydetmeden önce test edebilmek için.
 */
export interface VerifyResult {
  ok: boolean;
  message: string;
}

type Verifier = (fields: Record<string, string>) => Promise<VerifyResult>;

async function verifyNvidia(fields: Record<string, string>): Promise<VerifyResult> {
  const key = fields.nvidia_api_key;
  if (!key) return { ok: false, message: "Anahtar girilmedi." };
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true, message: "Anahtar geçerli - NVIDIA API'ye erişilebiliyor." };
    return { ok: false, message: `Geçersiz (HTTP ${res.status}) - NGC "Legacy Key" değil, build.nvidia.com'dan alınan nvapi-... anahtarı gerekiyor.` };
  } catch (err) {
    return { ok: false, message: `Bağlantı hatası: ${String(err)}` };
  }
}

async function verifyGooglePlaces(fields: Record<string, string>): Promise<VerifyResult> {
  const key = fields.google_places_api_key;
  if (!key) return { ok: false, message: "Anahtar girilmedi." };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: "test",
        languageCode: "tr",
        regionCode: "TR",
        maxResultCount: 1,
      }),
    });
    if (res.ok) return { ok: true, message: "Anahtar geçerli - Places API çalışıyor." };
    const text = await res.text();
    return { ok: false, message: `Geçersiz/yetkisiz (HTTP ${res.status}): ${text.slice(0, 200)}` };
  } catch (err) {
    return { ok: false, message: `Bağlantı hatası: ${String(err)}` };
  }
}

async function verifyGoogleCustomSearch(fields: Record<string, string>): Promise<VerifyResult> {
  const key = fields.google_search_api_key || fields.google_places_api_key;
  const cx = fields.google_search_engine_id;
  if (!key) return { ok: false, message: "Anahtar girilmedi." };
  if (!cx) return { ok: false, message: "Search Engine ID (cx) alanı da dolu olmalı." };
  try {
    const params = new URLSearchParams({ key, cx, q: "test", num: "1" });
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (res.ok && !data.error) return { ok: true, message: "Anahtar + Engine ID geçerli." };
    return {
      ok: false,
      message: `Hata: ${data.error?.message ?? `HTTP ${res.status}`} (bilinen sorun: bkz. CLAUDE.md Custom Search 403 notu).`,
    };
  } catch (err) {
    return { ok: false, message: `Bağlantı hatası: ${String(err)}` };
  }
}

async function verifyResend(fields: Record<string, string>): Promise<VerifyResult> {
  const key = fields.email_api_key;
  if (!key) return { ok: false, message: "Anahtar girilmedi." };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true, message: "Anahtar geçerli - Resend API'ye erişilebiliyor." };
    return { ok: false, message: `Geçersiz (HTTP ${res.status}).` };
  } catch (err) {
    return { ok: false, message: `Bağlantı hatası: ${String(err)}` };
  }
}

async function verifyWhatsApp(fields: Record<string, string>): Promise<VerifyResult> {
  const token = fields.whatsapp_token;
  const phoneId = fields.whatsapp_phone_number_id;
  if (!token) return { ok: false, message: "Token girilmedi." };
  if (!phoneId) return { ok: false, message: "Telefon numarası ID alanı da dolu olmalı." };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}?access_token=${encodeURIComponent(token)}`,
    );
    if (res.ok) return { ok: true, message: "Token + telefon numarası ID geçerli." };
    const text = await res.text();
    return { ok: false, message: `Geçersiz (HTTP ${res.status}): ${text.slice(0, 200)}` };
  } catch (err) {
    return { ok: false, message: `Bağlantı hatası: ${String(err)}` };
  }
}

/** Anahtar adı -> doğrulayıcı. Bir `key` burada yoksa o kanalın gerçek entegrasyonu henüz yazılmadı demektir. */
const VERIFIERS: Record<string, Verifier> = {
  nvidia_api_key: verifyNvidia,
  google_places_api_key: verifyGooglePlaces,
  google_search_api_key: verifyGoogleCustomSearch,
  email_api_key: verifyResend,
  whatsapp_token: verifyWhatsApp,
};

export function isVerifiable(key: string): boolean {
  return key in VERIFIERS;
}

export async function runVerifier(key: string, fields: Record<string, string>): Promise<VerifyResult> {
  const verifier = VERIFIERS[key];
  if (!verifier) {
    return {
      ok: false,
      message: "Bu kanalın gerçek entegrasyonu henüz yazılmadı - doğrulanacak bir şey yok.",
    };
  }
  return verifier(fields);
}
