import { SECTORS, searchYahoo, type ScanResult, type NeedTag } from "@musteri-avcisi/shared";

/**
 * Yahoo'nun resmi/ücretsiz bir arama API'si YOK - eskiden "Yahoo BOSS"
 * (Build your Own Search Service) vardı, yıllar önce kapatıldı. Bu
 * yüzden bu kanal artık bir API ANAHTARI GEREKTİRMİYOR - bkz. CLAUDE.md
 * "Yahoo kazıma" notu. Asıl kazıma mantığı (`searchYahoo`) artık
 * `@musteri-avcisi/shared`'de - `google-search-scanner` da AYNI
 * fonksiyonu bulunan firmaların adını arayıp hakkında bilgi toplamak
 * için kullanıyor (bkz. CLAUDE.md "firma adını Yahoo'da arattır" notu).
 *
 * CANLI TEST SONUCU (bkz. CLAUDE.md): Yahoo, otomatik istekleri
 * SORGUYA BAKMAKSIZIN sistematik olarak engelliyor (`_bv/v.gif`
 * doğrulama döngüsü, 2/2 denemede aynı hata) - bu kanal şu an
 * fiilen ETKİSİZ ama zararsız (aday oluşturmuyor, sadece boşuna bir
 * istek atıyor).
 */
export interface ScanEnv {
  // Kasıtlı olarak boş - artık bir kimlik bilgisi/anahtar gerekmiyor.
  // (Eski YAHOO_SEARCH_API_KEY hâlâ Ayarlar katalogda duruyor ama
  // kullanılmıyor - bkz. apps/control/src/lib/settings-catalog.ts.)
}

export interface ScanDebugInfo {
  sectorLabel: string;
  query: string;
  resultsFound: number;
  apiError?: string;
  /** Parser hiç sonuç bulamazsa (büyük ihtimalle bot duvarı) ham HTML'in bir kısmı - teşhis için. */
  rawSample?: string;
}

/**
 * Sektörler arasında sırayla ilerler - google-search-scanner'ın
 * "google_search" kanalıyla AYNI sorgu deseni ("yeni açıldı"/"web sitesi
 * yaptırmak istiyorum" gibi ifadeler). Sektör × şehir matrisi DEĞİL -
 * ilk basit sürüm.
 */
export async function scanNextSector(
  cursorSectorIndex: number,
  _env: ScanEnv,
): Promise<{ results: ScanResult[]; nextCursorIndex: number; debug: ScanDebugInfo }> {
  const sector = SECTORS[cursorSectorIndex % SECTORS.length];
  const nextCursorIndex = (cursorSectorIndex + 1) % SECTORS.length;
  const query = `"${sector.labelTr}" ("yeni açıldı" OR "web sitesi yaptırmak istiyorum" OR "sitemizi yenilemek istiyoruz")`;

  const { results: yahooResults, apiError, rawSample } = await searchYahoo(query);

  const results: ScanResult[] = yahooResults.map((r) => ({
    name: r.title,
    sectorSlug: sector.slug,
    sourceChannel: "yahoo_search",
    sourceUrl: r.url,
    // Arama sonucundan gelen bir sonuç için en güvenli varsayım "web
    // sitesi ihtiyacı" sinyali - google-search-scanner'ın "google_search"
    // kanalıyla aynı mantık, gerçek ihtiyaç türü içerik okunmadan
    // kesinleştirilemez.
    needTags: ["website_new"] as NeedTag[],
    rawMetadata: r.snippet ? { snippet: r.snippet } : undefined,
  }));

  return {
    results,
    nextCursorIndex,
    debug: { sectorLabel: sector.labelTr, query, resultsFound: results.length, apiError, rawSample },
  };
}
