/**
 * Tarama/gönderim worker'larının, sahibinin Ayarlar panelinden
 * kaydettiği API anahtarı/değer override'larını `apps/control`'den
 * okuması için ortak istemci. control'ün D1 `settings` tablosunda bir
 * değer varsa (panelden girilmiş) worker onu kullanır, yoksa kendi
 * Cloudflare secret/var'ına (wrangler.toml, `wrangler secret put`)
 * düşer - bkz. apps/control/src/lib/settings.ts, settings-catalog.ts.
 *
 * HATA TOLERANSLI: control'e erişilemezse (ağ hatası, henüz deploy
 * edilmemiş, vb.) sessizce boş obje döner - worker'lar zaten kendi
 * env fallback'lerine düşecek şekilde yazılmalı, hiçbir tarama bu
 * yüzden durmamalı.
 */
export async function fetchSettingsOverrides(
  controlWorker: Fetcher,
  scanSharedSecret: string,
): Promise<Record<string, string>> {
  try {
    const res = await controlWorker.fetch("https://internal/internal-settings", {
      headers: { "x-scan-secret": scanSharedSecret?.trim() ?? "" },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { settings?: Record<string, string> };
    return data.settings ?? {};
  } catch (err) {
    console.error("Ayarlar override'ları control'den okunamadı - kendi env'e düşülüyor", err);
    return {};
  }
}
