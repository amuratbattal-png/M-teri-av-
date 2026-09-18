import { publicPage, esc } from "./layout";
import { LANGUAGES } from "../lib/languages";

export interface ParticipantPageData {
  sessionId: string;
  title: string;
  speakerName: string;
  sourceLang: string;
  ended: boolean;
}

const EXTRA_STYLE = `
main { padding-top: 1.5rem; }
#join-panel { text-align:center; }
#session-panel { display:none; }
#session-panel.visible { display:block; }
.top-row { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:0.75rem; }
.top-row select { max-width: 220px; }
#transcript { min-height: 300px; max-height: 55vh; overflow-y:auto; border:1px solid #232842; border-radius:12px; padding:0.85rem; background:#10131f; }
#transcript .line { padding:0.5rem 0; border-bottom:1px dashed #1f2436; }
#transcript .line:last-child { border-bottom:none; }
#transcript .text { font-size:1.02rem; }
#transcript .source { font-size:0.78rem; color:#7d84a8; margin-top:0.15rem; }
#transcript .time { font-size:0.7rem; color:#565c80; float:right; }
#interim-line { min-height:1.6rem; color:#5eead4; font-size:0.95rem; padding:0.4rem 0.1rem; }
.controls { display:flex; gap:0.6rem; margin-top:0.75rem; flex-wrap:wrap; }
.controls button { flex:1; min-width:140px; }
#conn-status { font-size:0.78rem; color:#7d84a8; text-align:center; margin-top:0.5rem; }
`;

export function renderParticipantPage(data: ParticipantPageData): string {
  const langOptions = LANGUAGES.map(
    (l) => `<option value="${esc(l.code)}">${esc(l.label)}</option>`,
  ).join("");

  const endedBanner = data.ended
    ? '<div class="banner banner--bad">Bu oturum sona erdi. Katılamazsınız.</div>'
    : "";

  const body = `
<main>
  <div id="join-panel" ${data.ended ? "" : ""}>
    <h1>${esc(data.title)}</h1>
    <p class="muted">Konuşmacı: ${esc(data.speakerName)}</p>
    ${endedBanner}
    <div class="card" style="text-align:left">
      <label for="lang-select">Hangi dilde takip etmek istersiniz?</label>
      <select id="lang-select"${data.ended ? " disabled" : ""}>${langOptions}</select>
      <button id="join-btn" class="primary" style="margin-top:0.75rem;width:100%" ${data.ended ? "disabled" : ""}>Katıl</button>
    </div>
  </div>

  <div id="session-panel">
    <div class="top-row">
      <strong>${esc(data.title)}</strong>
      <select id="lang-select-live"></select>
    </div>
    <div id="transcript"></div>
    <div id="interim-line"></div>
    <div class="controls">
      <button id="tts-toggle">Sesli Oku: Açık</button>
      <button id="leave-btn">Ayrıl</button>
    </div>
    <div id="conn-status"></div>
  </div>
</main>

<script>
var sessionId = ${JSON.stringify(data.sessionId)};
var sourceLang = ${JSON.stringify(data.sourceLang)};
var ended = ${data.ended ? "true" : "false"};
var ws = null;
var wsReady = false;
var currentLang = null;
var autoSpeak = true;

var transcriptEl = document.getElementById('transcript');
var interimEl = document.getElementById('interim-line');
var statusEl = document.getElementById('conn-status');

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function buildLineEl(entry) {
  var wrap = document.createElement('div');
  wrap.className = 'line';

  var time = document.createElement('span');
  time.className = 'time';
  try {
    time.textContent = new Date(entry.createdAt).toLocaleTimeString('tr-TR');
  } catch (e) {
    time.textContent = '';
  }

  var text = document.createElement('div');
  text.className = 'text';
  text.textContent = entry.text;
  text.appendChild(time);

  wrap.appendChild(text);

  if (entry.lang !== entry.sourceLang) {
    var source = document.createElement('div');
    source.className = 'source';
    source.textContent = entry.sourceText;
    wrap.appendChild(source);
  }

  return wrap;
}

function appendLine(entry) {
  var wasNear = isNearBottom(transcriptEl);
  transcriptEl.appendChild(buildLineEl(entry));
  if (wasNear) transcriptEl.scrollTop = transcriptEl.scrollHeight;
  speakIfEnabled(entry);
}

function replaceHistory(entries) {
  transcriptEl.textContent = '';
  for (var i = 0; i < entries.length; i++) {
    transcriptEl.appendChild(buildLineEl(entries[i]));
  }
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function speakIfEnabled(entry) {
  if (!autoSpeak) return;
  if (!window.speechSynthesis) return;
  try {
    var utter = new SpeechSynthesisUtterance(entry.text);
    utter.lang = currentLang || sourceLang;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

function wsUrl(lang) {
  var scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return scheme + '//' + location.host + '/ws/' + sessionId + '?role=participant&lang=' + encodeURIComponent(lang);
}

function connectWs(lang) {
  currentLang = lang;
  statusEl.textContent = 'Bağlanılıyor...';
  ws = new WebSocket(wsUrl(lang));
  ws.onopen = function () {
    wsReady = true;
    statusEl.textContent = 'Bağlandı.';
  };
  ws.onclose = function () {
    wsReady = false;
    if (!ended) {
      statusEl.textContent = 'Bağlantı kesildi, yeniden bağlanılıyor...';
      setTimeout(function () { connectWs(currentLang); }, 2000);
    }
  };
  ws.onerror = function () {};
  ws.onmessage = function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data.type === 'history') {
      replaceHistory(data.entries);
    } else if (data.type === 'final') {
      interimEl.textContent = '';
      appendLine(data);
    } else if (data.type === 'interim') {
      interimEl.textContent = data.text;
    } else if (data.type === 'session_ended') {
      ended = true;
      statusEl.textContent = 'Oturum sona erdi.';
    }
  };
}

document.getElementById('join-btn').addEventListener('click', function () {
  var lang = document.getElementById('lang-select').value;
  document.getElementById('join-panel').style.display = 'none';
  document.getElementById('session-panel').classList.add('visible');
  var liveSelect = document.getElementById('lang-select-live');
  liveSelect.innerHTML = document.getElementById('lang-select').innerHTML;
  liveSelect.value = lang;
  connectWs(lang);
});

document.getElementById('lang-select-live').addEventListener('change', function (event) {
  var lang = event.target.value;
  currentLang = lang;
  if (wsReady && ws) {
    ws.send(JSON.stringify({ type: 'change_lang', lang: lang }));
  } else {
    connectWs(lang);
  }
});

document.getElementById('tts-toggle').addEventListener('click', function (event) {
  autoSpeak = !autoSpeak;
  event.target.textContent = 'Sesli Oku: ' + (autoSpeak ? 'Açık' : 'Kapalı');
  if (!autoSpeak && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

document.getElementById('leave-btn').addEventListener('click', function () {
  if (ws) {
    try { ws.close(); } catch (e) {}
  }
  document.getElementById('session-panel').classList.remove('visible');
  document.getElementById('join-panel').style.display = 'block';
});
</script>`;

  return publicPage(data.title, body, EXTRA_STYLE);
}
