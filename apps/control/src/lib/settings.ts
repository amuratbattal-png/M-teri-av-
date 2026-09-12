import { eq } from "drizzle-orm";
import { createDb, settings as settingsTable } from "@musteri-avcisi/db";
import type { Env } from "../env";
import { SETTINGS_CATALOG, type SettingFieldDef } from "./settings-catalog";
import { isVerifiable } from "./verify";

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

/**
 * Ham D1 settings map'i - `/internal-settings` (worker'ların panel
 * override'larını okuması için, bkz. packages/shared/src/settings-client.ts)
 * ve Ayarlar sayfasının jenerik katalog bölümü (bkz. settings-catalog.ts)
 * bunu kullanır.
 */
export async function readSettingsMap(env: Env): Promise<Record<string, string>> {
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
  const updatedAt = new Date().toISOString();
  // `updatedAt` canlı D1'de NOT NULL bir sütun - bkz. packages/db/schema.ts
  // `settings` yorumu ("Ayarları Kaydet hatası" olayı, CLAUDE.md). Her
  // yazımda mutlaka gönderilmeli, aksi halde SQLITE_CONSTRAINT_NOTNULL.
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt } });
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

// --- Jenerik katalog (bkz. settings-catalog.ts) ----------------------------

export interface CatalogFieldView {
  key: string;
  label: string;
  group: string;
  kind: SettingFieldDef["kind"];
  placeholder?: string;
  help?: string;
  /** Panelde tanımlı mı. `secret` alanlarda gerçek değer hiçbir zaman dönmez. */
  configured: boolean;
  /**
   * `text`/`longtext` alanlarda mevcut değer (düzenleme formunu doldurmak
   * için - bu alanlar zaten gizli değil). `secret` alanlarda hep undefined.
   */
  value?: string;
  /** Gerçek bir "Doğrula" kontrolü var mı - bkz. lib/verify.ts. */
  verifiable: boolean;
}

/**
 * Katalogdaki her alanın şu anki durumunu döndürür - control, bu
 * anahtarların hangi worker'ın kendi env'inde tanımlı olduğunu BİLEMEZ
 * (o worker'ın secret'ı, control'ün değil), o yüzden `configured` sadece
 * "panelde (D1'de) bir değer var mı" anlamına gelir. Panelde yoksa ilgili
 * worker kendi Cloudflare secret'ına düşer - bu, UI'da ayrıca belirtiliyor.
 */
export async function getCatalogView(env: Env): Promise<CatalogFieldView[]> {
  const map = await readSettingsMap(env);
  return SETTINGS_CATALOG.map((field) => {
    const raw = map[field.key];
    return {
      key: field.key,
      label: field.label,
      group: field.group,
      kind: field.kind,
      placeholder: field.placeholder,
      help: field.help,
      configured: Boolean(raw),
      value: field.kind === "secret" ? undefined : raw,
      verifiable: isVerifiable(field.key),
    };
  });
}

/**
 * Ayarlar formundaki jenerik katalog alanları için toplu güncelleme.
 * `secret` alanlar boşsa dokunulmaz (yanlışlıkla silinmesin diye); diğer
 * alanlar boşsa satır silinir (worker kendi env fallback'ine döner).
 */
export async function updateCatalogFields(env: Env, fields: Record<string, string>): Promise<void> {
  const byKey = new Map(SETTINGS_CATALOG.map((f) => [f.key, f]));
  for (const [key, rawValue] of Object.entries(fields)) {
    const def = byKey.get(key);
    if (!def) continue; // katalogda olmayan bilinmeyen bir alan - sessizce yok say
    const value = rawValue.trim();
    if (def.kind === "secret") {
      if (value) await upsertSetting(env, key, value);
      continue;
    }
    if (value) {
      await upsertSetting(env, key, value);
    } else {
      await deleteSetting(env, key);
    }
  }
}
