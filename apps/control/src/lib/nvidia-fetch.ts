/**
 * NVIDIA chat completions için ortak fetch sarmalayıcı - `429 Too Many
 * Requests` (bkz. CLAUDE.md - toplu "Yeniden Puanla"/cron işleminde
 * GÖRÜLMEYE DEVAM ETTİ, ilk deneme - 3 deneme, 1s/2s bekleme, 350ms
 * aralık - yetersiz kaldı) durumunda bekleyip otomatik yeniden dener.
 * `lib/proposal.ts` ve `lib/relevance.ts` bunu kullanıyor - tek doğru
 * kaynak (DRY), ikisinde de aynı mantığı kopyalamamak için.
 *
 * İKİNCİ deneme (ÇOK daha sabırlı): NVIDIA'nın ücretsiz uç noktalarının
 * gerçek hız sınırının (RPM) ne olduğu belgelenmiyor - önceki 3
 * deneme/1-2 saniyelik bekleme sürekli 429 ile tükeniyordu, yani gerçek
 * limit birkaç saniyeden UZUN bir pencereye yayılıyor olmalı. Artık:
 * - 5 deneme (öncesi 3)
 * - üstel bekleme 3s → 6s → 12s → 24s (öncesi 1s/2s, 5s'de tavan) -
 *   `Retry-After` header'ı varsa (NVIDIA şu ana kadar göndermiyor gibi
 *   görünüyor ama ileride gönderirse) ona öncelik veriliyor.
 * Bu, bir tek adayın puanlama+teklif çağrısını en kötü ihtimalle ~45
 * saniyeye kadar uzatabilir - kabul edilebilir, çünkü hem `handleRescoreUnscored`
 * hem `scheduled()` zaten küçük batch'ler halinde çalışıp bir sonraki
 * çağrıda/tikte devam ediyor (bkz. CLAUDE.md).
 */
export async function fetchNvidiaChat(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const maxAttempts = 5;
  const baseDelaySeconds = 3;
  const maxDelayMs = 30000;
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

    // "Retry-After" varsa onu kullan, yoksa üstel bir bekleme (3s, 6s,
    // 12s, 24s) - en fazla 30 saniye.
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const exponentialSeconds = baseDelaySeconds * Math.pow(2, attempt - 1);
    const waitMs = Math.min(
      (Number.isFinite(retryAfterSeconds) ? retryAfterSeconds! : exponentialSeconds) * 1000,
      maxDelayMs,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  // TS akış analizi res'in tanımlı olduğunu bilemiyor ama döngü en az bir
  // kez çalışıp ya erken return eder ya da son turda buraya düşer.
  return res!;
}
