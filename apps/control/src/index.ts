import { eq } from "drizzle-orm";
import { createDb, candidates, communicationLog } from "@musteri-avcisi/db";
import type { Env, OutreachJob } from "./env";
import { handleScanResults, handleListCandidates, handleStats } from "./routes/candidates";
import { handleApprove, handleReject } from "./routes/approvals";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (pathname === "/health") {
      return json({ ok: true, service: "musteri-avcisi-control" });
    }

    if (pathname === "/scan-results" && method === "POST") {
      return handleScanResults(request, env);
    }

    if (pathname === "/candidates" && method === "GET") {
      return handleListCandidates(request, env);
    }

    if (pathname === "/stats" && method === "GET") {
      return handleStats(env);
    }

    const approveMatch = pathname.match(/^\/candidates\/([^/]+)\/approve$/);
    if (approveMatch && method === "POST") {
      return handleApprove(request, env, approveMatch[1]);
    }

    const rejectMatch = pathname.match(/^\/candidates\/([^/]+)\/reject$/);
    if (rejectMatch && method === "POST") {
      return handleReject(env, rejectMatch[1]);
    }

    return json({ error: "not found" }, 404);
  },

  /**
   * Onaylanmış adayları ilgili gönderim kanalı worker'ına dispatch eder.
   * Bu, sistemde gerçek mesajın gönderildiği TEK yer - ve buraya sadece
   * `handleApprove` üzerinden, sahibinin onayından sonra girilir.
   */
  async queue(batch: MessageBatch<OutreachJob>, env: Env): Promise<void> {
    const db = createDb(env.DB);

    for (const message of batch.messages) {
      const { candidateId, channel } = message.body;

      const rows = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);
      const candidate = rows[0];
      if (!candidate) {
        message.ack();
        continue;
      }

      const worker = channel === "whatsapp" ? env.WHATSAPP_WORKER : env.EMAIL_WORKER;
      if (!worker) {
        // Kanal worker'ı henüz deploy edilmemiş olabilir (bkz. CLAUDE.md
        // sonraki adımlar) - mesajı retry'a bırak.
        message.retry();
        continue;
      }

      try {
        const res = await worker.fetch("https://internal/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-outreach-secret": env.OUTREACH_SHARED_SECRET?.trim() ?? "",
          },
          body: JSON.stringify({
            to:
              channel === "whatsapp" ? candidate.contactWhatsapp : candidate.contactEmail,
            content: candidate.proposalDraft,
          }),
        });

        if (!res.ok) throw new Error(`channel worker responded ${res.status}`);

        const now = new Date().toISOString();
        await db
          .update(candidates)
          .set({ status: "sent", sentAt: now, lastContactChannel: channel })
          .where(eq(candidates.id, candidateId));

        await db.insert(communicationLog).values({
          id: crypto.randomUUID(),
          candidateId,
          channel,
          direction: "outbound",
          content: candidate.proposalDraft ?? "",
          status: "sent",
          createdAt: now,
        });

        message.ack();
      } catch (err) {
        console.error("outreach dispatch failed", err);
        message.retry();
      }
    }
  },
};
