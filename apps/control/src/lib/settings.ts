import { eq } from "drizzle-orm";
import { createDb, settings as settingsTable } from "@musteri-avcisi/db";
import type { Env } from "../env";

/**
 * Ayarlar sayfasından düzenlenebilen değerler. D1'deki `settings`
 * tablosunda bir satır varsa o üstün gelir (sahibi paneldeki bir formdan
 * değiştirmiş demektir); yoksa Cloudflare secret/var'a (wrangler.toml,
 * `wrangler secret put`) düşülür; o da yoksa buradaki sabit varsayılana.
 *
 * GÜVENLİK NOTU: NVIDIA_API_KEY, D1'e yazıldığında artık bir Cloudflare
 * Secret değil - düz metin olarak veritabanında duruyor. `wrangler secret
 * put` kadar korumalı değil (D1'e erişimi olan/D1'i dump eden herkes
 * görebilir). Sahibi paneldeki forma anahtar girmeyi seçerek bu ödünleşimi
 * bilerek kabul ediyor - bkz. packages/db/schema.ts `settings` yorumu.
 */

const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";

export const DEFAULT_PROPOSAL_TEMPLATE = [
  "Merhaba {{isim}},",
  "",
  "{{ihtiyac}} konusunda ihtiyacınız olabileceğini fark ettik. Sizin için özel bir teklif hazırlamak isteriz.",
  "",
  "Uygun olduğunuzda kısaca görüşebilir miyiz?",
].join("\n");

export const DEFAULT_AI_SYSTEM_PROMPT = [
  "Sen bir grafik tasarım/web tasarım ajansı için soğuk satış mesajı yazan",
  "bir asistansın. Türkçe, doğal, samimi ama profesyonel bir dille, kısa",
  "(en fazla 5-6 cümle) bir ilk temas mesajı yaz. Şablon/klişe ifadelerden",
  "kaçın ('değerli müşterimiz', 'firmanız' gibi genel kalıplar yerine",
  "işletmenin adını ve sektörünü/şehrini gerçekten kullan). Fiyat/rakam",
  "verme, abartılı satış dili kullanma. Sadece mesaj metnini yaz, başlık,",
  "açıklama ya da tırnak işareti ekleme. WhatsApp veya e-posta ile",
  "gönderilecek, ikisine de uyacak sade bir format kullan (markdown yok).",
].join(" ");

const KEYS = {
  nvidiaApiKey: "nvidia_api_key",
  nvidiaModel: "nvidia_model",
  alertEmail: "alert_email",
  proposalTemplate: "proposal_template",
  aiSystemPrompt: "ai_system_prompt",
} as const;

export interface EffectiveSettings {
  nvidiaApiKey?: string;
  nvidiaApiKeyConfigured: boolean;
  /** Anahtar D1'de mi (panelden ayarlanmış) yoksa Cloudflare secret'tan mı geliyor. */
  nvidiaApiKeySource: "panel" | "secret" | "none";
  nvidiaModel: string;
  alertEmail: string | null;
  proposalTemplate: string;
  aiSystemPrompt: string;
}

async function readSettingsMap(env: Env): Promise<Record<string, string>> {
  const db = createDb(env.DB);
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (typeof row.value === "string" && row.value.length > 0) map[row.key] = row.value;
  }
  return map;
}

export async function getEffectiveSettings(env: Env): Promise<EffectiveSettings> {
  const map = await readSettingsMap(env);

  const panelKey = map[KEYS.nvidiaApiKey];
  const nvidiaApiKey = panelKey || env.NVIDIA_API_KEY;

  return {
    nvidiaApiKey,
    nvidiaApiKeyConfigured: Boolean(nvidiaApiKey),
    nvidiaApiKeySource: panelKey ? "panel" : env.NVIDIA_API_KEY ? "secret" : "none",
    nvidiaModel: map[KEYS.nvidiaModel] || env.NVIDIA_MODEL || DEFAULT_MODEL,
    alertEmail: map[KEYS.alertEmail] || env.ALERT_EMAIL || null,
    proposalTemplate: map[KEYS.proposalTemplate] || DEFAULT_PROPOSAL_TEMPLATE,
    aiSystemPrompt: map[KEYS.aiSystemPrompt] || DEFAULT_AI_SYSTEM_PROMPT,
  };
}

export interface SettingsPatch {
  /** Boş string = değiştirme (yanlışlıkla anahtarı silmemek için). */
  nvidiaApiKey?: string;
  /** Boş string = varsayılana dön (satır silinir). */
  nvidiaModel?: string;
  alertEmail?: string;
  proposalTemplate?: string;
  aiSystemPrompt?: string;
}

async function upsertSetting(env: Env, key: string, value: string): Promise<void> {
  const db = createDb(env.DB);
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

async function deleteSetting(env: Env, key: string): Promise<void> {
  const db = createDb(env.DB);
  await db.delete(settingsTable).where(eq(settingsTable.key, key));
}

export async function updateSettings(env: Env, patch: SettingsPatch): Promise<void> {
  // nvidiaApiKey: boş/undefined = dokunma (yanlışlıkla temizlemeyi önler).
  if (typeof patch.nvidiaApiKey === "string" && patch.nvidiaApiKey.trim()) {
    await upsertSetting(env, KEYS.nvidiaApiKey, patch.nvidiaApiKey.trim());
  }

  // Diğerleri: boş string = varsayılana dön (satırı sil), doluysa güncelle.
  const resettable: Array<[keyof SettingsPatch, string]> = [
    ["nvidiaModel", KEYS.nvidiaModel],
    ["alertEmail", KEYS.alertEmail],
    ["proposalTemplate", KEYS.proposalTemplate],
    ["aiSystemPrompt", KEYS.aiSystemPrompt],
  ];
  for (const [field, dbKey] of resettable) {
    const value = patch[field];
    if (value === undefined) continue;
    if (value.trim() === "") {
      await deleteSetting(env, dbKey);
    } else {
      await upsertSetting(env, dbKey, value);
    }
  }
}

/** Panelden kaydedilmiş NVIDIA anahtarını siler, Cloudflare secret'a döner. */
export async function clearNvidiaApiKey(env: Env): Promise<void> {
  await deleteSetting(env, KEYS.nvidiaApiKey);
}
