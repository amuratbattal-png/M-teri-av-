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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/send" || request.method !== "POST") {
      return new Response("not found", { status: 404 });
    }

    // NOT: OUTREACH_SHARED_SECRET henüz secret olarak set edilmemişse
    // (env değeri undefined) basit bir "?.trim() !== ?.trim()"
    // karşılaştırması undefined !== undefined => false döner ve isteği
    // YANLIŞLIKLA yetkili sayar - secret'ın DOLU olması ayrıca kontrol
    // edilmeli.
    const providedSecret = request.headers.get("x-outreach-secret")?.trim();
    const expectedSecret = env.OUTREACH_SHARED_SECRET?.trim();
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const body = (await request.json()) as SendRequest;
    if (!body.to) {
      return new Response(JSON.stringify({ error: "no email contact" }), { status: 400 });
    }

    if (!env.EMAIL_API_KEY) {
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
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM_ADDRESS,
        to: body.to,
        subject: body.subject || "Sizin için hazırladığımız teklif",
        text: body.content ?? "",
      }),
    });

    return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 502 });
  },
};
