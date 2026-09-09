export interface Env {
  VOICE_CALL_ENABLED: string; // "true" | "false"
  VOICE_PROVIDER_API_KEY?: string;
}

interface SendRequest {
  to: string | null;
  content: string | null;
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

    if (env.VOICE_CALL_ENABLED !== "true") {
      return new Response(JSON.stringify({ ok: false, reason: "voice_call_disabled" }), {
        status: 501,
      });
    }

    const body = (await request.json()) as SendRequest;
    if (!body.to) {
      return new Response(JSON.stringify({ error: "no phone contact" }), { status: 400 });
    }

    if (!env.VOICE_PROVIDER_API_KEY) {
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
