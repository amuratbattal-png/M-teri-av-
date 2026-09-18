import { publicPage, esc } from "./layout";
import { bcp47For } from "../lib/languages";

export interface SpeakerPageData {
  sessionId: string;
  token: string;
  title: string;
  sourceLang: string;
}

const EXTRA_STYLE = `
body { display:flex; align-items:center; justify-content:center; padding: 1.25rem; }
main { width: 100%; }
.status-row { display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; }
.mic-wrap { text-align:center; margin: 1.5rem 0; }
#mic-btn {
  width: 110px; height: 110px; border-radius: 50%; font-size: 2.2rem;
  background: #1c2340; border: 3px solid #34406e; cursor:pointer;
}
#mic-btn.on { background: #7f1d3f; border-color: #ef4444; animation: pulse 1.4s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 100% { box-shadow: 0 0 0 18px rgba(239,68,68,0); } }
#interim { min-height: 2.4rem; text-align:center; font-size:1.15rem; color:#5eead4; margin: 0.75rem 0; }
#transcript { max-height: 220px; overflow-y:auto; border:1px solid #232842; border-radius:10px; padding:0.75rem; background:#10131f; }
#transcript .line { padding: 0.3rem 0; border-bottom: 1px dashed #1f2436; font-size:0.92rem; }
#log { max-height: 100px; overflow-y:auto; font-size:0.78rem; color:#7d84a8; margin-top:0.75rem; }
`;

export function renderSpeakerPage(data: SpeakerPageData): string {
  const config = {
    sessionId: data.sessionId,
    token: data.token,
    sourceBcp47: bcp47For(data.sourceLang),
  };

  const body = `
<main>
  <div class="status-row">
    <div>
      <h1 style="margin:0">${esc(data.title)}</h1>
      <p class="muted" style="margin:0.2rem 0 0">Konuşmacı ekranı</p>
    </div>
    <div class="muted">Katılımcı: <strong id="participant-count">0</strong></div>
  </div>

  <div class="card">
    <p class="muted" id="support-warning" style="display:none">
      Bu tarayıcı konuşma tanımayı desteklemiyor olabilir. En kararlı sonuç için
      bilgisayarda Chrome veya Edge kullanmanız önerilir.
    </p>
    <div class="mic-wrap">
      <button id="mic-btn" type="button">&#127908;</button>
      <p class="muted" id="mic-label">Başlatmak için mikrofona dokunun</p>
    </div>
    <div id="interim"></div>
  </div>

  <h2>Yakalanan cümleler</h2>
  <div id="transcript" class="card"></div>

  <div class="card row" style="justify-content:space-between">
    <span class="muted">Konuşma bitince oturumu sonlandırabilirsiniz.</span>
    <button id="end-btn" type="button" class="danger">Oturumu Sonlandır</button>
  </div>

  <div id="log"></div>
</main>

<script type="application/json" id="config">${JSON.stringify(config)}</script>
<script>
var config = JSON.parse(document.getElementById('config').textContent);
var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
var recognition = null;
var listening = false;
var manuallyStopped = true;
var ws = null;
var wsReady = false;
var pendingQueue = [];

function logLine(text) {
  var el = document.getElementById('log');
  var div = document.createElement('div');
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function addTranscriptLine(text) {
  var el = document.getElementById('transcript');
  var div = document.createElement('div');
  div.className = 'line';
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function wsUrl() {
  var scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return scheme + '//' + location.host + '/ws/' + config.sessionId + '?role=speaker&token=' + encodeURIComponent(config.token);
}

function sendJson(obj) {
  var payload = JSON.stringify(obj);
  if (wsReady && ws) {
    ws.send(payload);
  } else {
    pendingQueue.push(payload);
  }
}

function connectWs() {
  ws = new WebSocket(wsUrl());
  ws.onopen = function () {
    wsReady = true;
    logLine('Bağlantı kuruldu.');
    while (pendingQueue.length > 0) {
      ws.send(pendingQueue.shift());
    }
  };
  ws.onclose = function () {
    wsReady = false;
    logLine('Bağlantı kesildi, yeniden bağlanılıyor...');
    setTimeout(connectWs, 2000);
  };
  ws.onerror = function () {};
  ws.onmessage = function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data.type === 'participant_count') {
      setText('participant-count', String(data.count));
    } else if (data.type === 'session_ended') {
      logLine('Oturum sonlandırıldı.');
      stopRecognition();
    }
  };
}

function updateMicButton() {
  var btn = document.getElementById('mic-btn');
  var label = document.getElementById('mic-label');
  if (listening) {
    btn.classList.add('on');
    label.textContent = 'Dinleniyor - durdurmak için dokunun';
  } else {
    btn.classList.remove('on');
    label.textContent = 'Başlatmak için mikrofona dokunun';
  }
}

function startRecognition() {
  if (!SpeechRecognitionImpl) return;
  recognition = new SpeechRecognitionImpl();
  recognition.lang = config.sourceBcp47;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    var interimText = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var result = event.results[i];
      var t = result[0].transcript;
      if (result.isFinal) {
        addTranscriptLine(t);
        sendJson({ type: 'final', text: t });
        setText('interim', '');
      } else {
        interimText += t;
      }
    }
    if (interimText) {
      setText('interim', interimText);
      sendJson({ type: 'interim', text: interimText });
    }
  };

  recognition.onerror = function (event) {
    logLine('Tanıma hatası: ' + event.error);
  };

  recognition.onend = function () {
    if (!manuallyStopped) {
      try {
        recognition.start();
      } catch (e) {
        logLine('Yeniden başlatılamadı, mikrofona tekrar dokunun.');
        listening = false;
        updateMicButton();
      }
    }
  };

  manuallyStopped = false;
  recognition.start();
  listening = true;
  updateMicButton();
}

function stopRecognition() {
  manuallyStopped = true;
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {}
  }
  listening = false;
  updateMicButton();
}

document.getElementById('mic-btn').addEventListener('click', function () {
  if (listening) {
    stopRecognition();
  } else {
    startRecognition();
  }
});

document.getElementById('end-btn').addEventListener('click', function () {
  if (!confirm('Oturumu sonlandırmak istediğinize emin misiniz?')) return;
  sendJson({ type: 'end_session' });
});

if (!SpeechRecognitionImpl) {
  document.getElementById('support-warning').style.display = 'block';
  document.getElementById('mic-btn').disabled = true;
}

connectWs();
</script>`;

  return publicPage(data.title, body, EXTRA_STYLE);
}
