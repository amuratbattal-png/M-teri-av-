import { eq, desc } from "drizzle-orm";
import { createDb, activityLog } from "@musteri-avcisi/db";
import type { Env } from "../env";

/**
 * Aday zaman çizelgesine bir satır ekler. Çağıran taraf başarısız olsa
 * bile ANA işlemi (onay/red/kayıt vb.) engellemez - bu sadece bir iz
 * kaydı, kritik yol değil. Hata olursa loglanır, üst katmana fırlatılmaz.
 */
export async function logActivity(
  env: Env,
  candidateId: string,
  action: string,
  detail?: string,
): Promise<void> {
  try {
    const db = createDb(env.DB);
    await db.insert(activityLog).values({
      id: crypto.randomUUID(),
      candidateId,
      action,
      detail: detail ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("activity log yazılamadı", candidateId, action, err);
  }
}

/** Dashboard'daki "Geçmişi Göster" butonu için - en yeni en üstte. */
export async function getActivity(env: Env, candidateId: string) {
  const db = createDb(env.DB);
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.candidateId, candidateId))
    .orderBy(desc(activityLog.createdAt));
}
