import { NEED_TAG_LABELS_TR, type NeedTag } from "@musteri-avcisi/shared";

export interface ProposalContext {
  candidateName: string;
  needTags: NeedTag[];
  sectorLabel?: string;
  cityLabel?: string;
}

/** draftProposal'ın çalışması için gereken efektif ayarlar - bkz. lib/settings.ts getEffectiveSettings. */
export interface ProposalSettings {
  nvidiaApiKey?: string;
  nvidiaModel: string;
  /** Placeholder'lı taslak metin ({{isim}}, {{ihtiyac}}, {{sektor}}, {{sehir}}) - AI kullanılamazsa buna düşülür. */
  proposalTemplate: string;
  /** NVIDIA modeline verilen sistem talimatı - Ayarlar sayfasından değiştirilebilir. */
  aiSystemPrompt: string;
}

export interface ProposalResult {
  text: string;
  usedAI: boolean;
  /** AI başarısız olduysa (ya da hiç denenmediyse) neden - dashboard'da "AI ile Yeniden Yaz" sonrası gösterilir, wrangler tail'e bakmaya gerek kalmaz. */
  error?: string;
}

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Ayarlar sayfasındaki placeholder'lı şablonu ({{isim}}, {{ihtiyac}},
 * {{sektor}}, {{sehir}}) adaya göre doldurur - NVIDIA_API_KEY tanımlı
 * değilse (ya da API çağrısı başarısız olursa) buna düşülür. Sistem
 * hiçbir zaman "boş" bir teklif göndermez, en kötü ihtimalle bu şablon
 * kullanılır.
 */
function renderTemplate(template: string, ctx: ProposalContext): string {
  const services = ctx.needTags.map((tag) => NEED_TAG_LABELS_TR[tag] ?? tag).join(", ");
  return template
    .replaceAll("{{isim}}", ctx.candidateName)
    .replaceAll("{{ihtiyac}}", services)
    .replaceAll("{{sektor}}", ctx.sectorLabel ?? "")
    .replaceAll("{{sehir}}", ctx.cityLabel ?? "");
}

/**
 * NVIDIA API (integrate.api.nvidia.com, OpenAI uyumlu chat completions)
 * ile adaya özel, doğal bir teklif metni ürettirir. Anahtar tanımlı
 * değilse ya da çağrı başarısız olursa şablon metne (renderTemplate)
 * düşer - hiçbir aday LLM hatası yüzünden teklifsiz kalmaz. `error`
 * alanı, düşüş sebebini (ör. 401/403, yanlış anahtar türü) taşır -
 * dashboard'daki "AI ile Yeniden Yaz" bunu doğrudan gösteriyor.
 *
 * NOT: Bu, sistemdeki hiçbir gönderimi OTOMATİKLEŞTİRMİYOR - sadece
 * `pending_approval` durumundaki bir adayın taslak metnini yazıyor.
 * Sahibi her zaman bu metni Onaylar/Onaylananlar popup'ında okuyup
 * düzenleyebiliyor, gönderim hâlâ tamamen manuel (bkz. CLAUDE.md).
 */
export async function draftProposal(
  ctx: ProposalContext,
  settings: ProposalSettings,
): Promise<ProposalResult> {
  const fallback = renderTemplate(settings.proposalTemplate, ctx);
  if (!settings.nvidiaApiKey) {
    return { text: fallback, usedAI: false, error: "NVIDIA_API_KEY tanımlı değil" };
  }

  const services = ctx.needTags.map((tag) => NEED_TAG_LABELS_TR[tag] ?? tag).join(", ");
  const contextLines = [
    `Firma/işletme adı: ${ctx.candidateName}`,
    ctx.sectorLabel ? `Sektör: ${ctx.sectorLabel}` : null,
    ctx.cityLabel ? `Şehir: ${ctx.cityLabel}` : null,
    `Tespit edilen ihtiyaç: ${services}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.nvidiaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.nvidiaModel,
        messages: [
          { role: "system", content: settings.aiSystemPrompt },
          {
            role: "user",
            content: `Aşağıdaki bilgilere göre bir ilk temas mesajı yaz:\n\n${contextLines}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
        // DeepSeek gibi "reasoning" modeller varsayılan olarak uzun bir iç
        // muhakeme metni üretebiliyor (bkz. NVIDIA'nın kendi kod örneği) -
        // bizim kısa teklif metinleri için bu istenmiyor, kapatılıyor.
        // Bunu desteklemeyen modeller bu alanı sessizce yok sayar.
        extra_body: { chat_template_kwargs: { thinking: false } },
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error("NVIDIA API hatası", res.status, bodyText);
      return {
        text: fallback,
        usedAI: false,
        error: `status=${res.status} ${bodyText.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { text: fallback, usedAI: false, error: "NVIDIA yanıtı boş döndü" };
    }
    return { text, usedAI: true };
  } catch (err) {
    console.error("NVIDIA API çağrısı başarısız", err);
    return { text: fallback, usedAI: false, error: String(err) };
  }
}
