import { SECTORS, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  SEARCH_API_KEY?: string;
}

/**
 * Google arama/Maps üzerinden bir sonraki sırad aki sektörü tarar.
 *
 * TODO (gerçek entegrasyon): SEARCH_API_KEY tanımlıysa Google Places API
 * veya SerpApi gibi bir sağlayıcı çağrılıp şunlar aranmalı:
 *   - o sektörde yeni kurulmuş şirketler
 *   - web sitesi eski / mobil uyumsuz olan firmalar (ör. sayfa
 *     kaynağında eski framework/işaretleri arayarak)
 *   - "web sitesi yaptır", "logo tasarım" gibi arama hacmi taşıyan
 *     sorgularla eşleşen yerel işletmeler
 *
 * API anahtarı tanımlı değilse (yerel geliştirme / henüz kurulmadıysa)
 * boş sonuç döner - bu bilinçli bir davranış, sahte veri üretip merkezi
 * tabloyu kirletmemek için.
 */
export async function scanNextSector(
  cursorSectorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number }> {
  const sector = SECTORS[cursorSectorIndex % SECTORS.length];
  const nextCursorIndex = (cursorSectorIndex + 1) % SECTORS.length;

  if (!env.SEARCH_API_KEY) {
    console.warn(
      `SEARCH_API_KEY tanımlı değil - "${sector.labelTr}" sektörü için gerçek tarama atlandı.`,
    );
    return { results: [], nextCursorIndex };
  }

  // TODO: gerçek Google arama/Maps API çağrısı buraya.
  const results: ScanResult[] = [];

  return { results, nextCursorIndex };
}
