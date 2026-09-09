import { SOCIAL_KEYWORDS, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  LINKEDIN_SESSION_COOKIE?: string;
}

/**
 * Bir sonraki anahtar kelime/hashtag için LinkedIn'i tarar.
 *
 * TODO (gerçek entegrasyon): Sahibinin KENDİ profiline gerçek erişimi
 * olan bir mekanizma gerekiyor (bkz. wrangler.toml yorumu). Yerel
 * bilgisayardaki bir yapay zeka değil - bu worker'ın kendisi (Cloudflare
 * üzerinde) erişimi sağlamalı.
 *
 * Kimlik bilgisi tanımlı değilse boş sonuç döner.
 */
export async function scanNextKeyword(
  cursorIndex: number,
  env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number }> {
  const keyword = SOCIAL_KEYWORDS[cursorIndex % SOCIAL_KEYWORDS.length];
  const nextCursorIndex = (cursorIndex + 1) % SOCIAL_KEYWORDS.length;

  if (!env.LINKEDIN_SESSION_COOKIE) {
    console.warn(`LINKEDIN_SESSION_COOKIE tanımlı değil - "${keyword}" taraması atlandı.`);
    return { results: [], nextCursorIndex };
  }

  // TODO: gerçek LinkedIn tarama/mesajlaşma entegrasyonu.
  const results: ScanResult[] = [];

  return { results, nextCursorIndex };
}
