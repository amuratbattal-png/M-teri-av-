/**
 * Sistemdeki HER API anahtarı/harici entegrasyon değeri için tek bir
 * envanter - Ayarlar sayfası bunu okuyup dinamik olarak render eder
 * (bkz. apps/dashboard/src/render.ts renderSettingsPage "catalog"
 * bölümü). Yeni bir özellik yeni bir API anahtarı gerektirdiğinde
 * (ör. sahibinin istediği ~20 maddelik listeden biri - bkz. CLAUDE.md)
 * buraya birkaç satırlık bir kayıt eklemek yeterli, ayrı bir form/route
 * yazmaya gerek yok.
 *
 * `kind: "secret"` alanlar panelde asla geri gösterilmez (sadece
 * tanımlı olup olmadığı) ve boş bırakılırsa DOKUNULMAZ (yanlışlıkla
 * silinmesin diye). Diğerleri (`text`/`longtext`) boş bırakılırsa
 * satır silinir (worker kendi env fallback'ine döner).
 *
 * GÜVENLİK NOTU: buradaki her `secret` alan, panelden bir değer
 * girildiğinde D1'de düz metin olarak saklanır - Cloudflare Secret
 * kadar korumalı değildir (bkz. packages/db/schema.ts `settings`
 * yorumu). Sahibi bunu bilerek, panelden değiştirebilme kolaylığı
 * için kabul etti.
 */
export type SettingKind = "secret" | "text" | "longtext";

export interface SettingFieldDef {
  key: string;
  label: string;
  group: string;
  kind: SettingKind;
  placeholder?: string;
  /** Panelde küçük gri açıklama - hangi worker/env var'a karşılık geldiği, bilinen kısıtlar vb. */
  help?: string;
}

export const SETTINGS_CATALOG: SettingFieldDef[] = [
  // --- Google Arama / Maps (google-search-scanner) ---
  {
    key: "google_places_api_key",
    label: "Google Places API anahtarı",
    group: "Google Arama / Maps",
    kind: "secret",
    help: "Aktif kanal (google_maps). worker: google-search-scanner, env: SEARCH_API_KEY.",
  },
  {
    key: "google_search_api_key",
    label: "Google Custom Search API anahtarı",
    group: "Google Arama / Maps",
    kind: "secret",
    help: "Bilinen sorun: 403 hatası, sahibinin isteğiyle ertelendi (bkz. CLAUDE.md). Boşsa Places anahtarına düşer.",
  },
  {
    key: "google_search_engine_id",
    label: "Google Custom Search Engine ID",
    group: "Google Arama / Maps",
    kind: "text",
  },

  // --- Diğer arama motorları (yahoo-search-scanner) ---
  {
    key: "yahoo_search_api_key",
    label: "Yahoo Arama API anahtarı (KULLANILMIYOR)",
    group: "Diğer arama motorları (pasif)",
    kind: "secret",
    help: "Yahoo'nun resmi bir arama API'si yok (Yahoo BOSS yıllar önce kapatıldı) - worker artık search.yahoo.com'un sonuç sayfasını doğrudan kazıyor, kimlik bilgisi gerekmiyor. Bu alan artık okunmuyor, geriye dönük uyumluluk için duruyor.",
  },

  // --- Sosyal medya (PASİF) ---
  {
    key: "linkedin_session_cookie",
    label: "LinkedIn oturum çerezi (li_at)",
    group: "Sosyal medya (pasif)",
    kind: "secret",
    help: "Tarayıcıda LinkedIn'e giriş yapıp F12 → Application → Cookies'den 'li_at' değerini kopyala. Birkaç haftada bir geçersiz olur, yeniden girmen gerekir.",
  },
  {
    key: "linkedin_csrf_token",
    label: "LinkedIn CSRF token (JSESSIONID)",
    group: "Sosyal medya (pasif)",
    kind: "secret",
    help: "Aynı çerez listesinden 'JSESSIONID' değeri (tırnaksız, ör. ajax:1234567890123456789) - li_at ile birlikte gerekiyor.",
  },
  {
    key: "tiktok_api_key",
    label: "TikTok API anahtarı",
    group: "Sosyal medya (pasif)",
    kind: "secret",
  },
  {
    key: "instagram_api_key",
    label: "Instagram API anahtarı",
    group: "Sosyal medya (pasif)",
    kind: "secret",
  },

  // --- İhale / Freelancer (PASİF) ---
  {
    key: "tender_site_urls",
    label: "İhale sitesi URL'leri (virgülle ayrılmış)",
    group: "İhale / Freelancer (pasif)",
    kind: "text",
  },
  {
    key: "freelancer_gallery_source_urls",
    label: "Freelancer galeri URL'leri (virgülle ayrılmış)",
    group: "İhale / Freelancer (pasif)",
    kind: "text",
  },
  {
    key: "freelancer_gallery_search_api_key",
    label: "Freelancer galerisi - Google arama anahtarı",
    group: "İhale / Freelancer (pasif)",
    kind: "secret",
    help: "Firma adından iletişim bilgisine ulaşmak için kullanılıyor (bkz. CLAUDE.md tasarlat.com senaryosu).",
  },

  // --- Paralel iş kolu (company-formation-tracker) ---
  {
    key: "trade_registry_api_key",
    label: "Ticaret sicili API anahtarı",
    group: "Yeni şirket / iş arayan tespiti",
    kind: "secret",
    help: "worker: company-formation-tracker - yeni kurulan şirketleri tespit eder.",
  },

  // --- Gönderim kanalları ---
  {
    key: "email_api_key",
    label: "Resend API anahtarı",
    group: "Gönderim kanalları",
    kind: "secret",
    help: "worker: channels/email. Sadece sistem uyarı e-postaları için kullanılıyor - müşteri teklifleri hâlâ manuel (mailto:).",
  },
  {
    key: "email_from_address",
    label: "Gönderen e-posta adresi",
    group: "Gönderim kanalları",
    kind: "text",
    placeholder: "info@ajansim.net",
  },
  {
    key: "whatsapp_token",
    label: "WhatsApp Business API token",
    group: "Gönderim kanalları",
    kind: "secret",
    help: "Şu an hiçbir yerden çağrılmıyor - gönderim manuel (wa.me linki). İleride otomatik gönderime dönülürse hazır dursun diye.",
  },
  {
    key: "whatsapp_phone_number_id",
    label: "WhatsApp Business telefon numarası ID",
    group: "Gönderim kanalları",
    kind: "text",
  },
  {
    key: "voice_provider_api_key",
    label: "Sesli arama sağlayıcı API anahtarı",
    group: "Sesli arama (pasif)",
    kind: "secret",
    help: "Sesli arama modülü feature-flag ile kapalı (voiceCallEnabled).",
  },

  // --- WordPress ajanı (PASİF) ---
  {
    key: "wordpress_sites_json",
    label: "WordPress siteleri (JSON dizisi)",
    group: "WordPress ajanı (pasif)",
    kind: "longtext",
    help: "Kapsamı henüz netleşmedi (bkz. CLAUDE.md) - hangi siteler/işlemler netleşince kullanılacak.",
  },
];
