import { adminPage, esc } from "./layout";
import { LANGUAGES } from "../lib/languages";

export interface SpeakerRow {
  id: string;
  name: string;
  createdAt: string;
}

export interface SessionListItem {
  id: string;
  joinCode: string;
  title: string;
  speakerId: string;
  speakerName: string;
  sourceLang: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR");
  } catch {
    return iso;
  }
}

function errorBanner(error?: string): string {
  return error ? `<div class="banner banner--bad">${esc(error)}</div>` : "";
}

export function renderSpeakersPage(speakers: SpeakerRow[], error?: string): string {
  const rows = speakers
    .map(
      (s) => `<tr>
        <td>${esc(s.name)}</td>
        <td class="muted">${esc(formatDate(s.createdAt))}</td>
        <td>
          <form method="post" action="/admin/speakers/${esc(s.id)}/delete" onsubmit="return confirm('Bu konuşmacıyı silmek istediğinize emin misiniz?');">
            <button type="submit" class="danger">Sil</button>
          </form>
        </td>
      </tr>`,
    )
    .join("");

  const body = `
${errorBanner(error)}
<h1>Konuşmacılar</h1>
<div class="card">
  <form method="post" action="/admin/speakers" class="row" style="align-items:flex-end">
    <div class="field">
      <label for="name">Yeni konuşmacı adı</label>
      <input type="text" id="name" name="name" required placeholder="Örn. Ahmet Yılmaz">
    </div>
    <button type="submit" class="primary">Ekle</button>
  </form>
</div>
<div class="card">
  ${
    speakers.length === 0
      ? '<p class="muted">Henüz konuşmacı eklenmedi.</p>'
      : `<table><thead><tr><th>Ad</th><th>Eklenme</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
  }
</div>`;

  return adminPage("speakers", "Konuşmacılar", body);
}

export function renderSessionsPage(
  sessions: SessionListItem[],
  speakers: SpeakerRow[],
  error?: string,
): string {
  const speakerOptions = speakers
    .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
    .join("");
  const langOptions = LANGUAGES.map(
    (l) => `<option value="${esc(l.code)}" ${l.code === "tr" ? "selected" : ""}>${esc(l.label)}</option>`,
  ).join("");

  const rows = sessions
    .map((s) => {
      const badge =
        s.status === "active"
          ? '<span class="badge active">Aktif</span>'
          : '<span class="badge ended">Sona erdi</span>';
      return `<tr>
        <td><a href="/admin/sessions/${esc(s.id)}">${esc(s.title)}</a></td>
        <td>${esc(s.speakerName)}</td>
        <td>${badge}</td>
        <td class="muted">${esc(formatDate(s.createdAt))}</td>
      </tr>`;
    })
    .join("");

  const speakerPicker =
    speakers.length === 0
      ? '<p class="muted">Önce <a href="/admin/speakers">bir konuşmacı ekleyin</a>.</p>'
      : `<form method="post" action="/admin/sessions" class="row" style="align-items:flex-end">
    <div class="field">
      <label for="title">Oturum başlığı</label>
      <input type="text" id="title" name="title" required placeholder="Örn. Yıllık Toplantı">
    </div>
    <div class="field" style="max-width:220px">
      <label for="speakerId">Konuşmacı</label>
      <select id="speakerId" name="speakerId" required>${speakerOptions}</select>
    </div>
    <div class="field" style="max-width:220px">
      <label for="sourceLang">Konuşmacının dili</label>
      <select id="sourceLang" name="sourceLang">${langOptions}</select>
    </div>
    <button type="submit" class="primary">Oturumu Aç</button>
  </form>`;

  const body = `
${errorBanner(error)}
<h1>Oturumlar</h1>
<div class="card">${speakerPicker}</div>
<div class="card">
  ${
    sessions.length === 0
      ? '<p class="muted">Henüz oturum açılmadı.</p>'
      : `<table><thead><tr><th>Başlık</th><th>Konuşmacı</th><th>Durum</th><th>Açılma</th></tr></thead><tbody>${rows}</tbody></table>`
  }
</div>`;

  return adminPage("sessions", "Oturumlar", body);
}

export function renderSessionDetailPage(
  session: SessionListItem,
  joinUrl: string,
  speakUrl: string,
  qrSvg: string,
  participantCount: number,
): string {
  const badge =
    session.status === "active"
      ? '<span class="badge active">Aktif</span>'
      : '<span class="badge ended">Sona erdi</span>';

  const endButton =
    session.status === "active"
      ? `<form method="post" action="/admin/sessions/${esc(session.id)}/end" onsubmit="return confirm('Oturumu sonlandırmak istediğinize emin misiniz? Tüm katılımcıların bağlantısı kesilecek.');">
          <button type="submit" class="danger">Oturumu Sonlandır</button>
        </form>`
      : "";

  const body = `
<p><a href="/admin/sessions">&larr; Oturumlar</a></p>
<h1>${esc(session.title)} ${badge}</h1>
<p class="muted">Konuşmacı: ${esc(session.speakerName)} &middot; Kaynak dil: ${esc(session.sourceLang)}</p>

<div class="card">
  <h2 style="margin-top:0">Katılım (QR kod)</h2>
  <div class="row" style="align-items:flex-start;gap:1.5rem">
    <div class="qr-wrap">${qrSvg}</div>
    <div style="flex:1;min-width:240px">
      <p class="muted">Katılımcılar bu kodu okutarak veya aşağıdaki linke giderek katılabilir - giriş/şifre gerekmez, sınırsız katılımcı desteklenir.</p>
      <div class="copy-box">
        <input type="text" class="mono" id="join-url" value="${esc(joinUrl)}" readonly>
        <button type="button" onclick="copyField('join-url')">Kopyala</button>
      </div>
      <p class="muted" style="margin-top:0.6rem">Şu anda bağlı katılımcı: <strong id="participant-count">${participantCount}</strong></p>
    </div>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0">Konuşmacı ekranı</h2>
  <p class="muted">Bu linki konuşmacının kendi telefon/tablet/bilgisayarında açın - mikrofon izni istenecek. Link kimseyle paylaşılmamalı (konuşmacı kimliği bu link üzerinden doğrulanıyor).</p>
  <div class="copy-box">
    <input type="text" class="mono" id="speak-url" value="${esc(speakUrl)}" readonly>
    <button type="button" onclick="copyField('speak-url')">Kopyala</button>
  </div>
  <p style="margin-top:0.6rem"><a class="btn" href="${esc(speakUrl)}" target="_blank" rel="noopener">Konuşmacı ekranını aç &rarr;</a></p>
</div>

<div class="card">${endButton || '<p class="muted">Bu oturum sona erdi.</p>'}</div>

<script>
function copyField(id) {
  var el = document.getElementById(id);
  el.select();
  el.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(el.value);
  } catch (e) {
    document.execCommand('copy');
  }
}

function pollStatus() {
  fetch('/admin/sessions/${esc(session.id)}/status')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var el = document.getElementById('participant-count');
      if (el && typeof data.participantCount === 'number') {
        el.textContent = String(data.participantCount);
      }
    })
    .catch(function () {});
}
${session.status === "active" ? "setInterval(pollStatus, 4000);" : ""}
</script>`;

  return adminPage("sessions", session.title, body);
}
