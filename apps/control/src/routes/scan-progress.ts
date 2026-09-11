import { createDb, scanProgress } from "@musteri-avcisi/db";
import type { Env } from "../env";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Tarama worker'larının (şu an sadece google-search-scanner) her
 * çalışmadan sonra "nerede kaldım" bilgisini bildirmesi için -
 * `packages/db/schema.ts` `scanProgress` tablosu önceden vardı ama hiç
 * kullanılmıyordu. `x-scan-secret` ile korunur (diğer scanner->control
 * uç noktalarıyla AYNI desen).
 */
export async function handleReportScanProgress(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("x-scan-secret")?.trim();
  if (!auth || auth !== env.SCAN_SHARED_SECRET?.trim()) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    trackSlug?: string;
    sourceChannel?: string;
    cursorIndex?: number;
    total?: number;
  };
  if (
    typeof body.trackSlug !== "string" ||
    typeof body.sourceChannel !== "string" ||
    typeof body.cursorIndex !== "number" ||
    typeof body.total !== "number"
  ) {
    return json(
      { error: "invalid body: expected { trackSlug, sourceChannel, cursorIndex, total }" },
      400,
    );
  }

  const db = createDb(env.DB);
  const now = new Date().toISOString();
  await db
    .insert(scanProgress)
    .values({
      trackSlug: body.trackSlug,
      sourceChannel: body.sourceChannel,
      cursor: JSON.stringify({ cursorIndex: body.cursorIndex, total: body.total }),
      lastScannedAt: now,
      status: "in_progress",
    })
    .onConflictDoUpdate({
      target: scanProgress.trackSlug,
      set: {
        cursor: JSON.stringify({ cursorIndex: body.cursorIndex, total: body.total }),
        lastScannedAt: now,
        sourceChannel: body.sourceChannel,
      },
    });

  return json({ ok: true });
}

export interface ScanProgressRow {
  trackSlug: string;
  sourceChannel: string;
  lastScannedAt: string | null;
  cursorIndex: number;
  total: number;
  percent: number;
}

/** Dashboard'daki Rapor sayfası için - CONTROL_SHARED_SECRET gerektirir (bkz. index.ts genel gate). */
export async function handleGetScanProgress(env: Env): Promise<Response> {
  const db = createDb(env.DB);
  const rows = await db.select().from(scanProgress);

  const progress: ScanProgressRow[] = rows.map((r) => {
    let cursorIndex = 0;
    let total = 0;
    try {
      const parsed = JSON.parse(r.cursor ?? "{}") as { cursorIndex?: number; total?: number };
      cursorIndex = parsed.cursorIndex ?? 0;
      total = parsed.total ?? 0;
    } catch {
      // eski/bozuk bir cursor formatı - 0/0 olarak göster, çökmesin.
    }
    return {
      trackSlug: r.trackSlug,
      sourceChannel: r.sourceChannel,
      lastScannedAt: r.lastScannedAt,
      cursorIndex,
      total,
      percent: total > 0 ? Math.round((cursorIndex / total) * 100) : 0,
    };
  });

  return json({ progress });
}
