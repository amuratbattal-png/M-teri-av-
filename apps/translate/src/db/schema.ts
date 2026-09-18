import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Yönetim panelinden eklenen/silinen konuşmacılar. */
export const speakers = sqliteTable("speakers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Bir çeviri oturumu. `joinCode` katılımcı linkinde/QR kodunda kullanılan
 * kısa, insan tarafından okunabilir kod (`/join/:joinCode`); `speakerToken`
 * ise konuşmacı ekranının (`/speak/:sessionId?token=...`) linkindeki
 * paylaşılan sır - basit bir kimlik doğrulama, panel şifresi gibi
 * korunmuyor çünkü bu link doğrudan konuşmacının cihazına verilecek.
 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  joinCode: text("join_code").notNull(),
  title: text("title").notNull(),
  speakerId: text("speaker_id").notNull(),
  sourceLang: text("source_lang").notNull().default("tr"),
  speakerToken: text("speaker_token").notNull(),
  status: text("status").notNull().default("active"), // active | ended
  createdAt: text("created_at").notNull(),
  endedAt: text("ended_at"),
});

/**
 * Konuşmacının söylediği her bitmiş (final) cümle. `translations`,
 * o cümlenin o ana kadar istenmiş hedef dillere çevirisinin önbelleği
 * (bkz. apps/translate/src/durable-object.ts) - aynı dile ihtiyaç duyan
 * her yeni katılımcı için NVIDIA'yı tekrar çağırmamak için.
 */
export const transcriptEntries = sqliteTable("transcript_entries", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  seq: integer("seq").notNull(),
  sourceText: text("source_text").notNull(),
  sourceLang: text("source_lang").notNull(),
  translations: text("translations", { mode: "json" })
    .notNull()
    .$type<Record<string, string>>(),
  createdAt: text("created_at").notNull(),
});
