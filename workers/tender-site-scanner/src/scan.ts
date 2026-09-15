import type { ScanResult } from "@musteri-avcisi/shared";

export interface ScanEnv {
  TENDER_SITE_URLS?: string; // virgülle ayrılmış liste
}

/**
 * İhale sitelerinde web sitesi/tasarım/SEO gibi hizmetlere yönelik yeni
 * ilanları tarar. TODO: hedef site(ler) belirlenip her biri için ayrı
 * kazıma (scraping) mantığı yazılmalı - siteler genelde farklı HTML
 * yapıları kullanır, tek bir genel çözüm yeterli olmayabilir.
 */
export async function scanTenders(env: ScanEnv): Promise<ScanResult[]> {
  if (!env.TENDER_SITE_URLS) {
    console.warn("TENDER_SITE_URLS tanımlı değil - ihale sitesi taraması atlandı.");
    return [];
  }

  // TODO: gerçek kazıma/entegrasyon.
  return [];
}
