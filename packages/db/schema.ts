import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * TEK MERKEZİ ADAY TABLOSU.
 *
 * Karar: ihtiyaç türüne göre ayrı tablolar/veritabanları YOK. Her aday
 * (firma/kişi) burada tek satır olarak durur; ihtiyaç türü `needTags`
 * JSON dizisiyle etiketlenir (web sitesi, logo, SEO, ...).
 * Kaynağı fark etmeksizin (Google, LinkedIn, freelancer galerisi, ...)
 * her worker aynı tabloya yazar.
 */
export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** packages/shared/src/sectors.ts içindeki slug ya da PARALLEL_TRACK.slug */
  sectorSlug: text("sector_slug").notNull(),
  sourceChannel: text("source_channel").notNull(),
  sourceUrl: text("source_url"),
  /**
   * İşletmenin KENDİ web sitesi (varsa) - `sourceUrl`'den ayrı tutulur,
   * çünkü sourceUrl bazen (website yoksa) bir Google Maps arama linkine
   * düşüyor. Bu alan sadece gerçek bir site bulunduysa dolu olur -
   * dashboard'da net bir "Web sitesi" satırı göstermek için.
   */
  websiteUrl: text("website_url"),
  country: text("country").notNull().default("TR"),
  /** NeedTag[] JSON dizisi */
  needTags: text("need_tags", { mode: "json" }).notNull().$type<string[]>(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactWhatsapp: text("contact_whatsapp"),
  contactLinkedin: text("contact_linkedin"),
  discoveredAt: text("discovered_at").notNull(),
  status: text("status").notNull().default("discovered"),
  evaluationNotes: text("evaluation_notes"),
  /** "YYYY-MM-DD" - sahibinin "ay sonu tekrar ara" gibi notlara eklediği takip tarihi. Dashboard'daki Takip sayfası bunu okur. */
  followUpDate: text("follow_up_date"),
  /** Sahibinin kendi serbest etiketleri ("sıcak lead" vb.) - need tag'lerden bağımsız, string[] JSON. */
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  /** true ise dashboard gönderim linklerini/aksiyonlarını hiç göstermez - "bir daha iletişime geçme" işareti. */
  doNotContact: integer("do_not_contact", { mode: "boolean" }).notNull().default(false),
  proposalDraft: text("proposal_draft"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  sentAt: text("sent_at"),
  lastContactChannel: text("last_contact_channel"),
  /** Ham kaynak verisi (scraping çıktısı vb.) - hata ayıklama ve tekrar işleme için. */
  rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>(),
});

/**
 * İletişim geçmişi. Her gönderim/yanıt burada loglanır - onay akışının
 * denetlenebilir kaydı budur (kim ne zaman ne gönderdi).
 */
export const communicationLog = sqliteTable("communication_log", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  channel: text("channel").notNull(),
  direction: text("direction").notNull(), // "outbound" | "inbound"
  content: text("content").notNull(),
  status: text("status").notNull().default("queued"),
  createdAt: text("created_at").notNull(),
});

/**
 * Aday zaman çizelgesi - onay/red/not/gönderim gibi her aksiyon burada
 * kronolojik iz bırakır. Dashboard'daki popup'ta "Geçmişi Göster"
 * butonuyla lazy-load edilir (her sayfa yüklemesinde otomatik çekilmez).
 */
export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  /** ör. "created" | "approved" | "rejected" | "notes_updated" | "proposal_updated" | "ai_regenerated" | "marked_sent" */
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: text("created_at").notNull(),
});

/**
 * Tarama ilerleme takibi: alfabetik sektör taraması nerede kaldı,
 * paralel iş kolu (yeni şirket / iş arayan) ayrı satırda ilerler.
 */
export const scanProgress = sqliteTable("scan_progress", {
  /** sectorSlug ya da PARALLEL_TRACK.slug */
  trackSlug: text("track_slug").primaryKey(),
  sourceChannel: text("source_channel").notNull(),
  lastScannedAt: text("last_scanned_at"),
  cursor: text("cursor"), // kaynak API'nin sayfalama/cursor bilgisi
  status: text("status").notNull().default("pending"), // pending | in_progress | done
});

/**
 * Basit key/value ayar deposu - dashboard'daki Ayarlar sayfasının
 * düzenlediği, kod deploy etmeden değişebilecek davranış ayarları
 * (teklif metni şablonu, AI sistem promptu, AI aç/kapat vb.).
 *
 * KASITLI OLARAK burada tutulmayanlar: API anahtarları / secret'lar
 * (NVIDIA_API_KEY, SCAN_SHARED_SECRET, vb.) - bunlar Cloudflare secret
 * olarak kalmaya devam eder, D1'de düz metin olarak saklanmaz (bkz.
 * güvenlik denetimi notları, CLAUDE.md).
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
