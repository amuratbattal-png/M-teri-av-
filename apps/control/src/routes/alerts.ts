import type { Env } from "../env";
import { readSettingsMap } from "../lib/settings";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Tarama/gönderim worker'larının sessiz arızaları bildirmesi için -
 * sahibi fark etmeden sistemin durmasını (ör. bir API art arda hata
 * vermeye başlarsa) önlemeyi amaçlıyor. control'ün EMAIL_WORKER
 * binding'ini kullanarak sahibine bir uyarı e-postası gönderir.
 *
 * Bu, "onay olmadan gönderim yok" kuralını İHLAL ETMİYOR - bu bir
 * müşteri teklifi değil, sahibinin kendisine giden bir sistem
 * bildirimi (aynı auth deseni: x-scan-secret, tarama worker'larının
 * /scan-results'a yazarken kullandığı sırla aynı).
 */
export async function handleAlert(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("x-scan-secret")?.trim();
  if (!auth || auth !== env.SCAN_SHARED_SECRET?.trim()) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    message?: string;
  };
  if (!body.message) {
    return json({ error: "invalid body: expected { source?, message }" }, 400);
  }

  console.warn(`[UYARI] ${body.source ?? "sistem"}: ${body.message}`);

  if (!env.ALERT_EMAIL || !env.EMAIL_WORKER) {
    console.warn("ALERT_EMAIL veya EMAIL_WORKER tanımlı değil - uyarı sadece loglandı.");
    return json({ ok: true, delivered: false });
  }

  try {
    // Panelden (Ayarlar) email_api_key/email_from_address ayarlanmışsa
    // bunları email worker'ına isteğin içinde taşıyoruz - o worker'ın
    // CONTROL_WORKER binding'i yok, override'ı başka türlü öğrenemez
    // (bkz. workers/channels/email/src/index.ts).
    const settingsMap = await readSettingsMap(env);
    const res = await env.EMAIL_WORKER.fetch("https://internal/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-outreach-secret": env.OUTREACH_SHARED_SECRET?.trim() ?? "",
      },
      body: JSON.stringify({
        to: env.ALERT_EMAIL,
        subject: `[Müşteri Avcısı] Sistem uyarısı - ${body.source ?? "sistem"}`,
        content: body.message,
        apiKeyOverride: settingsMap.email_api_key || null,
        fromAddressOverride: settingsMap.email_from_address || null,
      }),
    });
    return json({ ok: true, delivered: res.ok });
  } catch (err) {
    console.error("uyarı e-postası gönderilemedi", err);
    return json({ ok: true, delivered: false });
  }
}
