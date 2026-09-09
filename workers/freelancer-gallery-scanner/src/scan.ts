import { PARALLEL_TRACK, type ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  GALLERY_SOURCE_URLS?: string;
  SEARCH_API_KEY?: string;
}

interface GalleryEntry {
  companyName: string;
  galleryUrl: string;
  /** Örn. logo/kurumsal kimlik tespit edildi ama web sitesi bulunamadı gibi ipuçları. */
  detectedNeed: "logo" | "corporate_identity" | "unknown";
}

/**
 * ADIM 1: Freelancer platformlarının HERKESE AÇIK galeri sayfalarından
 * firma adını tespit eder. Ücretli platformların gizli kullanıcı
 * bilgisini çekme YÖNTEMİ KULLANILMAZ (bkz. CLAUDE.md kararı) - sadece
 * herkese açık galeri/portfolyo sayfaları taranır.
 *
 * TODO: gerçek kazıma (scraping) mantığı - platforma özel HTML yapısı
 * gerektirir.
 */
async function listPublicGalleryEntries(env: ScanEnv): Promise<GalleryEntry[]> {
  if (!env.GALLERY_SOURCE_URLS) {
    console.warn("GALLERY_SOURCE_URLS tanımlı değil - galeri taraması atlandı.");
    return [];
  }
  // TODO: gerçek galeri kazıma entegrasyonu.
  return [];
}

/**
 * ADIM 2: Tespit edilen firma adı için Google üzerinden ayrıca iletişim
 * bilgisine ulaşılır (bkz. CLAUDE.md - örnek senaryo: yeni logo yaptırmış
 * ama henüz web sitesi olmayan firmaya web sitesi teklifi).
 *
 * TODO: gerçek Google arama entegrasyonu (google-search-scanner ile aynı
 * sağlayıcı kullanılabilir).
 */
async function enrichContactViaGoogle(
  entry: GalleryEntry,
  env: ScanEnv,
): Promise<Pick<ScanResult, "contactEmail" | "contactPhone" | "sourceUrl"> | null> {
  if (!env.SEARCH_API_KEY) return null;
  // TODO: gerçek arama çağrısı.
  return null;
}

export async function scanFreelancerGalleries(env: ScanEnv): Promise<ScanResult[]> {
  const entries = await listPublicGalleryEntries(env);
  const results: ScanResult[] = [];

  for (const entry of entries) {
    const contact = await enrichContactViaGoogle(entry, env);
    results.push({
      name: entry.companyName,
      sectorSlug: PARALLEL_TRACK.slug,
      sourceChannel: "freelancer_gallery",
      sourceUrl: contact?.sourceUrl ?? entry.galleryUrl,
      needTags:
        entry.detectedNeed === "unknown"
          ? []
          : entry.detectedNeed === "logo"
            ? ["logo", "website_new"]
            : ["corporate_identity", "website_new"],
      contactEmail: contact?.contactEmail ?? null,
      contactPhone: contact?.contactPhone ?? null,
      rawMetadata: { galleryUrl: entry.galleryUrl },
    });
  }

  return results;
}
