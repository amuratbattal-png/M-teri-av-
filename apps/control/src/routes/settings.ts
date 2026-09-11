import { DEFAULT_FEATURE_FLAGS } from "@musteri-avcisi/shared";
import type { Env } from "../env";
import {
  getEffectiveSettings,
  updateSettings,
  clearNvidiaApiKey,
  getCatalogView,
  updateCatalogFields,
  readSettingsMap,
} from "../lib/settings";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * "Ayarlar" sayfası için sistem bilgisi + düzenlenebilir alanların şu anki
 * değeri. NVIDIA_API_KEY'in KENDİSİ hiçbir zaman döndürülmez - sadece
 * tanımlı olup olmadığı (`nvidiaApiKeyConfigured`) ve kaynağı
 * ("panel"den mi yoksa Cloudflare secret'tan mı geliyor). Aynı kural
 * `catalog`'daki tüm `secret` alanlar için de geçerli - bkz.
 * lib/settings.ts getCatalogView.
 */
export async function handleGetSettings(env: Env): Promise<Response> {
  const s = await getEffectiveSettings(env);
  const catalog = await getCatalogView(env);
  return json({
    activeSourceChannels: DEFAULT_FEATURE_FLAGS.activeSourceChannels,
    voiceCallEnabled: DEFAULT_FEATURE_FLAGS.voiceCallEnabled,
    nvidiaModel: s.nvidiaModel,
    nvidiaApiKeyConfigured: s.nvidiaApiKeyConfigured,
    nvidiaApiKeySource: s.nvidiaApiKeySource,
    alertEmail: s.alertEmail,
    proposalTemplate: s.proposalTemplate,
    aiSystemPrompt: s.aiSystemPrompt,
    catalog,
  });
}

/**
 * Ayarlar sayfasındaki formdan gelen güncelleme - bkz. lib/settings.ts
 * updateSettings için alan bazlı kurallar (nvidiaApiKey boşsa dokunulmaz,
 * diğerleri boşsa varsayılana döner). `{ clearNvidiaApiKey: true }`
 * gönderilirse panelden kaydedilmiş anahtar silinir (Cloudflare secret'a
 * geri dönülür). `fields`, sistemdeki diğer tüm API anahtarları/değerleri
 * için jenerik katalog patch'i (bkz. lib/settings.ts settings-catalog.ts).
 */
export async function handlePostSettings(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    nvidiaApiKey?: string;
    nvidiaModel?: string;
    alertEmail?: string;
    proposalTemplate?: string;
    aiSystemPrompt?: string;
    clearNvidiaApiKey?: boolean;
    fields?: Record<string, string>;
  };

  if (body.clearNvidiaApiKey) {
    await clearNvidiaApiKey(env);
  }

  await updateSettings(env, {
    nvidiaApiKey: body.nvidiaApiKey,
    nvidiaModel: body.nvidiaModel,
    alertEmail: body.alertEmail,
    proposalTemplate: body.proposalTemplate,
    aiSystemPrompt: body.aiSystemPrompt,
  });

  if (body.fields && typeof body.fields === "object") {
    await updateCatalogFields(env, body.fields);
  }

  return json({ ok: true });
}

/**
 * Worker'ların (google-search-scanner, company-formation-tracker,
 * channels/email vb.) panelden ayarlanmış override'ları okuması için -
 * bkz. packages/shared/src/settings-client.ts fetchSettingsOverrides.
 * `/scan-results` ile aynı auth deseni (SCAN_SHARED_SECRET) - dışarıya
 * açık değil, sadece worker-worker service binding üzerinden çağrılıyor.
 * Ham D1 map'ini döner (NVIDIA gibi zaten ayrı bir yoldan yönetilenler
 * dahil hepsi) - worker'lar sadece kendi ilgilendikleri anahtarı okur.
 */
export async function handleInternalSettings(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("x-scan-secret")?.trim();
  if (!auth || auth !== env.SCAN_SHARED_SECRET?.trim()) {
    return json({ error: "unauthorized" }, 401);
  }
  const settings = await readSettingsMap(env);
  return json({ settings });
}
