import { PARALLEL_TRACK, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  TRADE_REGISTRY_API_KEY?: string;
}

/**
 * Yeni kurulan şirketler ve yeni iş arayışında olanları tespit eder.
 * Alfabetik sektör taramasını (google-search-scanner) BEKLEMEDEN,
 * bağımsız bir iş kolu olarak çalışır.
 *
 * TODO (gerçek entegrasyon):
 *   - Ticaret Sicili Gazetesi ilanları / benzeri resmi kaynak (yeni
 *     kurulan şirketler)
 *   - LinkedIn "yeni pozisyon: kurucu" sinyalleri (linkedin worker'ıyla
 *     paylaşılabilir, henüz ayrı kanal olarak kurulmadı)
 *
 * Kaynak tanımlı değilse boş sonuç döner (sahte veri üretmemek için).
 */
export async function scanNewCompanies(env: ScanEnv): Promise<ScanResult[]> {
  if (!env.TRADE_REGISTRY_API_KEY) {
    console.warn(
      `TRADE_REGISTRY_API_KEY tanımlı değil - "${PARALLEL_TRACK.labelTr}" taraması atlandı.`,
    );
    return [];
  }

  // TODO: gerçek kaynak çağrısı.
  return [];
}
