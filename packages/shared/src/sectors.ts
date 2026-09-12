/**
 * Sektör tarama listesi.
 *
 * Karar: belirli bir hedef sektör/bütçe aralığı seçmek yerine, sektörler
 * alfabetik sırayla (A -> Z) taranır. Bu liste başlangıç seti olarak
 * tutulur ve genişletilebilir; sıralama tarama önceliğini belirler.
 *
 * "yeni_sirket_ve_is_arayan" özel bir sektör DEĞİLDİR - alfabetik taramadan
 * bağımsız, PARALEL ilerleyen ayrı bir iş kolu olarak `PARALLEL_TRACK` ile
 * temsil edilir (bkz. CLAUDE.md).
 */
export interface Sector {
  /** Alfabetik sıralama anahtarı (Türkçe, büyük harf, aksansız). */
  letter: string;
  slug: string;
  labelTr: string;
}

export const SECTORS: Sector[] = [
  { letter: "A", slug: "avukatlik-hukuk", labelTr: "Avukatlık / Hukuk Büroları" },
  { letter: "A", slug: "arac-kiralama", labelTr: "Araç Kiralama" },
  { letter: "B", slug: "berber-kuafor", labelTr: "Berber / Kuaför" },
  { letter: "B", slug: "butik-giyim", labelTr: "Butik / Giyim Mağazaları" },
  { letter: "C", slug: "catering", labelTr: "Catering / Yemek Firmaları" },
  { letter: "D", slug: "diş-klinigi", labelTr: "Diş Klinikleri" },
  { letter: "D", slug: "danismanlik", labelTr: "Danışmanlık Firmaları" },
  { letter: "E", slug: "emlak", labelTr: "Emlak Ofisleri" },
  { letter: "E", slug: "elektrik-tesisat", labelTr: "Elektrik / Tesisat" },
  { letter: "F", slug: "fitness-spor-salonu", labelTr: "Fitness / Spor Salonları" },
  { letter: "G", slug: "guzellik-merkezi", labelTr: "Güzellik Merkezleri" },
  { letter: "H", slug: "hastane-ozel-klinik", labelTr: "Özel Hastane / Klinik" },
  { letter: "I", slug: "insaat-firmasi", labelTr: "İnşaat Firmaları" },
  { letter: "İ", slug: "ic-mimarlik", labelTr: "İç Mimarlık" },
  { letter: "J", slug: "jeneratör-endustri", labelTr: "Jeneratör / Endüstriyel Ekipman" },
  { letter: "K", slug: "kafe-restoran", labelTr: "Kafe / Restoran" },
  { letter: "L", slug: "lojistik-nakliyat", labelTr: "Lojistik / Nakliyat" },
  { letter: "M", slug: "mobilya", labelTr: "Mobilya Üretim / Satış" },
  { letter: "N", slug: "noterlik", labelTr: "Noterlik" },
  { letter: "O", slug: "otomotiv-servis", labelTr: "Otomotiv Servis" },
  { letter: "Ö", slug: "ozel-egitim-kurs", labelTr: "Özel Eğitim / Kurs Merkezleri" },
  { letter: "P", slug: "pazarlama-ajansi", labelTr: "Pazarlama Ajansları" },
  { letter: "R", slug: "reklamcilik", labelTr: "Reklamcılık" },
  { letter: "S", slug: "saglik-turizmi", labelTr: "Sağlık Turizmi" },
  { letter: "T", slug: "tekstil-uretim", labelTr: "Tekstil Üretim" },
  { letter: "U", slug: "ulasim-firmalari", labelTr: "Ulaşım Firmaları" },
  { letter: "Ü", slug: "uretim-fabrika", labelTr: "Üretim / Fabrika" },
  { letter: "V", slug: "veteriner-klinigi", labelTr: "Veteriner Klinikleri" },
  { letter: "Y", slug: "yazilim-firmasi", labelTr: "Yazılım Firmaları" },
  { letter: "Z", slug: "zirai-tarim", labelTr: "Zirai / Tarım İşletmeleri" },
];

/**
 * Alfabetik taramadan bağımsız, paralel ilerleyen özel iş kolu:
 * yeni kurulan şirketler ve yeni iş arayışında olanlar.
 */
export const PARALLEL_TRACK = {
  slug: "yeni-sirket-ve-is-arayan",
  labelTr: "Yeni Şirket Kuranlar / Yeni İş Arayışında Olanlar",
} as const;
