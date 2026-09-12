import { SOCIAL_KEYWORDS, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  INSTAGRAM_API_KEY?: string;
}

/**
 * Bir sonraki anahtar kelime/hashtag için Instagram'ı tarar.
 * TODO (gerçek entegrasyon): Instagram Graph API (işletme hesabı) ya da
 * üçüncü parti tarama servisi. Kimlik bilgisi tanımlı değilse boş sonuç
 * döner.
 */
export async function scanNextKeyword(
  cursorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number }> {
  const keyword = SOCIAL_KEYWORDS[cursorIndex % SOCIAL_KEYWORDS.length];
  const nextCursorIndex = (cursorIndex + 1) % SOCIAL_KEYWORDS.length;

  if (!env.INSTAGRAM_API_KEY) {
    console.warn(`INSTAGRAM_API_KEY tanımlı değil - "${keyword}" taraması atlandı.`);
    return { results: [], nextCursorIndex };
  }

  // TODO: gerçek Instagram tarama entegrasyonu.
  const results: ScanResult[] = [];

  return { results, nextCursorIndex };
}
