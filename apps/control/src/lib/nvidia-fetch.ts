/**
 * NVIDIA chat completions için ortak fetch sarmalayıcı - `429 Too Many
 * Requests` (özellikle "Puanlanmamış Adayları Yeniden Puanla" gibi
 * kısa sürede çok sayıda çağrı yapan toplu işlemlerde görüldü, bkz.
 * CLAUDE.md) durumunda kısa bir bekleyip otomatik yeniden dener.
 * `lib/proposal.ts` ve `lib/relevance.ts` bunu kullanıyor - tek doğru
 * kaynak (DRY), ikisinde de aynı mantığı kopyalamamak için.
 */
export async function fetchNvidiaChat(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const maxAttempts = 3;
  let res: Response;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt === maxAttempts) return res;

    // "Retry-After" varsa onu kullan, yoksa denemeye göre artan basit bir
    // bekleme (1s, 2s) - en fazla 5 saniye.
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : attempt;
    const waitMs = Math.min(
      (Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : attempt) * 1000,
      5000,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  // TS akış analizi res'in tanımlı olduğunu bilemiyor ama döngü en az bir
  // kez çalışıp ya erken return eder ya da son turda buraya düşer.
  return res!;
}
