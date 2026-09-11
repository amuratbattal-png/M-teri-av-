import type { Candidate } from "@musteri-avcisi/shared";
import {
  renderApprovalsPage,
  renderAllCandidatesPage,
  renderApprovedPage,
  renderSentPage,
  renderSettingsPage,
  renderFollowUpsPage,
  renderReportPage,
  renderPublicProposalPage,
  PWA_MANIFEST_JSON,
  PWA_SERVICE_WORKER_JS,
  PWA_ICON_SVG,
  matchesCandidateFilters,
  candidateCsvRow,
  CANDIDATE_CSV_HEADERS,
  type CommunicationRow,
  type SettingsData,
  type ReportData,
  type ScanProgressRow,
  type PublicProposalData,
} from "./render";

export interface Env {
  CONTROL_WORKER: Fetcher;
  DASHBOARD_USERNAME: string;
  DASHBOARD_PASSWORD: string;
  /** control'e her istekte x-control-secret header'ı ile gönderilir - bkz. apps/control/src/env.ts. */
  CONTROL_SHARED_SECRET: string;
  /**
   * Çoklu kullanıcı desteği - opsiyonel. JSON dizi:
   * `[{"username":"ayse","password":"..."},{"username":"mehmet","password":"..."}]`.
   * DASHBOARD_USERNAME/PASSWORD birincil hesap olarak AYNEN çalışmaya
   * devam eder - bu SADECE ek hesap eklemenin yolu, tanımlı değilse
   * (varsayılan) davranış hiç değişmez. `wrangler secret put
   * DASHBOARD_USERS_JSON` ile ayarlanır. Onaylayan/reddeden kişi artık
   * sabit "admin" değil, giriş yapan gerçek kullanıcı adı olarak
   * kaydediliyor (bkz. checkAuth, approvedBy kullanımları).
   */
  DASHBOARD_USERS_JSON?: string;
}

/**
 * env.CONTROL_WORKER.fetch()'in tüm çağrılarını tek yerden sarmalar -
 * control artık x-control-secret olmadan hiçbir dashboard isteğini kabul
 * etmiyor (bkz. apps/control/src/index.ts requireControlSecret).
 */
function callControl(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-control-secret", env.CONTROL_SHARED_SECRET?.trim() ?? "");
  return env.CONTROL_WORKER.fetch(`https://internal${path}`, { ...init, headers });
}

interface AuthCheck {
  /** null ise yetkili - fetch() akışı devam eder. Dolu ise doğrudan bu Response döndürülmeli. */
  response: Response | null;
  /** Giriş yapan kullanıcı adı (yetkiliyse dolu) - approvedBy gibi alanlarda "admin" yerine gerçek kullanıcı için kullanılır. */
  username: string | null;
}

const UNAUTHORIZED: AuthCheck = {
  response: new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="musteri-avcisi-dashboard"' },
  }),
  username: null,
};

function checkAuth(request: Request, env: Env): AuthCheck {
  const header = request.headers.get("authorization");
  if (!header) return UNAUTHORIZED;

  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return UNAUTHORIZED;

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return UNAUTHORIZED;
  }
  // decoded.split(":") KULLANMIYORUZ - parola ":" içerirse ilk ":"'dan
  // sonrasını sessizce kaybederdi (eski koddaki bir hataydı).
  const sep = decoded.indexOf(":");
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const pass = sep === -1 ? "" : decoded.slice(sep + 1);

  if (user === env.DASHBOARD_USERNAME && pass === env.DASHBOARD_PASSWORD) {
    return { response: null, username: user };
  }

  if (env.DASHBOARD_USERS_JSON) {
    try {
      const users = JSON.parse(env.DASHBOARD_USERS_JSON) as Array<{
        username?: string;
        password?: string;
      }>;
      const match = users.find((u) => u.username && u.username === user && u.password === pass);
      if (match?.username) return { response: null, username: match.username };
    } catch (err) {
      console.error("DASHBOARD_USERS_JSON ayrıştırılamadı - JSON formatını kontrol et", err);
    }
  }

  return UNAUTHORIZED;
}

async function fetchStats(env: Env): Promise<Record<string, number>> {
  const res = await callControl(env, "/stats");
  const { counts } = (await res.json()) as { counts: Record<string, number> };
  return counts;
}

async function fetchCandidates(env: Env, status?: string): Promise<Candidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await callControl(env, `/candidates${qs}`);
  const { candidates } = (await res.json()) as { candidates: Candidate[] };
  return candidates;
}

async function fetchCommunications(env: Env): Promise<CommunicationRow[]> {
  const res = await callControl(env, "/communications");
  const { communications } = (await res.json()) as { communications: CommunicationRow[] };
  return communications;
}

async function fetchSettings(env: Env): Promise<SettingsData> {
  const res = await callControl(env, "/settings");
  const { settings } = (await res.json()) as { settings: SettingsData };
  return settings;
}

async function fetchReport(env: Env): Promise<ReportData> {
  const res = await callControl(env, "/report");
  return (await res.json()) as ReportData;
}

async function fetchScanProgress(env: Env): Promise<ScanProgressRow[]> {
  const res = await callControl(env, "/scan-progress");
  const { progress } = (await res.json()) as { progress: ScanProgressRow[] };
  return progress;
}

/**
 * Aday popup'ları (bkz. apps/dashboard/src/render.ts candidateDetailDialog)
 * artık Onaylar/Onaylananlar/Tüm Adaylar sayfalarının hepsinde aynı - her
 * formda hangi sayfaya geri dönüleceğini belirten bir "redirect" alanı
 * var. Açık yönlendirme (open redirect) riskine karşı sadece bilinen
 * sayfa yollarına izin verilir.
 */
const ALLOWED_REDIRECTS = new Set(["/", "/onaylananlar", "/adaylar", "/takip"]);
function safeRedirect(origin: string, value: unknown): Response {
  const path = typeof value === "string" && ALLOWED_REDIRECTS.has(value) ? value : "/";
  return Response.redirect(origin + path, 303);
}

/** CSV hücresi - virgül/tırnak/satır sonu içeriyorsa tırnak içine alır, iç tırnakları ikiler (RFC 4180). */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Hosted teklif sayfası (/teklif/:token) - adayın/müşterinin
    // KENDİSİ açıyor, dashboard şifresi olmayacak, bu yüzden Basic
    // Auth'tan BİLİNÇLİ OLARAK muaf. Erişim kontrolü token'ın kendisi
    // (rastgele, tahmin edilemez UUID) - bkz.
    // apps/control/src/routes/public-proposal.ts.
    const publicProposalMatch = url.pathname.match(/^\/teklif\/([^/]+)$/);
    if (publicProposalMatch && request.method === "GET") {
      const res = await callControl(env, `/public-proposal/${publicProposalMatch[1]}`);
      const data = res.ok ? ((await res.json()) as PublicProposalData) : null;
      return new Response(renderPublicProposalPage(data), {
        status: data ? 200 : 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // PWA dosyaları - tarayıcının kurulabilirlik kontrolü bunları
    // kimlik doğrulama olmadan isteyebiliyor, bu yüzden Basic Auth'tan
    // muaf (içerikleri zaten hassas değil - genel marka/ikon/boş bir
    // service worker).
    if (url.pathname === "/manifest.json" && request.method === "GET") {
      return new Response(PWA_MANIFEST_JSON, { headers: { "content-type": "application/manifest+json" } });
    }
    if (url.pathname === "/sw.js" && request.method === "GET") {
      return new Response(PWA_SERVICE_WORKER_JS, { headers: { "content-type": "application/javascript" } });
    }
    if (url.pathname === "/icon.svg" && request.method === "GET") {
      return new Response(PWA_ICON_SVG, { headers: { "content-type": "image/svg+xml" } });
    }

    const auth = checkAuth(request, env);
    if (auth.response) return auth.response;
    const currentUser = auth.username ?? env.DASHBOARD_USERNAME;

    if (url.pathname === "/" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const need = url.searchParams.get("need") || undefined;
      const [counts, pending] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "pending_approval"),
      ]);
      return new Response(renderApprovalsPage(counts, pending, sector, city, q, need), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/onaylananlar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const need = url.searchParams.get("need") || undefined;
      const [counts, approved] = await Promise.all([
        fetchStats(env),
        fetchCandidates(env, "approved"),
      ]);
      return new Response(renderApprovedPage(counts, approved, sector, city, q, need), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/adaylar" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const need = url.searchParams.get("need") || undefined;
      const [counts, all] = await Promise.all([fetchStats(env), fetchCandidates(env)]);
      return new Response(renderAllCandidatesPage(counts, all, sector, city, q, need), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Tüm Adaylar sayfasındaki "Bu listeyi CSV indir" linki - AYNI
    // filtreler (sektör/şehir/ihtiyaç/isim) ve AYNI "onaylananlar hariç"
    // kuralı (bkz. renderAllCandidatesPage) uygulanır, ekranda gördüğün
    // liste birebir CSV'ye düşsün diye.
    if (url.pathname === "/adaylar/export.csv" && request.method === "GET") {
      const sector = url.searchParams.get("sector") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const need = url.searchParams.get("need") || undefined;
      const q = url.searchParams.get("q") || undefined;
      const all = await fetchCandidates(env);
      const filtered = all.filter(
        (c) => c.status !== "approved" && matchesCandidateFilters(c, { sector, city, need, query: q }),
      );

      const lines = [CANDIDATE_CSV_HEADERS, ...filtered.map(candidateCsvRow)].map((row) =>
        row.map(csvCell).join(","),
      );
      // Excel (Windows) Türkçe karakterleri BOM olmadan bozabiliyor.
      const csv = "﻿" + lines.join("\r\n") + "\r\n";
      const filename = `adaylar-${new Date().toISOString().slice(0, 10)}.csv`;

      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (url.pathname === "/takip" && request.method === "GET") {
      const [counts, all] = await Promise.all([fetchStats(env), fetchCandidates(env)]);
      return new Response(renderFollowUpsPage(counts, all), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/rapor" && request.method === "GET") {
      const [counts, report, scanProgress] = await Promise.all([
        fetchStats(env),
        fetchReport(env),
        fetchScanProgress(env),
      ]);
      return new Response(renderReportPage(counts, report, scanProgress), {
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

    const approveMatch = url.pathname.match(/^\/approve\/([^/]+)$/);
    if (approveMatch && request.method === "POST") {
      const form = await request.formData();
      await callControl(env, `/candidates/${approveMatch[1]}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvedBy: currentUser }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    const rejectMatch = url.pathname.match(/^\/reject\/([^/]+)$/);
    if (rejectMatch && request.method === "POST") {
      const form = await request.formData();
      await callControl(env, `/candidates/${rejectMatch[1]}/reject`, { method: "POST" });
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
        await callControl(env, "/candidates/bulk-approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateIds, approvedBy: currentUser }),
        });
      }
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Toplu red - bulkActionBar'daki AYNI form, sadece formaction farklı.
    if (url.pathname === "/bulk-reject" && request.method === "POST") {
      const form = await request.formData();
      const candidateIds = String(form.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (candidateIds.length > 0) {
        await callControl(env, "/candidates/bulk-reject", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateIds }),
        });
      }
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Serbest metin not (mini-CRM) + tekrar arama/takip tarihi + serbest
    // etiketler + "bir daha iletişime geçme" - popup'taki "Notu Kaydet"
    // formu (bkz. render.ts Takip sayfası, candidateDetailDialog).
    const notesMatch = url.pathname.match(/^\/candidates\/([^/]+)\/notes$/);
    if (notesMatch && request.method === "POST") {
      const form = await request.formData();
      const evaluationNotes = String(form.get("evaluationNotes") ?? "");
      const followUpDate = String(form.get("followUpDate") ?? "");
      const tags = String(form.get("tags") ?? "");
      const doNotContact = form.get("doNotContact") === "true";
      await callControl(env, `/candidates/${notesMatch[1]}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evaluationNotes, followUpDate, tags, doNotContact }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    // Aday zaman çizelgesi - render.ts loadActivity() bunu fetch() ile
    // arka planda çağırıyor (popup kapanmadan).
    const activityMatch = url.pathname.match(/^\/candidates\/([^/]+)\/activity$/);
    if (activityMatch && request.method === "GET") {
      const res = await callControl(env, `/candidates/${activityMatch[1]}/activity`);
      const data = await res.text();
      return new Response(data, { headers: { "content-type": "application/json" } });
    }

    // Teklif metnini düzenleme (Onaylar/Onaylananlar/Tüm Adaylar
    // popup'larının hepsinde ortak) - sahibi wa.me/mailto linkleriyle
    // göndermeden önce metni değiştirebiliyor.
    const proposalMatch = url.pathname.match(/^\/candidates\/([^/]+)\/proposal$/);
    if (proposalMatch && request.method === "POST") {
      const form = await request.formData();
      const proposalDraft = String(form.get("proposalDraft") ?? "");
      await callControl(env, `/candidates/${proposalMatch[1]}/proposal`, {
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
      const res = await callControl(env, `/candidates/${regenerateMatch[1]}/regenerate-proposal`, {
        method: "POST",
      });
      const data = await res.text();
      return new Response(data, { headers: { "content-type": "application/json" } });
    }

    // Sahibi WhatsApp/e-postayı kendi hesabından MANUEL gönderdikten
    // sonra bunu işaretliyor - sistem otomatik göndermiyor.
    const markSentMatch = url.pathname.match(/^\/candidates\/([^/]+)\/mark-sent$/);
    if (markSentMatch && request.method === "POST") {
      const form = await request.formData();
      const channel = String(form.get("channel") ?? "");
      await callControl(env, `/candidates/${markSentMatch[1]}/mark-sent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      return safeRedirect(url.origin, form.get("redirect"));
    }

    if (url.pathname === "/ayarlar" && request.method === "GET") {
      const saved = url.searchParams.get("saved") === "1";
      const [counts, settings] = await Promise.all([fetchStats(env), fetchSettings(env)]);
      return new Response(renderSettingsPage(counts, settings, saved), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Otomatik teklif metni şablonu / AI sistem promptu / AI aç-kapat -
    // apps/control'deki settings tablosuna yazılır (bkz. render.ts
    // renderSettingsPage, apps/control/src/lib/settings.ts).
    if (url.pathname === "/ayarlar" && request.method === "POST") {
      const form = await request.formData();
      await callControl(env, "/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proposalTemplate: String(form.get("proposalTemplate") ?? ""),
          proposalTemplateWebsiteNew: String(form.get("proposalTemplateWebsiteNew") ?? ""),
          proposalTemplateWebsiteRedesign: String(form.get("proposalTemplateWebsiteRedesign") ?? ""),
          aiSystemPrompt: String(form.get("aiSystemPrompt") ?? ""),
          aiEnabled: form.get("aiEnabled") === "true",
          aiModel: String(form.get("aiModel") ?? ""),
          meetingLink: String(form.get("meetingLink") ?? ""),
          publicBaseUrl: String(form.get("publicBaseUrl") ?? ""),
          retentionDays: Number.parseInt(String(form.get("retentionDays") ?? "0"), 10) || 0,
        }),
      });
      return Response.redirect(url.origin + "/ayarlar?saved=1", 303);
    }

    return new Response("not found", { status: 404 });
  },
};
