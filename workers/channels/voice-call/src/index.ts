export interface Env {
  VOICE_CALL_ENABLED: string; // "true" | "false"
  VOICE_PROVIDER_API_KEY?: string;
  /** control -> bu worker arası paylaşılan sır (bkz. apps/control/src/env.ts). */
  OUTREACH_SHARED_SECRET: string;
}

interface SendRequest {
  to: string | null;
  content: string | null;
  /** control'ün Ayarlar sayfasından okuduğu override - bkz. workers/channels/email için aynı desen. */
  apiKeyOverride?: string | null;
}

/**
 * Sesli arama modülü - şimdilik PASİF (bkz. wrangler.toml).
 * Sahibi ileride yeniden yapılandırmaya gerek kalmadan aktif edebilsin
 * diye arayüz/endpoint hazır tutulur, sadece davranışı devre dışı.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/send" || request.method !== "POST") {
      return new Response("not found", { status: 404 });
    }

    if (request.headers.get("x-outreach-secret")?.trim() !== env.OUTREACH_SHARED_SECRET?.trim()) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    if (env.VOICE_CALL_ENABLED !== "true") {
      return new Response(JSON.stringify({ ok: false, reason: "voice_call_disabled" }), {
        status: 501,
      });
    }

    const body = (await request.json()) as SendRequest;
    if (!body.to) {
      return new Response(JSON.stringify({ error: "no phone contact" }), { status: 400 });
    }

    const apiKey = body.apiKeyOverride || env.VOICE_PROVIDER_API_KEY;
    if (!apiKey) {
      console.warn("VOICE_PROVIDER_API_KEY tanımlı değil - arama atlandı.");
      return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
        status: 501,
      });
    }

    // TODO: gerçek sesli arama sağlayıcı entegrasyonu (ör. Twilio Voice).
    return new Response(JSON.stringify({ ok: false, reason: "not_implemented" }), {
      status: 501,
    });
  },
};
