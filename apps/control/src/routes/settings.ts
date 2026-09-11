import type { Env } from "../env";
import { loadSettings, updateSettings, type AppSettings } from "../lib/settings";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Dashboard'daki Ayarlar sayfası bunu okuyup formu dolduruyor. */
export async function handleGetSettings(env: Env): Promise<Response> {
  const settings = await loadSettings(env);
  return json({ settings });
}

/** Dashboard'daki Ayarlar formu bunu çağırıyor - sadece gönderilen alanları günceller. */
export async function handleUpdateSettings(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Partial<AppSettings>;
  const patch: Partial<AppSettings> = {};

  if (typeof body.proposalTemplate === "string") patch.proposalTemplate = body.proposalTemplate;
  if (typeof body.proposalTemplateWebsiteNew === "string")
    patch.proposalTemplateWebsiteNew = body.proposalTemplateWebsiteNew;
  if (typeof body.proposalTemplateWebsiteRedesign === "string")
    patch.proposalTemplateWebsiteRedesign = body.proposalTemplateWebsiteRedesign;
  if (typeof body.aiSystemPrompt === "string") patch.aiSystemPrompt = body.aiSystemPrompt;
  if (typeof body.aiEnabled === "boolean") patch.aiEnabled = body.aiEnabled;
  if (typeof body.aiModel === "string") patch.aiModel = body.aiModel;

  if (Object.keys(patch).length === 0) {
    return json({ error: "invalid body: no known settings field provided" }, 400);
  }

  await updateSettings(env, patch);
  const settings = await loadSettings(env);
  return json({ ok: true, settings });
}
