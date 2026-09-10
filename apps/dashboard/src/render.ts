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
  clock: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 12.3l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-7-6.5 16-2.7-6.8L4 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h16v10H9l-3.5 3v-3H4v-10z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 4l2.3 5.1 5.5.6-4.1 3.8 1.1 5.5-4.8-2.8-4.8 2.8 1.1-5.5-4.1-3.8 5.5-.6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.7"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  xcircle: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M9.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
};

const TILE_ICON: Record<string, string> = {
  pending_approval: ICONS.clock,
  approved: ICONS.check,
  sent: ICONS.send,
  responded: ICONS.chat,
  converted: ICONS.star,
  discovered: ICONS.search,
  rejected: ICONS.xcircle,
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
        ${navItem("/", ICONS.overview, "Onaylar", "onaylar", opts.pendingCount)}
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
        <span class="live-pill"><span class="status-dot"></span> Canlı</span>
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
          <span class="tile-icon">${TILE_ICON[status] ?? ICONS.search}</span>
          <div>
            <div class="tile-count">${n}</div>
            <div class="tile-label">${STATUS_LABELS_TR[status] ?? status}</div>
          </div>
        </div>`;
    })
    .join("");
}

function contactLine(c: Candidate): string {
  const parts = [
    c.contactWhatsapp ? `WhatsApp: ${c.contactWhatsapp}` : null,
    c.contactEmail ? `E-posta: ${c.contactEmail}` : null,
    c.contactPhone ? `Telefon: ${c.contactPhone}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.map((p) => escapeHtml(p)).join(" · ") : "İletişim bilgisi yok";
}

function approveRejectForms(id: string): string {
  return `
    <form method="post" action="/approve/${id}">
      <button type="submit" class="btn btn--approve">✓ Onayla ve Gönder</button>
    </form>
    <form method="post" action="/reject/${id}">
      <button type="submit" class="btn btn--reject">✕ Reddet</button>
    </form>`;
}

/** Kompakt kart: sadece özet bilgi + hızlı onay/red. Detay için tıklanınca popup açılır. */
function candidateCard(c: Candidate): string {
  const needsPreview = c.needTags.slice(0, 2);
  const extra = c.needTags.length - needsPreview.length;
  const pills =
    needsPreview.map((t) => `<span class="pill">${escapeHtml(NEED_TAG_LABELS_TR[t] ?? t)}</span>`).join("") +
    (extra > 0 ? `<span class="pill pill--muted">+${extra}</span>` : "");

  return `
    <article class="card" onclick="document.getElementById('dlg-${c.id}').showModal()">
      <h3 class="card-title card-title--clamp">${escapeHtml(c.name)}</h3>
      <div class="card-meta">
        <span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span>
        <span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
      </div>
      <div class="pills">${pills}</div>
      <button type="button" class="detail-link" onclick="event.stopPropagation(); document.getElementById('dlg-${c.id}').showModal()">Detayları gör</button>
      <div class="card-actions" onclick="event.stopPropagation()">
        ${approveRejectForms(c.id)}
      </div>
    </article>`;
}

/** Kartın detay popup'ı (native &lt;dialog&gt; - ekstra JS kütüphanesi gerekmiyor). */
function candidateDialog(c: Candidate): string {
  const pills = c.needTags
    .map((t) => `<span class="pill">${escapeHtml(NEED_TAG_LABELS_TR[t] ?? t)}</span>`)
    .join("");

  return `
    <dialog id="dlg-${c.id}" class="detail-dialog">
      <div class="dialog-inner">
        <button type="button" class="dialog-close" onclick="this.closest('dialog').close()">✕</button>
        <h3 class="card-title">${escapeHtml(c.name)}</h3>
        <div class="card-meta">
          <span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span>
          <span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
        </div>
        <div class="pills">${pills}</div>
        <p class="contact">${contactLine(c)}</p>
        ${
          c.proposalDraft
            ? `<div class="proposal-label">Teklif taslağı</div><pre class="proposal">${escapeHtml(c.proposalDraft)}</pre>`
            : ""
        }
        ${
          c.sourceUrl
            ? `<a class="source-link" href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener">Kaynağı görüntüle ${ICONS.external}</a>`
            : ""
        }
        <div class="card-actions">
          ${approveRejectForms(c.id)}
        </div>
      </div>
    </dialog>`;
}

export function renderApprovalsPage(counts: Record<string, number>, pending: Candidate[]): string {
  const sortedPending = [...pending].sort((a, b) =>
    a.discoveredAt < b.discoveredAt ? 1 : a.discoveredAt > b.discoveredAt ? -1 : 0,
  );
  const list = sortedPending.length
    ? `<div class="cards">${sortedPending.map(candidateCard).join("\n")}</div>${sortedPending.map(candidateDialog).join("\n")}`
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
      <td><span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span></td>
      <td><span class="status status--${tone}">${STATUS_LABELS_TR[c.status] ?? c.status}</span></td>
      <td class="muted">${fmtDate(c.discoveredAt)}</td>
    </tr>`;
}

/** Sektör filtresi - "Tümü" + PARALLEL_TRACK + alfabetik SECTORS listesi. */
function sectorFilterSelect(selectedSlug: string | undefined): string {
  const options = [
    `<option value=""${selectedSlug ? "" : " selected"}>Tüm sektörler</option>`,
    `<option value="${PARALLEL_TRACK.slug}"${
      selectedSlug === PARALLEL_TRACK.slug ? " selected" : ""
    }>${escapeHtml(PARALLEL_TRACK.labelTr)}</option>`,
    ...SECTORS.map(
      (s) =>
        `<option value="${s.slug}"${selectedSlug === s.slug ? " selected" : ""}>${escapeHtml(
          s.labelTr,
        )}</option>`,
    ),
  ].join("");

  return `
    <form class="filter-bar" method="get" action="/adaylar">
      <label for="sector-filter">Sektör</label>
      <select id="sector-filter" name="sector" onchange="this.form.submit()">${options}</select>
    </form>`;
}

export function renderAllCandidatesPage(
  counts: Record<string, number>,
  all: Candidate[],
  selectedSector?: string,
): string {
  const filtered = selectedSector
    ? all.filter((c) => c.sectorSlug === selectedSector)
    : all;
  const sorted = [...filtered].sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
  const rows = sorted.length
    ? sorted.map(candidateRow).join("\n")
    : `<tr><td colspan="5" class="muted">Bu filtreyle hiç aday bulunamadı.</td></tr>`;

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Tüm adaylar (${sorted.length})</h2>
    ${sectorFilterSelect(selectedSector)}
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
    --bg: #0a0c14;
    --bg-glow: radial-gradient(1200px 500px at 15% -10%, rgba(45,212,191,0.08), transparent),
                radial-gradient(900px 400px at 100% 0%, rgba(129,140,248,0.06), transparent);
    --sidebar-bg: #0d0f1a;
    --surface: #151827;
    --surface-2: #1b1f31;
    --border: #242940;
    --text: #eef0f9;
    --text-muted: #8891ac;
    --accent: #2dd4bf;
    --accent-2: #22c3ad;
    --accent-soft: rgba(45, 212, 191, 0.13);
    --violet: #a78bfa;
    --violet-soft: rgba(167, 139, 250, 0.14);
    --ok: #34d399;
    --ok-soft: rgba(52, 211, 153, 0.14);
    --warn: #fbbf24;
    --warn-soft: rgba(251, 191, 36, 0.13);
    --bad: #f87171;
    --bad-soft: rgba(248, 113, 113, 0.14);
    --radius: 16px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.35);
    --shadow-md: 0 12px 28px -14px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.3);
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }

  .shell { display: flex; min-height: 100vh; }

  .sidebar {
    width: 248px;
    flex-shrink: 0;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    padding: 1.4rem 1rem;
    display: flex;
    flex-direction: column;
  }
  .brand { display: flex; align-items: center; gap: 0.65rem; padding: 0.4rem 0.5rem 1.75rem; }
  .brand-icon {
    width: 34px; height: 34px; color: var(--accent);
    background: var(--accent-soft);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    padding: 6px;
  }
  .brand-icon svg { width: 100%; height: 100%; }
  .brand-name { font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }
  .brand-sub { font-size: 0.72rem; color: var(--text-muted); }

  .nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    font-size: 0.87rem;
    font-weight: 500;
    text-decoration: none;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
  }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item--active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
  .nav-icon svg { width: 100%; height: 100%; }
  .nav-badge {
    margin-left: auto;
    background: var(--warn);
    color: #211603;
    font-size: 0.68rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.06rem 0.42rem;
  }

  .sidebar-footer {
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 0.8rem 0.5rem 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    border-top: 1px solid var(--border);
    margin-top: 0.5rem;
  }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--ok); display: inline-block;
    box-shadow: 0 0 0 3px var(--ok-soft);
  }

  .main { flex: 1; min-width: 0; padding: 2rem 2.25rem 3rem; background-image: var(--bg-glow); }
  .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; }
  .topbar h1 { font-size: 1.4rem; margin: 0 0 0.3rem; letter-spacing: -0.01em; }
  .topbar p { margin: 0; color: var(--text-muted); font-size: 0.87rem; }
  .live-pill {
    display: inline-flex; align-items: center; gap: 0.45rem;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 999px; padding: 0.4rem 0.85rem;
    font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.85rem;
    margin-bottom: 2.25rem;
  }
  .tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .tile-icon {
    width: 34px; height: 34px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--text-muted);
    padding: 7px;
  }
  .tile-icon svg { width: 100%; height: 100%; }
  .tile-count { font-size: 1.55rem; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
  .tile-label { font-size: 0.74rem; color: var(--text-muted); margin-top: 0.15rem; }
  .tile--warn { border-color: rgba(251,191,36,0.4); background: linear-gradient(180deg, var(--warn-soft), var(--surface) 60%); }
  .tile--warn .tile-icon { background: var(--warn-soft); color: var(--warn); }
  .tile--warn .tile-count { color: var(--warn); }
  .tile--ok .tile-icon { background: var(--ok-soft); color: var(--ok); }
  .tile--ok .tile-count { color: var(--ok); }
  .tile--bad .tile-icon { background: var(--bad-soft); color: var(--bad); }
  .tile--bad .tile-count { color: var(--bad); }
  .tile--neutral .tile-icon { background: var(--violet-soft); color: var(--violet); }

  .section-title { font-size: 1.05rem; margin: 0 0 1rem; font-weight: 700; letter-spacing: -0.01em; }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: -0.4rem 0 1rem;
  }
  .filter-bar label { font-size: 0.85rem; color: var(--text-muted); }
  .filter-bar select {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.45rem 0.7rem;
    font-family: inherit;
    font-size: 0.88rem;
    max-width: 280px;
  }

  .empty-state {
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--text-muted);
    box-shadow: var(--shadow-sm);
  }
  .empty-state .emoji { font-size: 2.2rem; display: block; margin-bottom: 0.6rem; }

  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.2rem;
    box-shadow: var(--shadow-md);
    transition: border-color 0.15s, transform 0.1s;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }
  .card:hover { border-color: #33395a; transform: translateY(-1px); }
  .card-title { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
  .card-title--clamp {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 1.6rem; }
  .detail-link {
    background: none; border: none; padding: 0; margin: 0.7rem 0 0;
    color: var(--accent); font-size: 0.78rem; font-weight: 600;
    cursor: pointer; text-align: left; font-family: inherit;
  }
  .detail-link:hover { text-decoration: underline; }

  /* Detay popup'ı (native <dialog>) */
  dialog.detail-dialog {
    border: none; padding: 0; background: transparent; max-width: 560px; width: 92vw;
    border-radius: var(--radius);
  }
  dialog.detail-dialog::backdrop { background: rgba(5,6,12,0.72); backdrop-filter: blur(2px); }
  .dialog-inner {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.6rem 1.7rem;
    max-height: 84vh;
    overflow-y: auto;
    position: relative;
  }
  .dialog-close {
    position: absolute; top: 1rem; right: 1rem;
    width: 30px; height: 30px; border-radius: 8px;
    background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted);
    cursor: pointer; font-size: 0.9rem;
  }
  .dialog-close:hover { color: var(--text); }
  .proposal-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-top: 0.9rem; }

  .badge {
    font-size: 0.71rem;
    font-weight: 500;
    padding: 0.22rem 0.6rem;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .badge--source { color: var(--violet); border-color: rgba(167,139,250,0.35); background: var(--violet-soft); }

  .status { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .status--warn { color: var(--warn); background: var(--warn-soft); }
  .status--ok { color: var(--ok); background: var(--ok-soft); }
  .status--bad { color: var(--bad); background: var(--bad-soft); }
  .status--neutral { color: var(--text-muted); background: var(--surface-2); }

  .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.85rem 0; }
  .pill {
    font-size: 0.74rem; font-weight: 600;
    padding: 0.22rem 0.65rem; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent-2);
    border: 1px solid rgba(45,212,191,0.25);
  }
  .pill--muted { background: var(--surface-2); color: var(--text-muted); border-color: var(--border); }

  .contact { font-size: 0.84rem; color: var(--text-muted); margin: 0.5rem 0; }

  .proposal-wrap { margin: 0.6rem 0; }
  .proposal-wrap summary { cursor: pointer; font-size: 0.81rem; color: var(--accent); font-weight: 600; }
  .proposal {
    white-space: pre-wrap;
    font-size: 0.81rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    margin: 0.6rem 0 0;
    max-height: 220px;
    overflow-y: auto;
    color: var(--text);
    line-height: 1.5;
  }

  .source-link { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.79rem; color: var(--accent); text-decoration: none; margin-top: 0.4rem; font-weight: 500; }
  .source-link:hover { text-decoration: underline; }

  .card-actions { display: flex; gap: 0.65rem; margin-top: 1.2rem; padding-top: 1.1rem; border-top: 1px solid var(--border); }
  .card > .card-actions { margin-top: auto; }
  .card-actions form { margin: 0; }
  .btn {
    cursor: pointer; border: none; border-radius: 9px;
    padding: 0.6rem 1.1rem; font-size: 0.84rem; font-weight: 600;
    font-family: inherit; transition: filter 0.15s, transform 0.1s;
  }
  .btn:active { transform: scale(0.98); }
  .btn--approve { background: linear-gradient(180deg, var(--accent), var(--accent-2)); color: #04231e; box-shadow: 0 6px 16px -6px rgba(45,212,191,0.5); }
  .btn--approve:hover { filter: brightness(1.06); }
  .btn--reject { background: var(--bad-soft); color: var(--bad); border: 1px solid rgba(248, 113, 113, 0.3); }
  .btn--reject:hover { filter: brightness(1.15); }

  .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; box-shadow: var(--shadow-md); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.8rem 1.1rem; color: var(--text-muted); font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); }
  td { padding: 0.75rem 1.1rem; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface-2); }
  .muted { color: var(--text-muted); }

  @media (max-width: 1100px) {
    .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .shell { flex-direction: column; }
    .sidebar { width: 100%; flex-direction: row; align-items: center; padding: 0.75rem 1rem; overflow-x: auto; }
    .brand { padding: 0 1rem 0 0; }
    .nav { flex-direction: row; }
    .sidebar-footer { display: none; }
    .main { padding: 1.25rem 1rem 2.5rem; }
    .topbar { flex-direction: column; }
    .cards { grid-template-columns: 1fr; }
  }
`;
