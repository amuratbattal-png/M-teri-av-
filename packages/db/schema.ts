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
  /** AI'ın 1-5 yıldız lead kalite puanı (bkz. apps/control/src/lib/relevance.ts) - NULL = hiç puanlanmadı. */
  aiScore: integer("ai_score"),
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
/**
 * BİLİNEN ŞEMA UYUMSUZLUĞU (çözüldü, bkz. CLAUDE.md "Ayarları Kaydet
 * hatası" notu): canlı D1'deki `settings` tablosunda `updated_at` NOT
 * NULL bir sütun zaten vardı - muhtemelen `0002_settings.sql`'deki
 * `CREATE TABLE IF NOT EXISTS` çalıştığında tablo başka bir şemayla
 * (bu sütunla) zaten mevcuttu, bu yüzden migration hiçbir şey
 * değiştirmedi. Kod bu sütunu hiç bilmediği için her `INSERT` bir
 * `SQLITE_CONSTRAINT_NOTNULL` hatasıyla patlıyordu. Çözüm: canlıdaki
 * gerçekliği burada da tanımlamak - her yazımda `updatedAt` gönderiliyor
 * (bkz. apps/control/src/lib/settings.ts upsertSetting).
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at").notNull(),
});

/**
 * "Canlı log" - dashboard'daki Terminal sayfasının okuduğu, AI'ın
 * (lead puanlama, teklif yazımı) ve taramanın ne yaptığını gösteren
 * kısa insan-okunur olay kaydı (bkz. apps/control/src/lib/activity-log.ts
 * logActivity). Sahibi "yapay zekanın çalıştığını nereden anlıyoruz"
 * dedi - `wrangler tail`e bakmadan (Cloudflare hesabına giriş
 * gerektiriyor, canlı bir terminal oturumu) görebileceği bir yer.
 * `wrangler tail`in YERİNE geçmiyor - sadece önemli olayların kısa bir
 * özeti, tüm console.log çıktısı değil.
 */
export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  /** "info" | "warn" | "error" - dashboard'da renklendirme için. */
  level: text("level").notNull().default("info"),
  /** "lead-quality" | "proposal" | "scan" | "system" vb. - hangi bileşenden geldiği. */
  source: text("source").notNull(),
  message: text("message").notNull(),
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
