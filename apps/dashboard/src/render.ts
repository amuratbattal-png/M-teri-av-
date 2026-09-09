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

function statTiles(counts: Record<string, number>): string {
  // Onay bekleyenleri en öne, en vurgulu şekilde göster - dikkat buraya çekilmeli.
  const order = [
    "pending_approval",
    "approved",
    "sent",
    "responded",
    "converted",
    "discovered",
    "evaluated",
    "proposal_drafted",
    "rejected",
    "declined",
  ];
  return order
    .map((status) => {
      const n = counts[status] ?? 0;
      const highlight = status === "pending_approval" && n > 0 ? " tile--action" : "";
      return `
        <div class="tile${highlight}">
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
            <span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
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
          ? `<a class="source-link" href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener">Kaynağı görüntüle ↗</a>`
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

const STYLES = `
  :root {
    color-scheme: light dark;
    --bg: #f6f7fb;
    --surface: #ffffff;
    --border: #e4e6ef;
    --text: #1a1d29;
    --text-muted: #6b7086;
    --primary: #4f46e5;
    --primary-hover: #4338ca;
    --danger: #dc2626;
    --danger-bg: #fef2f2;
    --danger-border: #fecaca;
    --accent-bg: #fff7ed;
    --accent-border: #fdba74;
    --accent-text: #9a3412;
    --pill-bg: #eef2ff;
    --pill-text: #4338ca;
    --radius: 12px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #12131a;
      --surface: #1b1d29;
      --border: #2c2f42;
      --text: #eceefb;
      --text-muted: #9195b0;
      --primary: #818cf8;
      --primary-hover: #a5b4fc;
      --danger: #f87171;
      --danger-bg: #2a1517;
      --danger-border: #4c1d24;
      --accent-bg: #2a2010;
      --accent-border: #92400e;
      --accent-text: #fdba74;
      --pill-bg: #232544;
      --pill-text: #c7d2fe;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 2rem 1.5rem 4rem;
  }
  .page { max-width: 920px; margin: 0 auto; }
  .page-header { margin-bottom: 1.75rem; }
  .page-header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  .page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.9rem 1rem;
  }
  .tile--action {
    background: var(--accent-bg);
    border-color: var(--accent-border);
  }
  .tile-count { font-size: 1.5rem; font-weight: 700; line-height: 1.1; }
  .tile--action .tile-count { color: var(--accent-text); }
  .tile-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }

  .section-title {
    font-size: 1.05rem;
    margin: 0 0 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

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
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.4rem;
  }
  .card-header { display: flex; justify-content: space-between; gap: 1rem; }
  .card-title { margin: 0 0 0.4rem; font-size: 1.1rem; }
  .card-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .badge {
    font-size: 0.72rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .badge--source { color: var(--primary); border-color: var(--primary); }

  .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.75rem 0; }
  .pill {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: var(--pill-bg);
    color: var(--pill-text);
    font-weight: 600;
  }

  .contact { font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0; }

  .proposal-wrap { margin: 0.5rem 0; }
  .proposal-wrap summary {
    cursor: pointer;
    font-size: 0.82rem;
    color: var(--primary);
    font-weight: 600;
  }
  .proposal {
    white-space: pre-wrap;
    font-size: 0.82rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
    margin: 0.5rem 0 0;
    max-height: 220px;
    overflow-y: auto;
  }

  .source-link {
    display: inline-block;
    font-size: 0.8rem;
    color: var(--primary);
    text-decoration: none;
    margin-top: 0.25rem;
  }
  .source-link:hover { text-decoration: underline; }

  .card-actions {
    display: flex;
    gap: 0.6rem;
    margin-top: 1.1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .card-actions form { margin: 0; }
  .btn {
    cursor: pointer;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
  }
  .btn--approve { background: var(--primary); color: #fff; }
  .btn--approve:hover { background: var(--primary-hover); }
  .btn--reject { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
  .btn--reject:hover { filter: brightness(0.97); }
`;

export function renderPage(counts: Record<string, number>, pending: Candidate[]): string {
  const body = pending.length
    ? `<div class="cards">${pending.map(candidateCard).join("\n")}</div>`
    : `<div class="empty-state">
        <span class="emoji">🔍</span>
        Onay bekleyen aday yok.<br>
        Tarama worker'ları her çalıştığında burası otomatik güncellenir.
      </div>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Müşteri Avcısı - Onay Paneli</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="page">
    <header class="page-header">
      <h1>Müşteri Avcısı Sistemi</h1>
      <p>Onay Paneli — hiçbir teklif senin onayın olmadan gönderilmez.</p>
    </header>

    <div class="tiles">${statTiles(counts)}</div>

    <h2 class="section-title">Onay bekleyenler</h2>
    ${body}
  </div>
</body>
</html>`;
}
