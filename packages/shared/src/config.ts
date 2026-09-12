/**
 * Sistem genelinde geçerli feature flag'ler.
 * Başlangıçta sadece 1-2 modül aktif; geri kalanı iskelet halinde hazır.
 */
export interface FeatureFlags {
  /** Sesli arama modülü - mimaride hazır, sahibinin isteğiyle şimdilik kapalı. */
  voiceCallEnabled: boolean;
  activeSourceChannels: string[];
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  voiceCallEnabled: false,
  // Faz 1 baslangici: sadece Google arama tabanli tarama + yeni sirket
  // paralel iş kolu aktif. Diğer kanallar (linkedin, tiktok, instagram,
  // tender_site, freelancer_gallery) worker olarak mevcut ama devreye
  // alınmadı - CLAUDE.md "sonraki adımlar" bölümüne bakın.
  activeSourceChannels: ["google_search", "google_maps"],
};
