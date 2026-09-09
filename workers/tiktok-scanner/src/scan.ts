import { SOCIAL_KEYWORDS, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  TIKTOK_API_KEY?: string;
}

/**
 * Bir sonraki anahtar kelime/hashtag için TikTok'u tarar.
 * TODO (gerçek entegrasyon): resmi TikTok API'si ya da üçüncü parti
 * tarama servisi. Kimlik bilgisi tanımlı değilse boş sonuç döner.
 */
export async function scanNextKeyword(
  cursorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number }> {
  const keyword = SOCIAL_KEYWORDS[cursorIndex % SOCIAL_KEYWORDS.length];
  const nextCursorIndex = (cursorIndex + 1) % SOCIAL_KEYWORDS.length;

  if (!env.TIKTOK_API_KEY) {
    console.warn(`TIKTOK_API_KEY tanımlı değil - "${keyword}" taraması atlandı.`);
    return { results: [], nextCursorIndex };
  }

  // TODO: gerçek TikTok tarama entegrasyonu.
  const results: ScanResult[] = [];

  return { results, nextCursorIndex };
}
