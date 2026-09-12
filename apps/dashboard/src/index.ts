import type { Candidate } from "@musteri-avcisi/shared";
import {
  renderApprovalsPage,
  renderAllCandidatesPage,
  renderApprovedPage,
  renderSentPage,
  renderReportPage,
  renderSettingsPage,
  type CommunicationRow,
  type ReportData,
  type SettingsData,
} from "./render";

export interface Env {
  CONTROL_WORKER: Fetcher;
  DASHBOARD_USERNAME: string;
  DASHBOARD_PASSWORD: string;
}

function requireAuth(request: Request, env: Env): Response | null {
  const header = request.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = atob(encoded).split(":");
      if (user === env.DASHBOARD_USERNAME && pass === env.DASHBOARD_PASSWORD) {
        return null;
      }
    }
  }
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="musteri-avcisi-dashboard"' },
  });
}

async function fetchStats(env: Env): Promise<Record<string, number>> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/stats");
  const { counts } = (await res.json()) as { counts: Record<string, number> };
  return counts;
}

async function fetchCandidates(env: Env, status?: string): Promise<Candidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await env.CONTROL_WORKER.fetch(`https://internal/candidates${qs}`);
  const { candidates } = (await res.json()) as { candidates: Candidate[] };
  return candidates;
}

async function fetchCommunications(env: Env): Promise<CommunicationRow[]> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/communications");
  const { communications } = (await res.json()) as { communications: CommunicationRow[] };
  return communications;
}

async function fetchReport(env: Env): Promise<ReportData> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/report");
  return (await res.json()) as ReportData;
}

async function fetchSettings(env: Env): Promise<SettingsData> {
  const res = await env.CONTROL_WORKER.fetch("https://internal/settings");
  return (await res.json()) as SettingsData;
}

/**
 * Aday popup'ları (bkz. apps/dashboard/src/render.ts candidateDetailDialog)
 * artık Onaylar/Onaylananlar/Tüm Adaylar sayfalarının hepsinde aynı - her
 * formda hangi sayfaya geri dönüleceğini belirten bir "redirect" alanı
 * var. Açık yönlendirme (open redirect) riskine karşı sadece bilinen
 * sayfa yollarına izin verilir.
 */
const ALLOWED_REDIRECTS = new Set(["/", "/onaylananlar", "/adaylar"]);
function safeRedirect(origin: string, value: unknown): Response {
  const path = typeof value === "string" && ALLOWED_REDIRECTS.has(value) ? value : "/";
  return Response.redirect(origin + path, 303);
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  return handleRoute(request, env, url);
}

async function handleRoute(request: Request, env: Env, url: URL): Promise<Response> {
    if (url.pathname === "/" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const [counts, pending] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "pending_approval"),
      ]);
      return new Response(renderApprovalsPage(counts, pending, sector, city, q), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/onaylananlar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const [counts, approved] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "approved"),
      ]);
      return new Response(renderApprovedPage(counts, approved, sector, city, q), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/adaylar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const [counts, all] = await Promise.all([fetchStats(env), fetchCandidates(env)]);
      return new Response(renderAllCandidatesPage(counts, all, sector, city, q), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/gonderilenler" && request.method === "GET") {
      const channel = url.searchParams.get("channel") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const [counts, communications] = await Promise.all([
        fetchStats(env),
        fetchCommunications(env),
      ]);
      return new Response(renderSentPage(counts, communications, channel, status, q), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/rapor" && request.method === "GET") {
      const [counts, report] = await Promise.all([fetchStats(env), fetchReport(env)]);
      return new Response(renderReportPage(counts, report), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/ayarlar" && request.method === "GET") {
      const saved = url.searchParams.get("saved") === "1";
      const error = url.searchParams.get("error") || undefined;
      const [counts, settings] = await Promise.all([fetchStats(env), fetchSettings(env)]);
      return new Response(
        renderSettingsPage(counts, settings, env.DASHBOARD_USERNAME, saved, error),
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }

    // Ayarlar formu - NVIDIA anahtarı/model, uyarı e-postası, teklif
    // şablonu ve AI sistem talimatı buradan güncellenir (bkz.
    // apps/control/src/routes/settings.ts handlePostSettings).
    if (url.pathname === "/ayarlar" && request.method === "POST") {
      const form = await request.formData();
      // Jenerik katalog alanları "field__<key>" adıyla geliyor (bkz.
      // render.ts catalogFieldInput) - control'e düz bir { fields } objesi
      // olarak toplanıp gönderiliyor.
      const fields: Record<string, string> = {};
      for (const [name, value] of form.entries()) {
        if (name.startsWith("field__") && typeof value === "string") {
          fields[name.slice("field__".length)] = value;
        }
      }
      // Önceden buradaki yanıt kontrol edilmiyordu - control tarafında bir
      // hata olsa (ör. D1 hatası) bile sessizce "kaydedildi" gösteriliyordu,
      // ya da service binding hata fırlatırsa dashboard'un kendisi
      // Error 1101 veriyordu ("ayarları kaydet diyince hata veriyor" - bkz.
      // CLAUDE.md). Artık control'ün gerçek yanıtı kontrol ediliyor ve
      // hata varsa okunabilir bir mesaj olarak gösteriliyor.
      let res: Response;
      try {
        res = await env.CONTROL_WORKER.fetch("https://internal/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nvidiaApiKey: String(form.get("nvidiaApiKey") ?? ""),
            nvidiaModel: String(form.get("nvidiaModel") ?? ""),
            alertEmail: String(form.get("alertEmail") ?? ""),
            proposalTemplate: String(form.get("proposalTemplate") ?? ""),
            aiSystemPrompt: String(form.get("aiSystemPrompt") ?? ""),
            clearNvidiaApiKey: form.get("clearNvidiaApiKey") === "1",
            fields,
          }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.redirect(
          url.origin + "/ayarlar?error=" + encodeURIComponent(message),
          303,
        );
      }
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        let message = bodyText;
        try {
          const parsed = JSON.parse(bodyText) as { message?: string; error?: string };
          message = parsed.message || parsed.error || bodyText;
        } catch {
          // düz metinse olduğu gibi kullan
        }
        return Response.redirect(
          url.origin + "/ayarlar?error=" + encodeURIComponent(message || `HTTP ${res.status}`),
          303,
        );
      }
      return Response.redirect(url.origin + "/ayarlar?saved=1", 303);
    }

    // Ayarlar sayfasındaki "Doğrula" butonu - JS'ten fetch() ile çağrılır,
    // formda o an yazılı olan değeri (kaydetmeden) test eder (bkz.
    // apps/control/src/lib/verify.ts, render.ts verifySetting()).
    if (url.pathname === "/ayarlar/verify" && request.method === "POST") {
      const body = await request.text();
      const res = await env.CONTROL_WORKER.fetch("https://internal/settings/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      return new Response(await res.text(), { headers: { "content-type": "application/json" } });
    }

    const approveMatch = url.pathname.match(/^\/approve\/([^/]+)$/);
    if (approveMatch && request.method === "POST") {
      const form = await request.formData();
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${approveMatch[1]}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvedBy: env.DASHBOARD_USERNAME }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    const rejectMatch = url.pathname.match(/^\/reject\/([^/]+)$/);
    if (rejectMatch && request.method === "POST") {
      const form = await request.formData();
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${rejectMatch[1]}/reject`, {
        method: "POST",
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Toplu onay (bkz. render.ts bulkActionBar) - "ids" alanı virgülle
    // ayrılmış aday kimlikleri.
    if (url.pathname === "/bulk-approve" && request.method === "POST") {
      const form = await request.formData();
      const candidateIds = String(form.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (candidateIds.length > 0) {
        await env.CONTROL_WORKER.fetch("https://internal/candidates/bulk-approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateIds, approvedBy: env.DASHBOARD_USERNAME }),
        });
      }
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Serbest metin not (mini-CRM) - popup'taki "Notu Kaydet" formu.
    const notesMatch = url.pathname.match(/^\/candidates\/([^/]+)\/notes$/);
    if (notesMatch && request.method === "POST") {
      const form = await request.formData();
      const evaluationNotes = String(form.get("evaluationNotes") ?? "");
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${notesMatch[1]}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evaluationNotes }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Teklif metnini düzenleme (Onaylar/Onaylananlar/Tüm Adaylar
    // popup'larının hepsinde ortak) - sahibi wa.me/mailto linkleriyle
    // göndermeden önce metni değiştirebiliyor.
    const proposalMatch = url.pathname.match(/^\/candidates\/([^/]+)\/proposal$/);
    if (proposalMatch && request.method === "POST") {
      const form = await request.formData();
      const proposalDraft = String(form.get("proposalDraft") ?? "");
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${proposalMatch[1]}/proposal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposalDraft }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // "AI ile Yeniden Yaz" - teklif metnini NVIDIA API ile (bkz.
    // apps/control/src/lib/proposal.ts) sıfırdan yeniden yazdırır. Diğer
    // formların aksine tam sayfa yönlendirmesi YAPMIYOR (popup açık
    // kalsın diye) - render.ts'teki buton bunu fetch() ile çağırıp
    // dönen proposalDraft'ı doğrudan metin kutusuna yazıyor.
    const regenerateMatch = url.pathname.match(/^\/candidates\/([^/]+)\/regenerate-proposal$/);
    if (regenerateMatch && request.method === "POST") {
      const res = await env.CONTROL_WORKER.fetch(
        `https://internal/candidates/${regenerateMatch[1]}/regenerate-proposal`,
        { method: "POST" },
      );
      const data = await res.text();
      return new Response(data, { headers: { "content-type": "application/json" } });
    }

    // Sahibi WhatsApp/e-postayı kendi hesabından MANUEL gönderdikten
    // sonra bunu işaretliyor - sistem otomatik göndermiyor.
    const markSentMatch = url.pathname.match(/^\/candidates\/([^/]+)\/mark-sent$/);
    if (markSentMatch && request.method === "POST") {
      const form = await request.formData();
      const channel = String(form.get("channel") ?? "");
      await env.CONTROL_WORKER.fetch(`https://internal/candidates/${markSentMatch[1]}/mark-sent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    return new Response("not found", { status: 404 });
}

const FATAL_ERROR_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

/** Basit, temaya uygun hata sayfası - hangi worker (control/dashboard) hangi mesajla başarısız olduğu görülebilsin (bkz. CLAUDE.md "ayarları kaydet diyince hata veriyor" olayı). */
function renderFatalErrorPage(message: string): string {
  const safeMessage = message.replace(/[&<>]/g, (c) => FATAL_ERROR_ESCAPES[c] ?? c);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Hata</title>
  <style>body{font-family:system-ui,sans-serif;background:#0a0c14;color:#e6e8f0;padding:2rem;max-width:60ch;margin:0 auto}
  h1{color:#f87171;font-size:1.1rem}pre{white-space:pre-wrap;background:#151827;border:1px solid #242940;border-radius:8px;padding:1rem;font-size:0.85rem}
  a{color:#2dd4bf}</style></head>
  <body><h1>Bir şeyler ters gitti</h1><pre>${safeMessage}</pre>
  <p><a href="/">Ana sayfaya dön</a></p></body></html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleFetch(request, env);
    } catch (err) {
      // Önceden bu tür bir hata (ör. control service binding'i fırlattığında)
      // hiç yakalanmıyordu - kullanıcı sadece Cloudflare'in opak
      // Error 1101 sayfasını görüyordu. Artık gerçek hata mesajı okunabilir
      // bir sayfada gösteriliyor.
      console.error("dashboard isteği başarısız", err);
      return new Response(
        renderFatalErrorPage(err instanceof Error ? err.message : String(err)),
        { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
  },
};
