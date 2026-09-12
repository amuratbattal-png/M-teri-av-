import { desc, sql } from "drizzle-orm";
import { createDb, activityLog } from "@musteri-avcisi/db";
import type { Env } from "../env";

export type ActivityLevel = "info" | "warn" | "error";

/** Terminal sayfasında gösterilecek maksimum satır (bkz. handleGetActivity). */
export const ACTIVITY_LOG_DISPLAY_LIMIT = 200;

/**
 * Tablonun sınırsız büyümesini önlemek için: her yazımda küçük bir
 * ihtimalle (yaklaşık 1/20) eski satırları budar - her yazımda ayrı bir
 * DELETE sorgusu çalıştırıp gecikme eklemek istemediğimiz için olasılıksal.
 * D1'in ücretsiz katmanında bu boyutta satırlar (~100-200 byte) için pratik
 * bir sorun değil, ama sınırsız birikmesin diye bu kadarı yeterli.
 */
const MAX_ROWS = 2000;
const PRUNE_PROBABILITY = 0.05;

/**
 * "Canlı log" - sahibinin "yapay zekanın çalıştığını nereden anlıyoruz"
 * sorusuna cevap: her lead puanlama/teklif yazımı/tarama sonucu burada
 * kısa, insan-okunur bir satır olarak birikir, dashboard'daki Terminal
 * sayfası (`/terminal`) bunu okur. `wrangler tail`in yerine geçmez - o
 * HER şeyi (ham istek/yanıt dahil) gösterir, bu sadece "AI ne yaptı,
 * ne karar verdi" özeti.
 *
 * Kendi başına ASLA ana akışı bozmaz - insert başarısız olursa
 * (ör. migration henüz uygulanmadıysa) sessizce console.error'a düşer,
 * hatayı yutar.
 */
export async function logActivity(
  env: Env,
  level: ActivityLevel,
  source: string,
  message: string,
): Promise<void> {
  try {
    const db = createDb(env.DB);
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      level,
      source,
      message,
    });

    if (Math.random() < PRUNE_PROBABILITY) {
      // Basit budama: en yeni MAX_ROWS satır dışındakileri sil.
      await db.run(sql`
        DELETE FROM activity_log WHERE id NOT IN (
          SELECT id FROM activity_log ORDER BY created_at DESC LIMIT ${MAX_ROWS}
        )
      `);
    }
  } catch (err) {
    // logActivity'nin kendisi hiçbir zaman ana akışı (aday kaydetme,
    // teklif üretme) durdurmamalı - ör. 0004_activity_log.sql migration'ı
    // henüz uygulanmadıysa "no such table" hatası burada sessizce yutulur.
    console.error("logActivity başarısız (ana akış etkilenmedi)", err);
  }
}

export interface ActivityEntry {
  id: string;
  createdAt: string;
  level: string;
  source: string;
  message: string;
}

export async function readRecentActivity(env: Env): Promise<ActivityEntry[]> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(ACTIVITY_LOG_DISPLAY_LIMIT);
  return rows;
}

/**
 * Dashboard'daki Terminal sayfasının okuduğu endpoint (`GET /activity`).
 * Migration henüz uygulanmadıysa (`activity_log` tablosu yoksa) hata
 * fırlatmak yerine boş bir liste döner - sayfa "henüz kayıt yok"
 * gösterir, çökmez.
 */
export async function handleGetActivity(env: Env): Promise<Response> {
  let entries: ActivityEntry[] = [];
  try {
    entries = await readRecentActivity(env);
  } catch (err) {
    console.error("activity_log okunamadı (migration uygulanmamış olabilir)", err);
  }
  return new Response(JSON.stringify({ entries }), {
    headers: { "content-type": "application/json" },
  });
}
