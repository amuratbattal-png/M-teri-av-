/**
 * Aday firmaların/kişilerin ihtiyaç türü etiketleri.
 * Merkezi veritabanında her aday, bir veya birden fazla etiketle işaretlenir
 * (ayrı bir "ihtiyaç türüne göre aday DB'si" yok - tek merkezi tablo).
 */
export const NEED_TAGS = [
  "website_new",
  "website_redesign",
  "logo",
  "corporate_identity",
  "seo",
  "ecommerce_stock",
  "social_media_management",
  "brand_management",
  "poster_design",
  "brochure_design",
  "visual_identity",
  "vehicle_wrap",
  "bus_wrap",
  "video_editing",
] as const;

export type NeedTag = (typeof NEED_TAGS)[number];

export const NEED_TAG_LABELS_TR: Record<NeedTag, string> = {
  website_new: "Yeni web sitesi",
  website_redesign: "Web sitesi yenileme",
  logo: "Logo tasarımı",
  corporate_identity: "Kurumsal kimlik",
  seo: "SEO",
  ecommerce_stock: "E-ticaret ve stok yönetimi",
  social_media_management: "Sosyal medya yönetimi",
  brand_management: "Marka yönetimi",
  poster_design: "Afiş tasarımı",
  brochure_design: "Broşür tasarımı",
  visual_identity: "Görsel kimlik tasarımı",
  vehicle_wrap: "Araç giydirme",
  bus_wrap: "Otobüs giydirme",
  video_editing: "Video kurgu",
};
