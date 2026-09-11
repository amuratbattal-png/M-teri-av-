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
 * Ayarlar sayfasından düzenlenebilen değerler (NVIDIA API anahtarı, model
 * adı, uyarı e-postası, teklif şablonu, AI sistem talimatı) - basit
 * key/value tablosu. Bir satırın olmaması "varsayılana dön" demek
 * (bkz. apps/control/src/lib/settings.ts `getEffectiveSettings`).
 *
 * GÜVENLİK NOTU: NVIDIA_API_KEY buraya yazıldığında Cloudflare Secret
 * korumasından (şifreli, sadece runtime'da erişilebilir) çıkıp düz D1
 * satırına döner - `wrangler secret put` kadar güvenli değil. Bilinçli bir
 * ödünleşim: sahibi anahtarı panelden değiştirebilsin diye. D1'deki bir
 * satır varsa o üstün gelir, yoksa env secret'a (wrangler secret put)
 * düşülür.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
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
