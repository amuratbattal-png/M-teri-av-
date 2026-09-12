import type { NeedTag } from "@musteri-avcisi/shared";

export interface LeadQualityContext {
  candidateName: string;
  sectorLabel?: string;
  needTags: NeedTag[];
  sourceChannel: string;
  /** Worker'ın rawMetadata'sı (ör. LinkedIn için { keyword, rawType }, Google Maps için { reviewsSample } - varsa). */
  rawMetadata?: Record<string, unknown> | null;
}

/** assessLeadQuality'nin çalışması için gereken efektif ayarlar - bkz. lib/settings.ts getEffectiveSettings. */
export interface LeadQualitySettings {
  nvidiaApiKey?: string;
  nvidiaModel: string;
}

export interface LeadQualityResult {
  /**
   * 1-5 yıldız: 1 = kesin zaman kaybı (iş ilanı, CV, rakip, alakasız),
   * 5 = kesin/güçlü aday. `undefined` = AI hiç denenmedi ya da
   * başarısız oldu (bkz. FAIL-OPEN notu) - "puansız" demek, "1 yıldız"
   * demek DEĞİL.
   */
  score?: number;
  reason: string;
  usedAI: boolean;
  /** AI hiç denenmediyse ya da başarısız olduysa neden - handleScanResults konsola loglar. */
  error?: string;
}

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/** score <= bu değer olan adaylar "Askıda" (on_hold) durumuna gider - bkz. handleScanResults. */
export const ON_HOLD_MAX_SCORE = 2;

const LEAD_QUALITY_SYSTEM_PROMPT = [
  "Sen bir grafik tasarım/web tasarım ajansı için otomatik müşteri taraması",
  "yapan bir sistemin parçasısın. Ajansın sunduğu hizmetler: web sitesi",
  "(yeni/yenileme), logo, kurumsal kimlik, SEO, e-ticaret, sosyal medya",
  "yönetimi, marka yönetimi, afiş/broşür/görsel kimlik tasarımı, araç/",
  "otobüs giydirme, video kurgu.",
  "",
  "Sana sosyal medya/arama taramasından çıkan HAM bir sonucun adını ve",
  "bağlamını vereceğim (bazen Google yorumlarından bir örnek de olabilir).",
  "Görevin: bunun bu hizmetlere GERÇEKTEN ihtiyacı olabilecek bir",
  "şirket/kişi (potansiyel müşteri) olma ihtimalini 1-5 arası bir",
  "yıldızla puanlamak:",
  "5 = çok güçlü sinyal, kesin/neredeyse kesin bir potansiyel müşteri.",
  "4 = muhtemelen iyi bir aday, açık bir ihtiyaç işareti var.",
  "3 = belirsiz - ihtiyacı olabilir ama elimizdeki bilgiyle emin olunamaz.",
  "2 = muhtemelen zayıf/alakasız bir sinyal.",
  "1 = kesinlikle alakasız, zaman kaybı - ÖZELLİKLE: bir İŞ İLANI/işe alım",
  "duyurusu (ör. 'Grafik Tasarımcı Aranıyor'), bir CV/kariyer paylaşımı,",
  "ajansın kendi hizmetlerini SUNAN bir rakip/freelancer, ya da konuyla",
  "tamamen ilgisiz bir gönderi/yorum. Emin değilsen ortalama bir puan",
  "(3) ver, uçlara (1 ya da 5) sadece gerçekten eminsen git.",
  "",
  'SADECE şu JSON formatında cevap ver, başka HİÇBİR ŞEY yazma (açıklama,',
  "markdown code fence, giriş cümlesi yok):",
  '{"score": 1-5 arası tam sayı, "reason": "kısa Türkçe gerekçe (tek cümle)"}',
].join(" ");

/** LLM bazen JSON'ı ```json ... ``` gibi bir code fence içine alıyor - talimata rağmen. */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) return text.slice(braceStart, braceEnd + 1);
  return text.trim();
}

/**
 * NVIDIA API ile bir tarama sonucunun ne kadar iyi bir potansiyel müşteri
 * adayı olduğunu 1-5 yıldız olarak puanlar (özellikle LinkedIn'de sık
 * görülen iş ilanı gürültüsüne karşı - bkz. CLAUDE.md).
 *
 * FAIL-OPEN: anahtar tanımlı değilse, çağrı başarısız olursa, ya da yanıt
 * beklenen JSON şeklinde değilse `score: undefined` (puansız) döner -
 * `1 yıldız` ANLAMINA GELMEZ. `handleScanResults` puansız bir adayı asla
 * "Askıda"ya atmaz, her zamanki gibi onay akışına sokar. Bunun nedeni:
 * yanlışlıkla gerçek bir müşteriyi elemek (false negative), birkaç
 * gürültülü adayı Askıda'ya atmayı kaçırmaktan (false positive) çok daha
 * maliyetli - kaçırılan gürültü sahibi tarafından Askıda sayfasında ya da
 * tek tıkla reddedilebilir, kaçırılan gerçek müşteri asla görülmeyebilir.
 */
export async function assessLeadQuality(
  ctx: LeadQualityContext,
  settings: LeadQualitySettings,
): Promise<LeadQualityResult> {
  if (!settings.nvidiaApiKey) {
    return { reason: "", usedAI: false, error: "NVIDIA_API_KEY tanımlı değil - puanlama atlandı" };
  }

  const contextLines = [
    `Ad/metin: ${ctx.candidateName}`,
    `Kaynak kanal: ${ctx.sourceChannel}`,
    ctx.sectorLabel ? `Sektör/kategori: ${ctx.sectorLabel}` : null,
    ctx.needTags.length ? `Tahmini ihtiyaç etiketleri: ${ctx.needTags.join(", ")}` : null,
    ctx.rawMetadata ? `Ek bağlam: ${JSON.stringify(ctx.rawMetadata).slice(0, 400)}` : null,
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
          { role: "system", content: LEAD_QUALITY_SYSTEM_PROMPT },
          { role: "user", content: contextLines },
        ],
        temperature: 0,
        max_tokens: 150,
        // DeepSeek/Nemotron gibi "reasoning" modeller varsayılan olarak
        // uzun bir iç muhakeme metni üretebiliyor (bkz. NVIDIA'nın kendi
        // kod örnekleri) - bizim kısa JSON çıktımız için bu istenmiyor
        // (hem maliyetli hem JSON'ı bozma riski var), kapatılıyor.
        // Modelden modele bu alanın adı değişiyor (DeepSeek: `thinking`,
        // Nemotron: `enable_thinking`) - hangi model seçilirse seçilsin
        // çalışsın diye İKİSİ DE gönderiliyor.
        extra_body: { chat_template_kwargs: { thinking: false, enable_thinking: false } },
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error("NVIDIA API hatası (lead quality)", res.status, bodyText);
      return { reason: "", usedAI: false, error: `status=${res.status} ${bodyText.slice(0, 300)}` };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return { reason: "", usedAI: false, error: "NVIDIA yanıtı boş döndü" };
    }

    const parsed = JSON.parse(extractJsonObject(raw)) as { score?: unknown; reason?: unknown };
    const score = typeof parsed.score === "number" ? Math.round(parsed.score) : NaN;
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { reason: "", usedAI: false, error: `Beklenmeyen yanıt şekli: ${raw.slice(0, 200)}` };
    }
    return {
      score,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      usedAI: true,
    };
  } catch (err) {
    console.error("NVIDIA API çağrısı başarısız (lead quality)", err);
    return { reason: "", usedAI: false, error: String(err) };
  }
}
