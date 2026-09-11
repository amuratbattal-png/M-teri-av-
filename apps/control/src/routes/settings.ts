import { DEFAULT_FEATURE_FLAGS } from "@musteri-avcisi/shared";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * "Ayarlar" sayfası için salt-okunur sistem bilgisi - hiçbir zaman gerçek
 * secret değeri (NVIDIA_API_KEY, SCAN_SHARED_SECRET vb.) döndürmez, sadece
 * "tanımlı mı" bilgisi ve zaten gizli olmayan var'lar (ALERT_EMAIL,
 * NVIDIA_MODEL). Değerleri değiştirmek burada değil, `wrangler secret put` /
 * `wrangler.toml` [vars] üzerinden yapılıyor (bkz. CLAUDE.md).
 */
export async function handleGetSettings(env: Env): Promise<Response> {
  return json({
    activeSourceChannels: DEFAULT_FEATURE_FLAGS.activeSourceChannels,
    voiceCallEnabled: DEFAULT_FEATURE_FLAGS.voiceCallEnabled,
    nvidiaModel: env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
    nvidiaConfigured: Boolean(env.NVIDIA_API_KEY),
    alertEmail: env.ALERT_EMAIL || null,
  });
}
