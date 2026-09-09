import {
  NEED_TAG_LABELS_TR,
  CANDIDATE_STATUSES,
  SECTORS,
  PARALLEL_TRACK,
  type Candidate,
} from "@musteri-avcisi/shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STATUS_LABELS_TR: Record<string, string> = {
  discovered: "Keşfedildi",
  evaluated: "Değerlendirildi",
  proposal_drafted: "Teklif Hazırlandı",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  sent: "Gönderildi",
  responded: "Yanıtlandı",
  converted: "Müşteri Oldu",
  declined: "Geri Çevrildi",
};

const STATUS_TONE: Record<string, "warn" | "ok" | "bad" | "neutral"> = {
  discovered: "neutral",
  evaluated: "neutral",
  proposal_drafted: "neutral",
  pending_approval: "warn",
  approved: "ok",
  rejected: "bad",
  sent: "ok",
  responded: "ok",
  converted: "ok",
  declined: "bad",
};

const SOURCE_LABELS_TR: Record<string, string> = {
  google_search: "Google Arama",
  google_maps: "Google Haritalar",
  yahoo_search: "Yahoo Arama",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  instagram: "Instagram",
  tender_site: "İhale Sitesi",
  freelancer_gallery: "Freelancer Galerisi",
};

function sectorLabel(slug: string): string {
  if (slug === PARALLEL_TRACK.slug) return PARALLEL_TRACK.labelTr;
  return SECTORS.find((s) => s.slug === slug)?.labelTr ?? slug;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// --- İkonlar (inline SVG, çizgi stili) ---------------------------------

const ICONS = {
  logo: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 12.5l2.2 2.2L16 9.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  overview: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/></svg>`,
  candidates: `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="17" cy="8.5" r="2.3" stroke="currentColor" stroke-width="1.6"/><path d="M15.8 19c-.1-2.4 1.7-4.4 4-4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// --- Sol menü / sayfa iskeleti -------------------------------------------

function shell(opts: {
  active: "onaylar" | "adaylar";
  pendingCount: number;
  title: string;
  subtitle: string;
  content: string;
}): string {
  const navItem = (
    href: string,
    icon: string,
    label: string,
    key: "onaylar" | "adaylar",
    badge?: number,
  ) => `
    <a class="nav-item${opts.active === key ? " nav-item--active" : ""}" href="${href}">
      <span class="nav-icon">${icon}</span>
      <span>${label}</span>
      ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
    </a>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Müşteri Avcısı - Panel</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">${ICONS.logo}</span>
        <div>
          <div class="brand-name">Müşteri Avcısı</div>
          <div class="brand-sub">Onay Paneli</div>
        </div>
      </div>
      <nav class="nav">
        ${navItem("/", ICONS.overview, "Genel Bakış / Onaylar", "onaylar", opts.pendingCount)}
        ${navItem("/adaylar", ICONS.candidates, "Tüm Adaylar", "adaylar")}
      </nav>
      <div class="sidebar-footer">
        <span class="status-dot"></span> Sistem Aktif
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h1>${opts.title}</h1>
          <p>${opts.subtitle}</p>
        </div>
      </header>
      <div class="content">
        ${opts.content}
      </div>
    </main>
  </div>
</body>
</html>`;
}

// --- Genel Bakış / Onaylar sayfası ---------------------------------------

function statTiles(counts: Record<string, number>): string {
  const order = [
    "pending_approval",
    "approved",
    "sent",
    "responded",
    "converted",
    "discovered",
    "rejected",
  ];
  return order
    .map((status) => {
      const n = counts[status] ?? 0;
      const tone = STATUS_TONE[status] ?? "neutral";
      return `
        <div class="tile tile--${tone}">
          <div class="tile-count">${n}</div>
          <div class="tile-label">${STATUS_LABELS_TR[status] ?? status}</div>
        </div>`;
    })
    .join("");
}

function candidateCard(c: Candidate): string {
  const needs = c.needTags
    .map((t) => `<span class="pill">${escapeHtml(NEED_TAG_LABELS_TR[t] ?? t)}</span>`)
    .join("");
  const contactParts = [
    c.contactWhatsapp ? `WhatsApp: ${c.contactWhatsapp}` : null,
    c.contactEmail ? `E-posta: ${c.contactEmail}` : null,
    c.contactPhone ? `Telefon: ${c.contactPhone}` : null,
  ].filter(Boolean) as string[];
  const contact = contactParts.length
    ? contactParts.map((p) => escapeHtml(p)).join(" · ")
    : "İletişim bilgisi yok";

  return `
    <article class="card">
      <header class="card-header">
        <div>
          <h3 class="card-title">${escapeHtml(c.name)}</h3>
          <div class="card-meta">
            <span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span>
            <span class="badge badge--accent">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
          </div>
        </div>
      </header>

      <div class="pills">${needs}</div>
      <p class="contact">${contact}</p>

      ${
        c.proposalDraft
          ? `<details class="proposal-wrap">
              <summary>Teklif taslağını gör</summary>
              <pre class="proposal">${escapeHtml(c.proposalDraft)}</pre>
            </details>`
          : ""
      }

      ${
        c.sourceUrl
          ? `<a class="source-link" href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener">Kaynağı görüntüle ${ICONS.external}</a>`
          : ""
      }

      <div class="card-actions">
        <form method="post" action="/approve/${c.id}">
          <button type="submit" class="btn btn--approve">✓ Onayla ve Gönder</button>
        </form>
        <form method="post" action="/reject/${c.id}">
          <button type="submit" class="btn btn--reject">✕ Reddet</button>
        </form>
      </div>
    </article>`;
}

export function renderApprovalsPage(counts: Record<string, number>, pending: Candidate[]): string {
  const list = pending.length
    ? `<div class="cards">${pending.map(candidateCard).join("\n")}</div>`
    : `<div class="empty-state">
        <span class="emoji">🔍</span>
        Onay bekleyen aday yok.<br>
        Tarama worker'ları her çalıştığında burası otomatik güncellenir.
      </div>`;

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Onay bekleyenler</h2>
    ${list}
  `;

  return shell({
    active: "onaylar",
    pendingCount: counts.pending_approval ?? 0,
    title: "Genel Bakış",
    subtitle: "Hiçbir teklif senin onayın olmadan gönderilmez.",
    content,
  });
}

// --- Tüm Adaylar sayfası --------------------------------------------------

function candidateRow(c: Candidate): string {
  const tone = STATUS_TONE[c.status] ?? "neutral";
  return `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td><span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span></td>
      <td><span class="badge badge--accent">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span></td>
      <td><span class="status status--${tone}">${STATUS_LABELS_TR[c.status] ?? c.status}</span></td>
      <td class="muted">${fmtDate(c.discoveredAt)}</td>
    </tr>`;
}

export function renderAllCandidatesPage(
  counts: Record<string, number>,
  all: Candidate[],
): string {
  const sorted = [...all].sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
  const rows = sorted.length
    ? sorted.map(candidateRow).join("\n")
    : `<tr><td colspan="5" class="muted">Henüz hiç aday bulunamadı.</td></tr>`;

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Tüm adaylar (${sorted.length})</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Ad</th><th>Sektör</th><th>Kaynak</th><th>Durum</th><th>Keşif tarihi</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  return shell({
    active: "adaylar",
    pendingCount: counts.pending_approval ?? 0,
    title: "Tüm Adaylar",
    subtitle: "Sistemin bugüne kadar bulduğu tüm adaylar ve durumları.",
    content,
  });
}

// --- Stiller ---------------------------------------------------------------

const STYLES = `
  :root {
    --bg: #0b0e17;
    --sidebar-bg: #10131f;
    --surface: #161a29;
    --surface-2: #1c2134;
    --border: #252a3d;
    --text: #e7e9f3;
    --text-muted: #8890ab;
    --accent: #2dd4bf;
    --accent-soft: rgba(45, 212, 191, 0.14);
    --ok: #34d399;
    --ok-soft: rgba(52, 211, 153, 0.14);
    --warn: #fbbf24;
    --warn-soft: rgba(251, 191, 36, 0.14);
    --bad: #f87171;
    --bad-soft: rgba(248, 113, 113, 0.14);
    --radius: 14px;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
  }
  a { color: inherit; }

  .shell { display: flex; min-height: 100vh; }

  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
  }
  .brand { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem 1.5rem; }
  .brand-icon { width: 30px; height: 30px; color: var(--accent); }
  .brand-icon svg { width: 100%; height: 100%; }
  .brand-name { font-weight: 700; font-size: 0.95rem; }
  .brand-sub { font-size: 0.72rem; color: var(--text-muted); }

  .nav { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.65rem;
    border-radius: 10px;
    font-size: 0.85rem;
    text-decoration: none;
    color: var(--text-muted);
  }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item--active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
  .nav-icon svg { width: 100%; height: 100%; }
  .nav-badge {
    margin-left: auto;
    background: var(--warn);
    color: #1a1200;
    font-size: 0.68rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
  }

  .sidebar-footer {
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 0.6rem 0.5rem 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); display: inline-block; }

  .main { flex: 1; min-width: 0; padding: 1.75rem 2rem 3rem; }
  .topbar h1 { font-size: 1.3rem; margin: 0 0 0.25rem; }
  .topbar p { margin: 0 0 1.5rem; color: var(--text-muted); font-size: 0.85rem; }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.9rem 1rem; }
  .tile-count { font-size: 1.5rem; font-weight: 700; line-height: 1.1; }
  .tile-label { font-size: 0.76rem; color: var(--text-muted); margin-top: 0.2rem; }
  .tile--warn { border-color: var(--warn); background: var(--warn-soft); }
  .tile--warn .tile-count { color: var(--warn); }
  .tile--ok .tile-count { color: var(--ok); }
  .tile--bad .tile-count { color: var(--bad); }

  .section-title { font-size: 1.02rem; margin: 0 0 1rem; }

  .empty-state {
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: var(--text-muted);
  }
  .empty-state .emoji { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

  .cards { display: grid; gap: 1rem; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem 1.4rem; }
  .card-header { display: flex; justify-content: space-between; gap: 1rem; }
  .card-title { margin: 0 0 0.4rem; font-size: 1.05rem; }
  .card-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }

  .badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .badge--accent { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

  .status { font-size: 0.72rem; font-weight: 600; padding: 0.18rem 0.55rem; border-radius: 999px; }
  .status--warn { color: var(--warn); background: var(--warn-soft); }
  .status--ok { color: var(--ok); background: var(--ok-soft); }
  .status--bad { color: var(--bad); background: var(--bad-soft); }
  .status--neutral { color: var(--text-muted); background: var(--surface-2); }

  .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.75rem 0; }
  .pill { font-size: 0.73rem; padding: 0.2rem 0.6rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 600; }

  .contact { font-size: 0.83rem; color: var(--text-muted); margin: 0.4rem 0; }

  .proposal-wrap { margin: 0.5rem 0; }
  .proposal-wrap summary { cursor: pointer; font-size: 0.8rem; color: var(--accent); font-weight: 600; }
  .proposal {
    white-space: pre-wrap;
    font-size: 0.8rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
    margin: 0.5rem 0 0;
    max-height: 220px;
    overflow-y: auto;
    color: var(--text);
  }

  .source-link { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--accent); text-decoration: none; margin-top: 0.3rem; }
  .source-link:hover { text-decoration: underline; }

  .card-actions { display: flex; gap: 0.6rem; margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
  .card-actions form { margin: 0; }
  .btn { cursor: pointer; border: none; border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.83rem; font-weight: 600; font-family: inherit; }
  .btn--approve { background: var(--accent); color: #04201c; }
  .btn--approve:hover { filter: brightness(1.08); }
  .btn--reject { background: var(--bad-soft); color: var(--bad); border: 1px solid rgba(248, 113, 113, 0.35); }
  .btn--reject:hover { filter: brightness(1.1); }

  .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.75rem 1rem; color: var(--text-muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid var(--border); }
  td { padding: 0.7rem 1rem; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  .muted { color: var(--text-muted); }

  @media (max-width: 760px) {
    .shell { flex-direction: column; }
    .sidebar { width: 100%; flex-direction: row; align-items: center; padding: 0.75rem 1rem; overflow-x: auto; }
    .brand { padding: 0 1rem 0 0; }
    .nav { flex-direction: row; }
    .sidebar-footer { display: none; }
    .main { padding: 1.25rem 1rem 2.5rem; }
  }
`;
