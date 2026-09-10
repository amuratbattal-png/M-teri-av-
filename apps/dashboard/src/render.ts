import {
  NEED_TAG_LABELS_TR,
  CANDIDATE_STATUSES,
  SECTORS,
  PARALLEL_TRACK,
  CITIES,
  type Candidate,
} from "@musteri-avcisi/shared";

/** Adayın rawMetadata'sında saklanan şehir bilgisini okur (bkz. google-search-scanner/src/scan.ts). */
function candidateCitySlug(c: Candidate): string | undefined {
  const slug = (c.rawMetadata as Record<string, unknown> | null)?.citySlug;
  return typeof slug === "string" ? slug : undefined;
}

function candidateCityLabel(c: Candidate): string | undefined {
  const label = (c.rawMetadata as Record<string, unknown> | null)?.cityLabel;
  return typeof label === "string" ? label : undefined;
}

/** Arama kutusu için: isim eşleşmesi (büyük/küçük harf duyarsız). */
function matchesQuery(name: string, query?: string): boolean {
  if (!query) return true;
  return name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"));
}

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

const CHANNEL_LABELS_TR: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-posta",
  voice_call: "Sesli Arama",
};

const COMM_STATUS_LABELS_TR: Record<string, string> = {
  queued: "Kuyrukta",
  sent: "Gönderildi",
  failed: "Başarısız",
  received: "Alındı",
};

const COMM_STATUS_TONE: Record<string, "warn" | "ok" | "bad" | "neutral"> = {
  queued: "warn",
  sent: "ok",
  failed: "bad",
  received: "ok",
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
  active: "onaylar" | "onaylananlar" | "gonderilenler" | "adaylar";
  pendingCount: number;
  title: string;
  subtitle: string;
  content: string;
}): string {
  const navItem = (
    href: string,
    icon: string,
    label: string,
    key: "onaylar" | "onaylananlar" | "gonderilenler" | "adaylar",
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
        ${navItem("/onaylananlar", ICONS.check, "Onaylananlar", "onaylananlar")}
        ${navItem("/gonderilenler", ICONS.send, "Gönderilenler", "gonderilenler")}
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
  <script>
    // Toplu onay çubuğu (bkz. bulkActionBar) - .bulk-check kutucukları
    // işaretlendikçe çubuğu günceller. Kütüphane yok, sade JS.
    function updateBulkBar() {
      var boxes = Array.prototype.slice.call(document.querySelectorAll('.bulk-check:checked'));
      var ids = boxes.map(function (el) { return el.value; });
      var bar = document.getElementById('bulk-approve-form');
      if (!bar) return;
      document.getElementById('bulk-ids').value = ids.join(',');
      document.getElementById('bulk-count').textContent = ids.length;
      bar.hidden = ids.length === 0;
    }
    function clearBulkSelection() {
      Array.prototype.slice.call(document.querySelectorAll('.bulk-check:checked')).forEach(function (el) {
        el.checked = false;
      });
      updateBulkBar();
    }

    // "AI ile Yeniden Yaz" - popup'ı kapatmadan (sayfa yenilemeden) metni
    // NVIDIA API ile yeniden yazdırır. Başarısız olursa (ör. yanlış
    // anahtar) sebebini doğrudan gösterir - log'lara bakmaya gerek kalmaz.
    function regenerateProposal(id, btn) {
      // Teşhis logu: buton tıklaması JS'e hiç ulaşmıyor mu, yoksa
      // confirm()/fetch() aşamasında mı takılıyor - Console'da bunu
      // görüyorsak en azından tıklamanın buraya ulaştığı kesinleşir.
      console.log('[regenerateProposal] tıklandı, id=', id);
      try {
        var proceed = confirm('Mevcut metnin üzerine yazılacak, yapay zekayla yeniden yazılsın mı?');
        console.log('[regenerateProposal] confirm sonucu =', proceed);
        if (!proceed) return;
        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Yazılıyor...';
        fetch('/candidates/' + id + '/regenerate-proposal', { method: 'POST' })
          .then(function (res) {
            console.log('[regenerateProposal] fetch status =', res.status);
            return res.json();
          })
          .then(function (data) {
            console.log('[regenerateProposal] yanıt =', data);
            if (data && data.proposalDraft) {
              document.getElementById('proposal-' + id).value = data.proposalDraft;
            }
            if (!data || !data.usedAI) {
              alert('Yapay zeka ile yazılamadı, şablon metin kullanıldı.\n\nSebep: ' + ((data && data.aiError) || 'bilinmiyor'));
            }
          })
          .catch(function (err) {
            console.error('[regenerateProposal] hata', err);
            alert('Bir hata oluştu: ' + err);
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = original;
          });
      } catch (err) {
        console.error('[regenerateProposal] senkron hata', err);
        alert('Beklenmeyen bir hata oluştu: ' + err);
      }
    }
  </script>
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

/**
 * Türkiye numaralarını wa.me'nin beklediği "90XXXXXXXXXX" (ülke kodu,
 * boşluk/+/0 yok) formatına çevirir. "0532...", "+90 532...",
 * "532..." gibi yaygın biçimlerin hepsini kapsar.
 */
function toWhatsAppNumber(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "90" + digits.slice(1);
  else if (digits.length === 10) digits = "90" + digits;
  return digits.startsWith("90") ? digits : null;
}

/** wa.me gönderim linki - sahibi bunu tıklayıp kendi WhatsApp oturumundan gönderiyor. */
function waLink(c: Candidate, text: string): string | null {
  const raw = c.contactWhatsapp || c.contactPhone;
  if (!raw) return null;
  const number = toWhatsAppNumber(raw);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/** mailto: linki - sahibi bunu tıklayıp kendi e-posta istemcisinden gönderiyor. */
function mailtoLink(c: Candidate, text: string): string | null {
  if (!c.contactEmail) return null;
  const subject = encodeURIComponent(`${c.name} için teklif`);
  return `mailto:${encodeURIComponent(c.contactEmail)}?subject=${subject}&body=${encodeURIComponent(text)}`;
}

function approveRejectForms(id: string, redirectTo: string): string {
  return `
    <form method="post" action="/approve/${id}">
      <input type="hidden" name="redirect" value="${redirectTo}">
      <button type="submit" class="btn btn--approve">✓ Onayla</button>
    </form>
    <form method="post" action="/reject/${id}">
      <input type="hidden" name="redirect" value="${redirectTo}">
      <button type="submit" class="btn btn--reject">✕ Reddet</button>
    </form>`;
}

/**
 * Kompakt kart: sadece özet bilgi. Detay/düzenleme/gönderim için
 * tıklanınca açılan popup'a bkz. candidateDetailDialog - sistemdeki
 * TÜM aday popup'ları (Onaylar, Onaylananlar, Tüm Adaylar) aynı bu
 * fonksiyonu/dialog'u paylaşıyor, tek fark durum bazlı aksiyon
 * (onayla/reddet vs. gönderildi işaretle).
 */
function candidateCard(c: Candidate, redirectTo: string): string {
  const needsPreview = c.needTags.slice(0, 2);
  const extra = c.needTags.length - needsPreview.length;
  const pills =
    needsPreview.map((t) => `<span class="pill">${escapeHtml(NEED_TAG_LABELS_TR[t] ?? t)}</span>`).join("") +
    (extra > 0 ? `<span class="pill pill--muted">+${extra}</span>` : "");
  const cityLabel = candidateCityLabel(c);
  const tone = STATUS_TONE[c.status] ?? "neutral";

  return `
    <article class="card" onclick="document.getElementById('dlg-${c.id}').showModal()">
      ${
        c.status === "pending_approval"
          ? `<label class="card-select" onclick="event.stopPropagation()">
               <input type="checkbox" class="bulk-check" value="${c.id}" onchange="updateBulkBar()">
             </label>`
          : ""
      }
      <h3 class="card-title card-title--clamp">${escapeHtml(c.name)}</h3>
      <div class="card-meta">
        <span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span>
        <span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
        ${cityLabel ? `<span class="badge badge--city">${escapeHtml(cityLabel)}</span>` : ""}
        <span class="status status--${tone}">${STATUS_LABELS_TR[c.status] ?? c.status}</span>
      </div>
      <div class="pills">${pills}</div>
      <button type="button" class="detail-link" onclick="event.stopPropagation(); document.getElementById('dlg-${c.id}').showModal()">Detayları gör</button>
      ${
        c.status === "pending_approval"
          ? `<div class="card-actions" onclick="event.stopPropagation()">${approveRejectForms(c.id, redirectTo)}</div>`
          : ""
      }
    </article>`;
}

/**
 * TEK, sistem genelinde ortak aday detay popup'ı (native &lt;dialog&gt;).
 * Her yerde aynı içerik: bilgiler, düzenlenebilir teklif metni,
 * WhatsApp (wa.me) / e-posta (mailto:) gönderim linkleri. Sadece en
 * alttaki aksiyon bloğu duruma göre değişir - onay bekliyorsa
 * Onayla/Reddet, değilse yok (gönderim zaten yukarıdaki linklerle).
 */
function candidateDetailDialog(c: Candidate, redirectTo: string): string {
  const pills = c.needTags
    .map((t) => `<span class="pill">${escapeHtml(NEED_TAG_LABELS_TR[t] ?? t)}</span>`)
    .join("");
  const cityLabel = candidateCityLabel(c);
  const tone = STATUS_TONE[c.status] ?? "neutral";
  const proposalText = c.proposalDraft ?? "";
  const wa = waLink(c, proposalText);
  const mail = mailtoLink(c, proposalText);

  return `
    <dialog id="dlg-${c.id}" class="detail-dialog">
      <div class="dialog-inner">
        <button type="button" class="dialog-close" onclick="this.closest('dialog').close()">✕</button>
        <h3 class="card-title">${escapeHtml(c.name)}</h3>
        <div class="card-meta">
          <span class="badge">${escapeHtml(sectorLabel(c.sectorSlug))}</span>
          <span class="badge badge--source">${escapeHtml(SOURCE_LABELS_TR[c.sourceChannel] ?? c.sourceChannel)}</span>
          ${cityLabel ? `<span class="badge badge--city">${escapeHtml(cityLabel)}</span>` : ""}
          <span class="status status--${tone}">${STATUS_LABELS_TR[c.status] ?? c.status}</span>
        </div>
        <div class="pills">${pills}</div>
        <p class="contact">${contactLine(c)}</p>

        <form method="post" action="/candidates/${c.id}/proposal" class="proposal-edit" onclick="event.stopPropagation()">
          <input type="hidden" name="redirect" value="${redirectTo}">
          <div class="proposal-label">Teklif metni (düzenleyebilirsin)</div>
          <textarea name="proposalDraft" id="proposal-${c.id}" rows="7">${escapeHtml(proposalText)}</textarea>
          <div class="proposal-edit-row">
            <button type="submit" class="btn--filter">Metni Kaydet</button>
            <button type="button" class="btn--filter" onclick="event.stopPropagation(); regenerateProposal('${c.id}', this)">${ICONS.star} AI ile Yeniden Yaz</button>
          </div>
        </form>

        <div class="send-actions" onclick="event.stopPropagation()">
          ${
            wa
              ? `<a class="btn btn--approve" href="${wa}" target="_blank" rel="noopener">${ICONS.chat} WhatsApp'ta Gönder</a>
                 <form method="post" action="/candidates/${c.id}/mark-sent" onsubmit="return confirm('WhatsApp üzerinden gönderdiğini onaylıyor musun?')">
                   <input type="hidden" name="channel" value="whatsapp">
                   <input type="hidden" name="redirect" value="${redirectTo}">
                   <button type="submit" class="detail-link">WhatsApp'tan gönderildi olarak işaretle</button>
                 </form>`
              : ""
          }
          ${
            mail
              ? `<a class="btn btn--approve" href="${mail}">${ICONS.send} E-posta ile Gönder</a>
                 <form method="post" action="/candidates/${c.id}/mark-sent" onsubmit="return confirm('E-posta gönderdiğini onaylıyor musun?')">
                   <input type="hidden" name="channel" value="email">
                   <input type="hidden" name="redirect" value="${redirectTo}">
                   <button type="submit" class="detail-link">E-posta ile gönderildi olarak işaretle</button>
                 </form>`
              : ""
          }
          ${
            !wa && !mail
              ? `<p class="muted">İletişim bilgisi yok - WhatsApp/e-posta linki oluşturulamadı.</p>`
              : ""
          }
        </div>

        ${
          c.status === "pending_approval"
            ? `<div class="card-actions" onclick="event.stopPropagation()">${approveRejectForms(c.id, redirectTo)}</div>`
            : ""
        }
        ${
          c.approvedAt
            ? `<p class="contact">Onaylayan: ${escapeHtml(c.approvedBy ?? "—")} · ${fmtDate(c.approvedAt)}</p>`
            : ""
        }
        ${
          c.sourceUrl
            ? `<a class="source-link" href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener">Kaynağı görüntüle ${ICONS.external}</a>`
            : ""
        }

        <form method="post" action="/candidates/${c.id}/notes" class="proposal-edit" onclick="event.stopPropagation()">
          <input type="hidden" name="redirect" value="${redirectTo}">
          <div class="proposal-label">Not (ör. "ilgilenmiyor", "ay sonu tekrar ara")</div>
          <textarea name="evaluationNotes" rows="3" placeholder="Serbest not...">${escapeHtml(c.evaluationNotes ?? "")}</textarea>
          <button type="submit" class="btn--filter">Notu Kaydet</button>
        </form>
      </div>
    </dialog>`;
}

function candidateListOrEmpty(
  list: Candidate[],
  redirectTo: string,
  emptyIcon: string,
  emptyMessage: string,
): string {
  if (!list.length) {
    return `<div class="empty-state"><span class="emoji">${emptyIcon}</span>${emptyMessage}</div>`;
  }
  return `<div class="cards">${list.map((c) => candidateCard(c, redirectTo)).join("\n")}</div>${list
    .map((c) => candidateDetailDialog(c, redirectTo))
    .join("\n")}`;
}

/**
 * Toplu onay çubuğu - listede en az bir onay bekleyen aday varsa
 * (bkz. candidateCard'daki .bulk-check kutucukları) görünür hale
 * gelir. JS (updateBulkBar/clearBulkSelection) shell()'de tanımlı.
 */
function bulkActionBar(redirectTo: string): string {
  return `
    <form id="bulk-approve-form" method="post" action="/bulk-approve" class="bulk-bar" hidden>
      <input type="hidden" name="redirect" value="${redirectTo}">
      <input type="hidden" name="ids" id="bulk-ids">
      <span><span id="bulk-count">0</span> aday seçildi</span>
      <button type="submit" class="btn btn--approve">✓ Seçilenleri Onayla</button>
      <button type="button" class="btn--filter" onclick="clearBulkSelection()">Seçimi Temizle</button>
    </form>`;
}

export function renderApprovalsPage(
  counts: Record<string, number>,
  pending: Candidate[],
  selectedSector?: string,
  selectedCity?: string,
  selectedQuery?: string,
): string {
  const filtered = pending.filter(
    (c) =>
      matchesQuery(c.name, selectedQuery) &&
      (!selectedSector || c.sectorSlug === selectedSector) &&
      (!selectedCity || candidateCitySlug(c) === selectedCity),
  );
  const sortedPending = [...filtered].sort((a, b) =>
    a.discoveredAt < b.discoveredAt ? 1 : a.discoveredAt > b.discoveredAt ? -1 : 0,
  );
  const list = candidateListOrEmpty(
    sortedPending,
    "/",
    "🔍",
    selectedSector || selectedCity || selectedQuery
      ? "Bu filtreyle onay bekleyen aday yok."
      : "Onay bekleyen aday yok.<br>Tarama worker'ları her çalıştığında burası otomatik güncellenir.",
  );

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Onay bekleyenler</h2>
    ${filterBar({ action: "/", selectedSector, selectedCity, selectedQuery })}
    ${bulkActionBar("/")}
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

/** Sektör + şehir + isim araması filtre çubuğu - "Tümü" + PARALLEL_TRACK + alfabetik SECTORS / 81 il. */
function filterBar(opts: {
  action: string;
  selectedSector?: string;
  selectedCity?: string;
  selectedQuery?: string;
}): string {
  const sectorOptions = [
    `<option value=""${opts.selectedSector ? "" : " selected"}>Tüm sektörler</option>`,
    `<option value="${PARALLEL_TRACK.slug}"${
      opts.selectedSector === PARALLEL_TRACK.slug ? " selected" : ""
    }>${escapeHtml(PARALLEL_TRACK.labelTr)}</option>`,
    ...SECTORS.map(
      (s) =>
        `<option value="${s.slug}"${
          opts.selectedSector === s.slug ? " selected" : ""
        }>${escapeHtml(s.labelTr)}</option>`,
    ),
  ].join("");

  const cityOptions = [
    `<option value=""${opts.selectedCity ? "" : " selected"}>Tüm şehirler</option>`,
    ...CITIES.map(
      (c) =>
        `<option value="${c.slug}"${
          opts.selectedCity === c.slug ? " selected" : ""
        }>${escapeHtml(c.labelTr)}</option>`,
    ),
  ].join("");

  return `
    <form class="filter-bar" method="get" action="${opts.action}">
      <span class="search-box">
        ${ICONS.search}
        <input
          type="search"
          name="q"
          placeholder="Ada göre ara..."
          value="${escapeHtml(opts.selectedQuery ?? "")}"
        >
      </span>
      <label for="sector-filter">Sektör</label>
      <select id="sector-filter" name="sector" onchange="this.form.submit()">${sectorOptions}</select>
      <label for="city-filter">Şehir</label>
      <select id="city-filter" name="city" onchange="this.form.submit()">${cityOptions}</select>
      <button type="submit" class="btn--filter">Ara</button>
    </form>`;
}

export function renderAllCandidatesPage(
  counts: Record<string, number>,
  all: Candidate[],
  selectedSector?: string,
  selectedCity?: string,
  selectedQuery?: string,
): string {
  // Onaylanmış adaylar artık kendi sayfasında (bkz. renderApprovedPage) -
  // burada tekrar gösterilmiyor.
  const filtered = all.filter(
    (c) =>
      c.status !== "approved" &&
      matchesQuery(c.name, selectedQuery) &&
      (!selectedSector || c.sectorSlug === selectedSector) &&
      (!selectedCity || candidateCitySlug(c) === selectedCity),
  );
  const sorted = [...filtered].sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
  const list = candidateListOrEmpty(
    sorted,
    "/adaylar",
    "🔍",
    "Bu filtreyle hiç aday bulunamadı.",
  );

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Tüm adaylar (${sorted.length})</h2>
    ${filterBar({ action: "/adaylar", selectedSector, selectedCity, selectedQuery })}
    ${bulkActionBar("/adaylar")}
    ${list}
  `;

  return shell({
    active: "adaylar",
    pendingCount: counts.pending_approval ?? 0,
    title: "Tüm Adaylar",
    subtitle: "Sistemin bugüne kadar bulduğu tüm adaylar ve durumları (onaylananlar hariç).",
    content,
  });
}

// --- Onaylananlar sayfası ----------------------------------------------------

export function renderApprovedPage(
  counts: Record<string, number>,
  approved: Candidate[],
  selectedSector?: string,
  selectedCity?: string,
  selectedQuery?: string,
): string {
  const filtered = approved.filter(
    (c) =>
      matchesQuery(c.name, selectedQuery) &&
      (!selectedSector || c.sectorSlug === selectedSector) &&
      (!selectedCity || candidateCitySlug(c) === selectedCity),
  );
  const sorted = [...filtered].sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
  const list = candidateListOrEmpty(
    sorted,
    "/onaylananlar",
    "✓",
    selectedSector || selectedCity || selectedQuery
      ? "Bu filtreyle onaylanmış aday yok."
      : "Henüz onaylanmış aday yok.",
  );

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Onaylananlar (${sorted.length})</h2>
    ${filterBar({ action: "/onaylananlar", selectedSector, selectedCity, selectedQuery })}
    ${list}
  `;

  return shell({
    active: "onaylananlar",
    pendingCount: counts.pending_approval ?? 0,
    title: "Onaylananlar",
    subtitle: "Onaylanıp gönderim kuyruğuna alınan adaylar - gönderim durumu için Gönderilenler sayfasına bak.",
    content,
  });
}

// --- Gönderilenler sayfası --------------------------------------------------

/** control'ün /communications endpoint'inden dönen, candidate ile join edilmiş satır. */
export interface CommunicationRow {
  id: string;
  candidateId: string;
  candidateName: string | null;
  sectorSlug: string | null;
  channel: string;
  direction: string;
  status: string;
  createdAt: string;
  rawMetadata?: Record<string, unknown> | null;
}

function communicationRow(r: CommunicationRow): string {
  const tone = COMM_STATUS_TONE[r.status] ?? "neutral";
  const cityLabel = r.rawMetadata?.cityLabel;
  return `
    <tr>
      <td>${escapeHtml(r.candidateName ?? "(silinmiş aday)")}</td>
      <td>${r.sectorSlug ? `<span class="badge">${escapeHtml(sectorLabel(r.sectorSlug))}</span>` : "—"}</td>
      <td>${typeof cityLabel === "string" ? escapeHtml(cityLabel) : "—"}</td>
      <td><span class="badge badge--source">${escapeHtml(CHANNEL_LABELS_TR[r.channel] ?? r.channel)}</span></td>
      <td><span class="status status--${tone}">${COMM_STATUS_LABELS_TR[r.status] ?? r.status}</span></td>
      <td class="muted">${fmtDate(r.createdAt)}</td>
    </tr>`;
}

export function renderSentPage(
  counts: Record<string, number>,
  communications: CommunicationRow[],
  selectedChannel?: string,
  selectedStatus?: string,
  selectedQuery?: string,
): string {
  const filtered = communications.filter(
    (r) =>
      matchesQuery(r.candidateName ?? "", selectedQuery) &&
      (!selectedChannel || r.channel === selectedChannel) &&
      (!selectedStatus || r.status === selectedStatus),
  );
  const rows = filtered.length
    ? filtered.map(communicationRow).join("\n")
    : `<tr><td colspan="6" class="muted">Henüz hiç gönderim yapılmadı.</td></tr>`;

  const channelOptions = [
    `<option value=""${selectedChannel ? "" : " selected"}>Tüm kanallar</option>`,
    ...Object.entries(CHANNEL_LABELS_TR).map(
      ([value, label]) =>
        `<option value="${value}"${selectedChannel === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
    ),
  ].join("");

  const statusOptions = [
    `<option value=""${selectedStatus ? "" : " selected"}>Tüm durumlar</option>`,
    ...Object.entries(COMM_STATUS_LABELS_TR).map(
      ([value, label]) =>
        `<option value="${value}"${selectedStatus === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
    ),
  ].join("");

  const content = `
    <div class="tiles">${statTiles(counts)}</div>
    <h2 class="section-title">Gönderilenler (${filtered.length})</h2>
    <form class="filter-bar" method="get" action="/gonderilenler">
      <span class="search-box">
        ${ICONS.search}
        <input type="search" name="q" placeholder="Ada göre ara..." value="${escapeHtml(selectedQuery ?? "")}">
      </span>
      <label for="channel-filter">Kanal</label>
      <select id="channel-filter" name="channel" onchange="this.form.submit()">${channelOptions}</select>
      <label for="status-filter">İletim durumu</label>
      <select id="status-filter" name="status" onchange="this.form.submit()">${statusOptions}</select>
      <button type="submit" class="btn--filter">Ara</button>
    </form>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Ad</th><th>Sektör</th><th>Şehir</th><th>Kanal</th><th>İletim durumu</th><th>Tarih</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  return shell({
    active: "gonderilenler",
    pendingCount: counts.pending_approval ?? 0,
    title: "Gönderilenler",
    subtitle: "E-posta ve WhatsApp üzerinden gönderilen tekliflerin iletim durumu.",
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
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.1rem;
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
  .search-box {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.4rem 0.7rem;
    color: var(--text-muted);
    flex: 1 1 220px;
    max-width: 320px;
  }
  .search-box svg { width: 15px; height: 15px; flex-shrink: 0; }
  .search-box input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: inherit;
    font-size: 0.88rem;
    width: 100%;
  }
  .search-box input::placeholder { color: var(--text-muted); }
  .btn--filter {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.45rem 0.9rem;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
  }
  .btn--filter:hover { border-color: var(--accent); color: var(--accent); }

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
    position: relative;
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
  .card-select {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    cursor: pointer;
  }
  .card-select input { width: 17px; height: 17px; cursor: pointer; accent-color: var(--accent); }
  .card .card-title { padding-right: 1.6rem; }

  .bulk-bar {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 12px;
    padding: 0.7rem 1rem;
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--text);
  }
  .bulk-bar #bulk-count { font-weight: 700; color: var(--accent); }
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
  .badge--city { color: var(--accent); border-color: rgba(45,212,191,0.35); background: var(--accent-soft); }

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

  .proposal-edit { margin: 0.6rem 0 0; }
  .proposal-edit textarea {
    width: 100%;
    margin-top: 0.5rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.75rem 0.9rem;
    color: var(--text);
    font-family: inherit;
    font-size: 0.83rem;
    line-height: 1.5;
    resize: vertical;
  }
  .proposal-edit .btn--filter { margin-top: 0.5rem; }
  .proposal-edit-row { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.5rem; }
  .proposal-edit-row .btn--filter { margin-top: 0; }

  .send-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.9rem;
    margin: 1rem 0;
    padding: 0.9rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .send-actions a.btn { text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; }
  .send-actions svg { width: 15px; height: 15px; }
  .send-actions form { margin: 0; }

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
