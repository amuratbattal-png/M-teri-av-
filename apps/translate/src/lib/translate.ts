import type { Env } from "../env";
import { languageLabel } from "./languages";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * NVIDIA chat completions çağrısı - apps/control/src/lib/nvidia-fetch.ts'te
 * öğrenilen AYNI ders burada baştan uygulanıyor: 429 (hız sınırı) gelirse
 * üstel bekleme ile en fazla 5 kez tekrar denenir (bkz. CLAUDE.md "429
 * tekrar" olayı - orada bu olmadan tek bir toplu işlem tüm çevirileri
 * başarısız kılmıştı).
 */
async function fetchNvidiaChat(
  env: Env,
  messages: { role: string; content: string }[],
): Promise<string> {
  if (!env.NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY tanımlı değil");
  }
  const model = env.NVIDIA_MODEL || DEFAULT_MODEL;

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 300,
        // Modelden modele "düşünme" (reasoning) alanının adı değişiyor
        // (bkz. CLAUDE.md, apps/control aynı sorunu yaşadı) - bilinmeyen
        // alan sessizce yok sayıldığı için ikisi de gönderiliyor.
        chat_template_kwargs: { thinking: false, enable_thinking: false },
      }),
    });

    if (res.status === 429) {
      const retryAfterHeader = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : Math.min(3000 * 2 ** attempt, 30000);
      lastError = new Error(`429 rate limited (deneme ${attempt + 1})`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`NVIDIA API status=${res.status} ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("NVIDIA API boş yanıt döndü");
    return content;
  }
  throw lastError instanceof Error ? lastError : new Error("NVIDIA API başarısız");
}

export interface TranslateResult {
  text: string;
  ok: boolean;
}

/**
 * Bu FAIL-OPEN DEĞİL (apps/control'deki lead puanlama/teklif yazımından
 * FARKLI bir tasarım) - orijinal metni sessizce doğru çeviri gibi
 * göstermek katılımcıyı YANLIŞ dilde bir cümleyle baş başa bırakır, bu
 * "sistem çalışıyor gibi görünüp aslında çalışmıyor" (bkz. CLAUDE.md
 * NVIDIA model end-of-life olayı) sorununu burada TEKRARLAR. Bu yüzden
 * başarısızlıkta ok:false + açık "[çeviri yapılamadı]" notuyla orijinal
 * metin döner - katılımcı arayüzü bunu görünür bir uyarı olarak
 * göstermeli, sessizce yutmamalı.
 */
export async function translateText(
  env: Env,
  text: string,
  sourceLangCode: string,
  targetLangCode: string,
): Promise<TranslateResult> {
  if (!text.trim()) return { text, ok: true };
  if (sourceLangCode === targetLangCode) return { text, ok: true };

  try {
    const sourceLabel = languageLabel(sourceLangCode);
    const targetLabel = languageLabel(targetLangCode);
    const content = await fetchNvidiaChat(env, [
      {
        role: "system",
        content:
          "Sen profesyonel bir simultane konferans çevirmenisin. Sana verilen " +
          "cümleyi " +
          sourceLabel +
          " dilinden " +
          targetLabel +
          " diline çevir. SADECE çeviriyi yaz - hiçbir açıklama, tırnak " +
          "işareti, ön ek veya ek not ekleme. Doğal ve akıcı konuşma dili " +
          "kullan, kelime kelime çeviri yapma.",
      },
      { role: "user", content: text },
    ]);
    return { text: content, ok: true };
  } catch (err) {
    console.error("çeviri başarısız", err);
    return { text: `[çeviri yapılamadı] ${text}`, ok: false };
  }
}
