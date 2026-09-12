import type { NeedTag } from "@musteri-avcisi/shared";

export interface RelevanceContext {
  candidateName: string;
  sectorLabel?: string;
  needTags: NeedTag[];
  sourceChannel: string;
  /** Worker'ın rawMetadata'sı (ör. LinkedIn için { keyword, rawType }) - kısa bir bağlam ipucu. */
  rawMetadata?: Record<string, unknown> | null;
}

/** assessRelevance'ın çalışması için gereken efektif ayarlar - bkz. lib/settings.ts getEffectiveSettings. */
export interface RelevanceSettings {
  nvidiaApiKey?: string;
  nvidiaModel: string;
}

export interface RelevanceResult {
  relevant: boolean;
  reason: string;
  usedAI: boolean;
  /** AI hiç denenmediyse ya da başarısız olduysa neden - handleScanResults konsola loglar. */
  error?: string;
}

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const RELEVANCE_SYSTEM_PROMPT = [
  "Sen bir grafik tasarım/web tasarım ajansı için otomatik müşteri taraması",
  "yapan bir sistemin parçasısın. Ajansın sunduğu hizmetler: web sitesi",
  "(yeni/yenileme), logo, kurumsal kimlik, SEO, e-ticaret, sosyal medya",
  "yönetimi, marka yönetimi, afiş/broşür/görsel kimlik tasarımı, araç/",
  "otobüs giydirme, video kurgu.",
  "",
  "Sana sosyal medya/arama taramasından çıkan HAM bir sonucun adını ve",
  "bağlamını vereceğim. Görevin: bunun GERÇEKTEN bu hizmetlere ihtiyacı",
  "olabilecek bir şirket/kişi (potansiyel müşteri) mi, yoksa alakasız bir",
  "şey mi olduğunu belirlemek. Özellikle şunlar ALAKASIZ sayılır: bir İŞ",
  "İLANI/işe alım duyurusu (ör. 'Grafik Tasarımcı Aranıyor', 'Kurumsal",
  "İletişim Uzmanı arıyoruz'), bir CV/kariyer paylaşımı, ajansın kendi",
  "hizmetlerini SUNAN bir rakip/freelancer, ya da konuyla genel olarak",
  "ilgisiz bir gönderi. Emin değilsen (bilgi yetersizse) alakalı kabul et.",
  "",
  'SADECE şu JSON formatında cevap ver, başka HİÇBİR ŞEY yazma (açıklama,',
  "markdown code fence, giriş cümlesi yok):",
  '{"relevant": true veya false, "reason": "kısa Türkçe gerekçe (tek cümle)"}',
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
 * NVIDIA API ile bir tarama sonucunun GERÇEKTEN alakalı bir potansiyel
 * müşteri mi, yoksa gürültü mü (özellikle LinkedIn'de sık görülen iş
 * ilanları - bkz. CLAUDE.md) olduğunu değerlendirir.
 *
 * FAIL-OPEN: anahtar tanımlı değilse, çağrı başarısız olursa, ya da yanıt
 * beklenen JSON şeklinde değilse `relevant: true` döner - yani sistem
 * ŞÜPHEDE KALDIĞINDA adayı ELEMEZ, sadece AI net bir şekilde "alakasız"
 * dediğinde eler. Bunun nedeni: yanlışlıkla gerçek bir müşteriyi filtrelemek
 * (false negative), birkaç gürültülü adayı elemeyi kaçırmaktan (false
 * positive) çok daha maliyetli - kaçırılan gürültü sahibi tarafından tek
 * tıkla reddedilebilir, kaçırılan gerçek müşteri asla görülmez.
 */
export async function assessRelevance(
  ctx: RelevanceContext,
  settings: RelevanceSettings,
): Promise<RelevanceResult> {
  if (!settings.nvidiaApiKey) {
    return { relevant: true, reason: "", usedAI: false, error: "NVIDIA_API_KEY tanımlı değil - filtre atlandı" };
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
          { role: "system", content: RELEVANCE_SYSTEM_PROMPT },
          { role: "user", content: contextLines },
        ],
        temperature: 0,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error("NVIDIA API hatası (relevance)", res.status, bodyText);
      return { relevant: true, reason: "", usedAI: false, error: `status=${res.status} ${bodyText.slice(0, 300)}` };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return { relevant: true, reason: "", usedAI: false, error: "NVIDIA yanıtı boş döndü" };
    }

    const parsed = JSON.parse(extractJsonObject(raw)) as { relevant?: unknown; reason?: unknown };
    if (typeof parsed.relevant !== "boolean") {
      return { relevant: true, reason: "", usedAI: false, error: `Beklenmeyen yanıt şekli: ${raw.slice(0, 200)}` };
    }
    return {
      relevant: parsed.relevant,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      usedAI: true,
    };
  } catch (err) {
    console.error("NVIDIA API çağrısı başarısız (relevance)", err);
    return { relevant: true, reason: "", usedAI: false, error: String(err) };
  }
}
