import { NEED_TAG_LABELS_TR, type NeedTag } from "@musteri-avcisi/shared";

export interface ProposalContext {
  candidateName: string;
  needTags: NeedTag[];
  sectorLabel?: string;
  cityLabel?: string;
}

export interface ProposalEnv {
  NVIDIA_API_KEY?: string;
  /** build.nvidia.com'daki model kimliği - tanımlı değilse varsayılana düşer. */
  NVIDIA_MODEL?: string;
}

export interface ProposalResult {
  text: string;
  usedAI: boolean;
  /** AI başarısız olduysa (ya da hiç denenmediyse) neden - dashboard'da "AI ile Yeniden Yaz" sonrası gösterilir, wrangler tail'e bakmaya gerek kalmaz. */
  error?: string;
}

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";

/**
 * Çok basit, şablon tabanlı bir taslak - NVIDIA_API_KEY tanımlı
 * değilse (ya da API çağrısı başarısız olursa) buna düşülür. Sistem
 * hiçbir zaman "boş" bir teklif göndermez, en kötü ihtimalle bu şablon
 * kullanılır.
 */
function templateProposal(ctx: ProposalContext): string {
  const services = ctx.needTags.map((tag) => NEED_TAG_LABELS_TR[tag] ?? tag).join(", ");
  return [
    `Merhaba ${ctx.candidateName},`,
    "",
    `${services} konusunda ihtiyacınız olabileceğini fark ettik. ` +
      "Sizin için özel bir teklif hazırlamak isteriz.",
    "",
    "Uygun olduğunuzda kısaca görüşebilir miyiz?",
  ].join("\n");
}

/**
 * NVIDIA API (integrate.api.nvidia.com, OpenAI uyumlu chat completions)
 * ile adaya özel, doğal bir teklif metni ürettirir. Anahtar tanımlı
 * değilse ya da çağrı başarısız olursa şablon metne (templateProposal)
 * düşer - hiçbir aday LLM hatası yüzünden teklifsiz kalmaz. `error`
 * alanı, düşüş sebebini (ör. 401/403, yanlış anahtar türü) taşır -
 * dashboard'daki "AI ile Yeniden Yaz" bunu doğrudan gösteriyor.
 *
 * NOT: Bu, sistemdeki hiçbir gönderimi OTOMATİKLEŞTİRMİYOR - sadece
 * `pending_approval` durumundaki bir adayın taslak metnini yazıyor.
 * Sahibi her zaman bu metni Onaylar/Onaylananlar popup'ında okuyup
 * düzenleyebiliyor, gönderim hâlâ tamamen manuel (bkz. CLAUDE.md).
 */
export async function draftProposal(ctx: ProposalContext, env: ProposalEnv): Promise<ProposalResult> {
  const fallback = templateProposal(ctx);
  if (!env.NVIDIA_API_KEY) {
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
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.NVIDIA_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Sen bir grafik tasarım/web tasarım ajansı için soğuk satış mesajı yazan " +
              "bir asistansın. Türkçe, doğal, samimi ama profesyonel bir dille, kısa " +
              "(en fazla 5-6 cümle) bir ilk temas mesajı yaz. Şablon/klişe ifadelerden " +
              "kaçın ('değerli müşterimiz', 'firmanız' gibi genel kalıplar yerine " +
              "işletmenin adını ve sektörünü/şehrini gerçekten kullan). Fiyat/rakam " +
              "verme, abartılı satış dili kullanma. Sadece mesaj metnini yaz, başlık, " +
              "açıklama ya da tırnak işareti ekleme. WhatsApp veya e-posta ile " +
              "gönderilecek, ikisine de uyacak sade bir format kullan (markdown yok).",
          },
          {
            role: "user",
            content: `Aşağıdaki bilgilere göre bir ilk temas mesajı yaz:\n\n${contextLines}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
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
