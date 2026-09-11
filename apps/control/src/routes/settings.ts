import { DEFAULT_FEATURE_FLAGS } from "@musteri-avcisi/shared";
import type { Env } from "../env";
import { getEffectiveSettings, updateSettings, clearNvidiaApiKey } from "../lib/settings";

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
 * ("panel"den mi yoksa Cloudflare secret'tan mı geliyor).
 */
export async function handleGetSettings(env: Env): Promise<Response> {
  const s = await getEffectiveSettings(env);
  return json({
    activeSourceChannels: DEFAULT_FEATURE_FLAGS.activeSourceChannels,
    voiceCallEnabled: DEFAULT_FEATURE_FLAGS.voiceCallEnabled,
    nvidiaModel: s.nvidiaModel,
    nvidiaApiKeyConfigured: s.nvidiaApiKeyConfigured,
    nvidiaApiKeySource: s.nvidiaApiKeySource,
    alertEmail: s.alertEmail,
    proposalTemplate: s.proposalTemplate,
    aiSystemPrompt: s.aiSystemPrompt,
  });
}

/**
 * Ayarlar sayfasındaki formdan gelen güncelleme - bkz. lib/settings.ts
 * updateSettings için alan bazlı kurallar (nvidiaApiKey boşsa dokunulmaz,
 * diğerleri boşsa varsayılana döner). `{ clearNvidiaApiKey: true }`
 * gönderilirse panelden kaydedilmiş anahtar silinir (Cloudflare secret'a
 * geri dönülür).
 */
export async function handlePostSettings(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    nvidiaApiKey?: string;
    nvidiaModel?: string;
    alertEmail?: string;
    proposalTemplate?: string;
    aiSystemPrompt?: string;
    clearNvidiaApiKey?: boolean;
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

  return json({ ok: true });
}
