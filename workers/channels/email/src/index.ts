export interface Env {
  EMAIL_API_KEY?: string;
  EMAIL_FROM_ADDRESS: string;
  /** control -> bu worker arası paylaşılan sır (bkz. apps/control/src/env.ts). */
  OUTREACH_SHARED_SECRET: string;
}

interface SendRequest {
  to: string | null;
  content: string | null;
  /** Tanımlı değilse teklif e-postaları için varsayılan başlık kullanılır. */
  subject?: string | null;
  /**
   * control'ün Ayarlar sayfasından (D1 `settings`, `email_api_key`/
   * `email_from_address`) okuyup gönderdiği override - bu worker'ın
   * CONTROL_WORKER binding'i olmadığı için (control -> bu worker yönünde
   * çağrılıyor), override'ı isteğin kendisiyle taşıyoruz. Tanımlı değilse
   * worker'ın kendi Cloudflare secret'ı (EMAIL_API_KEY/EMAIL_FROM_ADDRESS)
   * kullanılır.
   */
  apiKeyOverride?: string | null;
  fromAddressOverride?: string | null;
}

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

    const body = (await request.json()) as SendRequest;
    if (!body.to) {
      return new Response(JSON.stringify({ error: "no email contact" }), { status: 400 });
    }

    const apiKey = body.apiKeyOverride || env.EMAIL_API_KEY;
    const fromAddress = body.fromAddressOverride || env.EMAIL_FROM_ADDRESS;

    if (!apiKey) {
      console.warn("EMAIL_API_KEY tanımlı değil - gönderim atlandı.");
      return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
        status: 501,
      });
    }

    // TODO: gerçek e-posta sağlayıcı entegrasyonu (ör. Resend, Postmark,
    // ya da Cloudflare üzerinden MailChannels).
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: body.to,
        subject: body.subject || "Sizin için hazırladığımız teklif",
        text: body.content ?? "",
      }),
    });

    return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 502 });
  },
};
