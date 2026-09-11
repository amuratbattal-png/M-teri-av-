import { eq } from "drizzle-orm";
import { createDb, settings as settingsTable } from "@musteri-avcisi/db";
import type { Env } from "../env";

/**
 * Dashboard'daki Ayarlar sayfasının düzenlediği, kod deploy etmeden
 * değişebilecek davranış ayarları. KASITLI OLARAK burada API
 * anahtarı/secret YOK - sadece metin/davranış ayarları (bkz.
 * packages/db/schema.ts settings tablosu notu).
 */
export interface AppSettings {
  /**
   * AI (NVIDIA) kullanılamadığında/kapalıyken kullanılan GENEL/varsayılan
   * şablon teklif metni - `proposalTemplateWebsiteNew`/
   * `proposalTemplateWebsiteRedesign` boşsa (ya da adayın ihtiyaç türü
   * bu ikisinden biri değilse) buna düşülür. `{{isim}}` ve `{{ihtiyac}}`
   * yer tutucularını destekler.
   */
  proposalTemplate: string;
  /**
   * `website_new` (Yeni web sitesi) etiketli adaylara özel şablon - boş
   * bırakılırsa `proposalTemplate` kullanılır. Aynı yer tutucular
   * geçerli. Önceden TEK bir genel şablon vardı, "yeni site" ve "site
   * yenileme" ayrı ayrı düzenlenemiyordu - bu ikisi o yüzden eklendi.
   */
  proposalTemplateWebsiteNew: string;
  /** `website_redesign` (Web sitesi yenileme) etiketli adaylara özel şablon - boşsa `proposalTemplate` kullanılır. */
  proposalTemplateWebsiteRedesign: string;
  /** NVIDIA'ya gönderilen sistem promptu - teklif metninin üslubunu belirler. */
  aiSystemPrompt: string;
  /** false ise NVIDIA_API_KEY tanımlı olsa bile hiç çağrılmaz, doğrudan şablona düşülür. */
  aiEnabled: boolean;
  /** Boşsa env.NVIDIA_MODEL (ya da onun da boş olduğu varsayılan) kullanılır. */
  aiModel: string;
  /**
   * Randevu/toplantı linki (Calendly vb.) - opsiyonel. Şablonlarda
   * `{{randevu}}` yer tutucusuyla kullanılabilir. Boşsa yer tutucu boş
   * metne dönüşür (şablonu bozmaz, sadece linksiz kalır).
   */
  meetingLink: string;
}

export const DEFAULT_PROPOSAL_TEMPLATE = [
  "Merhaba {{isim}},",
  "",
  "{{ihtiyac}} konusunda ihtiyacınız olabileceğini fark ettik. Sizin için özel bir teklif hazırlamak isteriz.",
  "",
  "Uygun olduğunuzda kısaca görüşebilir miyiz?",
].join("\n");

export const DEFAULT_AI_SYSTEM_PROMPT =
  "Sen bir grafik tasarım/web tasarım ajansı için soğuk satış mesajı yazan " +
  "bir asistansın. Türkçe, doğal, samimi ama profesyonel bir dille, kısa " +
  "(en fazla 5-6 cümle) bir ilk temas mesajı yaz. Şablon/klişe ifadelerden " +
  "kaçın ('değerli müşterimiz', 'firmanız' gibi genel kalıplar yerine " +
  "işletmenin adını ve sektörünü/şehrini gerçekten kullan). Fiyat/rakam " +
  "verme, abartılı satış dili kullanma. Sadece mesaj metnini yaz, başlık, " +
  "açıklama ya da tırnak işareti ekleme. WhatsApp veya e-posta ile " +
  "gönderilecek, ikisine de uyacak sade bir format kullan (markdown yok).";

export const DEFAULT_SETTINGS: AppSettings = {
  proposalTemplate: DEFAULT_PROPOSAL_TEMPLATE,
  proposalTemplateWebsiteNew: "",
  proposalTemplateWebsiteRedesign: "",
  aiSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  aiEnabled: true,
  aiModel: "",
  meetingLink: "",
};

/** DB satırlarındaki key isimleri - dashboard formu da bunları kullanır. */
const KEYS: Record<keyof AppSettings, string> = {
  proposalTemplate: "proposal_template",
  proposalTemplateWebsiteNew: "proposal_template_website_new",
  proposalTemplateWebsiteRedesign: "proposal_template_website_redesign",
  aiSystemPrompt: "ai_system_prompt",
  aiEnabled: "ai_enabled",
  aiModel: "ai_model",
  meetingLink: "meeting_link",
};

/** settings tablosundan ayarları okur - satır yoksa ilgili alan için varsayılana düşer. */
export async function loadSettings(env: Env): Promise<AppSettings> {
  const db = createDb(env.DB);
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    proposalTemplate: map.get(KEYS.proposalTemplate) ?? DEFAULT_SETTINGS.proposalTemplate,
    proposalTemplateWebsiteNew:
      map.get(KEYS.proposalTemplateWebsiteNew) ?? DEFAULT_SETTINGS.proposalTemplateWebsiteNew,
    proposalTemplateWebsiteRedesign:
      map.get(KEYS.proposalTemplateWebsiteRedesign) ?? DEFAULT_SETTINGS.proposalTemplateWebsiteRedesign,
    aiSystemPrompt: map.get(KEYS.aiSystemPrompt) ?? DEFAULT_SETTINGS.aiSystemPrompt,
    aiEnabled: map.has(KEYS.aiEnabled) ? map.get(KEYS.aiEnabled) === "true" : DEFAULT_SETTINGS.aiEnabled,
    aiModel: map.get(KEYS.aiModel) ?? DEFAULT_SETTINGS.aiModel,
    meetingLink: map.get(KEYS.meetingLink) ?? DEFAULT_SETTINGS.meetingLink,
  };
}

/** Dashboard'daki Ayarlar formunun gönderdiği alanları settings tablosuna yazar (sadece gönderilenleri günceller). */
export async function updateSettings(env: Env, patch: Partial<AppSettings>): Promise<void> {
  const db = createDb(env.DB);
  const now = new Date().toISOString();

  const entries: Array<[string, string]> = [];
  if (patch.proposalTemplate !== undefined) entries.push([KEYS.proposalTemplate, patch.proposalTemplate]);
  if (patch.proposalTemplateWebsiteNew !== undefined)
    entries.push([KEYS.proposalTemplateWebsiteNew, patch.proposalTemplateWebsiteNew]);
  if (patch.proposalTemplateWebsiteRedesign !== undefined)
    entries.push([KEYS.proposalTemplateWebsiteRedesign, patch.proposalTemplateWebsiteRedesign]);
  if (patch.aiSystemPrompt !== undefined) entries.push([KEYS.aiSystemPrompt, patch.aiSystemPrompt]);
  if (patch.aiEnabled !== undefined) entries.push([KEYS.aiEnabled, String(patch.aiEnabled)]);
  if (patch.aiModel !== undefined) entries.push([KEYS.aiModel, patch.aiModel]);
  if (patch.meetingLink !== undefined) entries.push([KEYS.meetingLink, patch.meetingLink]);

  for (const [key, value] of entries) {
    await db
      .insert(settingsTable)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: now } });
  }
}
