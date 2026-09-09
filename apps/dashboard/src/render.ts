import { NEED_TAG_LABELS_TR, CANDIDATE_STATUSES, type Candidate } from "@musteri-avcisi/shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statLine(counts: Record<string, number>): string {
  return CANDIDATE_STATUSES.map((s) => `<span class="stat"><b>${counts[s] ?? 0}</b> ${s}</span>`)
    .join(" ");
}

function candidateRow(c: Candidate): string {
  const needs = c.needTags.map((t) => NEED_TAG_LABELS_TR[t] ?? t).join(", ");
  const contact = [c.contactWhatsapp, c.contactEmail].filter(Boolean).join(" / ") || "-";
  return `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.sectorSlug)}</td>
      <td>${escapeHtml(c.sourceChannel)}</td>
      <td>${escapeHtml(needs)}</td>
      <td>${escapeHtml(contact)}</td>
      <td><pre class="proposal">${escapeHtml(c.proposalDraft ?? "")}</pre></td>
      <td class="actions">
        <form method="post" action="/approve/${c.id}">
          <button type="submit">Onayla ve Gönder</button>
        </form>
        <form method="post" action="/reject/${c.id}">
          <button type="submit" class="reject">Reddet</button>
        </form>
      </td>
    </tr>`;
}

export function renderPage(counts: Record<string, number>, pending: Candidate[]): string {
  const rows = pending.length
    ? pending.map(candidateRow).join("\n")
    : `<tr><td colspan="7">Onay bekleyen aday yok.</td></tr>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Müşteri Avcısı - Onay Paneli</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.25rem; }
  .stats { margin-bottom: 1.5rem; color: #555; }
  .stat { margin-right: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; vertical-align: top; text-align: left; font-size: 0.9rem; }
  .proposal { white-space: pre-wrap; max-width: 320px; font-size: 0.8rem; margin: 0; }
  .actions form { display: inline-block; margin-right: 0.5rem; }
  .actions button { cursor: pointer; padding: 0.35rem 0.7rem; }
  .actions .reject { background: #fee; }
</style>
</head>
<body>
  <h1>Müşteri Avcısı Sistemi - Onay Paneli</h1>
  <p class="stats">${statLine(counts)}</p>
  <table>
    <thead>
      <tr>
        <th>Ad</th><th>Sektör</th><th>Kaynak</th><th>İhtiyaç</th><th>İletişim</th><th>Teklif Taslağı</th><th>İşlem</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}
