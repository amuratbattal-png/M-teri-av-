import { eq } from "drizzle-orm";
import { createDb, settings } from "../db/client";
import type { Env } from "../env";

export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

const KEY_API_KEY = "nvidia_api_key";
const KEY_MODEL = "nvidia_model";

export interface EffectiveNvidiaSettings {
  apiKey?: string;
  apiKeySource: "panel" | "secret" | "none";
  model: string;
  modelSource: "panel" | "env" | "default";
}

async function readSetting(env: Env, key: string): Promise<string | undefined> {
  const db = createDb(env.DB);
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const value = rows[0]?.value;
  return value ? value : undefined;
}

/**
 * Öncelik apps/control'deki AYNI sıra: panel (D1) > Cloudflare secret/var >
 * sabit varsayılan. Bu, "herşeyi yap, ben sadece apileri panelden
 * eklicem" isteğine karşılık - artık `wrangler secret put NVIDIA_API_KEY`
 * hiç çalıştırılmasa bile panelden girilen anahtar kullanılabiliyor.
 */
export async function getEffectiveNvidiaSettings(env: Env): Promise<EffectiveNvidiaSettings> {
  const [panelKey, panelModel] = await Promise.all([
    readSetting(env, KEY_API_KEY),
    readSetting(env, KEY_MODEL),
  ]);

  const apiKey = panelKey ?? env.NVIDIA_API_KEY;
  const apiKeySource: EffectiveNvidiaSettings["apiKeySource"] = panelKey
    ? "panel"
    : env.NVIDIA_API_KEY
      ? "secret"
      : "none";

  const model = panelModel ?? env.NVIDIA_MODEL ?? DEFAULT_NVIDIA_MODEL;
  const modelSource: EffectiveNvidiaSettings["modelSource"] = panelModel
    ? "panel"
    : env.NVIDIA_MODEL
      ? "env"
      : "default";

  return { apiKey, apiKeySource, model, modelSource };
}

async function upsertSetting(env: Env, key: string, value: string | null): Promise<void> {
  const db = createDb(env.DB);
  const updatedAt = new Date().toISOString();
  await db
    .insert(settings)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });
}

async function deleteSetting(env: Env, key: string): Promise<void> {
  const db = createDb(env.DB);
  await db.delete(settings).where(eq(settings.key, key));
}

export interface UpdateNvidiaSettingsInput {
  apiKey?: string;
  model?: string;
  clearApiKey?: boolean;
  clearModel?: boolean;
}

export async function updateNvidiaSettings(
  env: Env,
  input: UpdateNvidiaSettingsInput,
): Promise<void> {
  if (input.clearApiKey) {
    await deleteSetting(env, KEY_API_KEY);
  } else if (input.apiKey) {
    await upsertSetting(env, KEY_API_KEY, input.apiKey);
  }

  if (input.clearModel) {
    await deleteSetting(env, KEY_MODEL);
  } else if (input.model) {
    await upsertSetting(env, KEY_MODEL, input.model);
  }
}
