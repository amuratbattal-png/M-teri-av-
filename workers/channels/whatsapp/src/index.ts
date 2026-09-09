export interface Env {
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
}

interface SendRequest {
  to: string | null;
  content: string | null;
}

/**
 * `apps/control` bu worker'ı SADECE onaylanmış bir aday için, kuyruk
 * üzerinden çağırır (bkz. apps/control/src/index.ts `queue()`).
 * Burada ek bir onay kontrolü yoktur - onay control tarafında yapılır.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/send" || request.method !== "POST") {
      return new Response("not found", { status: 404 });
    }

    const body = (await request.json()) as SendRequest;
    if (!body.to) {
      return new Response(JSON.stringify({ error: "no whatsapp contact" }), { status: 400 });
    }

    if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID tanımlı değil - gönderim atlandı.");
      return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
        status: 501,
      });
    }

    // TODO: gerçek WhatsApp Business Cloud API çağrısı.
    // https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: body.to,
          type: "text",
          text: { body: body.content ?? "" },
        }),
      },
    );

    return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 502 });
  },
};
