<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$code = (string) ($_GET['code'] ?? '');
$session = $code !== '' ? find_session_by_join_code($code) : null;

if (!$session) {
    http_response_code(404);
    echo public_page('Bulunamadı', '<main><h1>Bu katılım kodu geçerli değil.</h1></main>');
    exit;
}

$speaker = find_speaker($session['speaker_id']);
$speakerName = $speaker['name'] ?? 'Bilinmeyen konuşmacı';
$ended = $session['status'] !== 'active';

$extraStyle = <<<CSS
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
CSS;

$endedBanner = $ended ? '<div class="banner banner--bad">Bu oturum sona erdi. Katılamazsınız.</div>' : '';
$disabledAttr = $ended ? ' disabled' : '';
$langOptions = language_options_html();
$titleEsc = esc($session['title']);
$speakerNameEsc = esc($speakerName);

$sessionIdJson = json_encode($session['id']);
$sourceLangJson = json_encode($session['source_lang']);
$endedJson = $ended ? 'true' : 'false';

$body = <<<HTML
<main>
  <div id="join-panel">
    <h1>{$titleEsc}</h1>
    <p class="muted">Konuşmacı: {$speakerNameEsc}</p>
    {$endedBanner}
    <div class="card" style="text-align:left">
      <label for="lang-select">Hangi dilde takip etmek istersiniz?</label>
      <select id="lang-select"{$disabledAttr}>{$langOptions}</select>
      <button id="join-btn" class="primary" style="margin-top:0.75rem;width:100%"{$disabledAttr}>Katıl</button>
    </div>
  </div>

  <div id="session-panel">
    <div class="top-row">
      <strong>{$titleEsc}</strong>
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
var sessionId = {$sessionIdJson};
var sourceLang = {$sourceLangJson};
var ended = {$endedJson};
var currentLang = null;
var afterSeq = 0;
var pollTimer = null;
var autoSpeak = true;
var clientId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('c' + Date.now() + Math.random());

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
    time.textContent = new Date(entry.created_at.replace(' ', 'T')).toLocaleTimeString('tr-TR');
  } catch (e) {
    time.textContent = '';
  }

  var text = document.createElement('div');
  text.className = 'text';
  text.textContent = entry.text;
  text.appendChild(time);

  wrap.appendChild(text);

  if (entry.lang !== entry.source_lang) {
    var source = document.createElement('div');
    source.className = 'source';
    source.textContent = entry.source_text;
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

function speakIfEnabled(entry) {
  if (!autoSpeak) return;
  if (!window.speechSynthesis) return;
  try {
    var utter = new SpeechSynthesisUtterance(entry.text);
    utter.lang = currentLang || sourceLang;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

function poll() {
  if (ended) return;
  var url = '/api/participant_poll.php?session_id=' + encodeURIComponent(sessionId) +
    '&lang=' + encodeURIComponent(currentLang) +
    '&after_seq=' + encodeURIComponent(afterSeq) +
    '&client_id=' + encodeURIComponent(clientId);

  fetch(url).then(function (res) { return res.json(); }).then(function (data) {
    if (data.ended) {
      ended = true;
      statusEl.textContent = 'Oturum sona erdi.';
      return;
    }
    statusEl.textContent = 'Bağlandı.';
    if (data.entries && data.entries.length > 0) {
      for (var i = 0; i < data.entries.length; i++) {
        appendLine(data.entries[i]);
        if (data.entries[i].seq > afterSeq) afterSeq = data.entries[i].seq;
      }
    }
    interimEl.textContent = data.interim || '';
  }).catch(function () {
    statusEl.textContent = 'Bağlantı sorunu, tekrar denenecek...';
  });
}

function startPolling(lang) {
  currentLang = lang;
  afterSeq = 0;
  transcriptEl.textContent = '';
  interimEl.textContent = '';
  if (pollTimer) clearInterval(pollTimer);
  poll();
  pollTimer = setInterval(poll, 2000);
}

document.getElementById('join-btn').addEventListener('click', function () {
  var lang = document.getElementById('lang-select').value;
  document.getElementById('join-panel').style.display = 'none';
  document.getElementById('session-panel').classList.add('visible');
  var liveSelect = document.getElementById('lang-select-live');
  liveSelect.innerHTML = document.getElementById('lang-select').innerHTML;
  liveSelect.value = lang;
  startPolling(lang);
});

document.getElementById('lang-select-live').addEventListener('change', function (event) {
  startPolling(event.target.value);
});

document.getElementById('tts-toggle').addEventListener('click', function (event) {
  autoSpeak = !autoSpeak;
  event.target.textContent = 'Sesli Oku: ' + (autoSpeak ? 'Açık' : 'Kapalı');
  if (!autoSpeak && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

document.getElementById('leave-btn').addEventListener('click', function () {
  if (pollTimer) clearInterval(pollTimer);
  document.getElementById('session-panel').classList.remove('visible');
  document.getElementById('join-panel').style.display = 'block';
});
</script>
HTML;

echo public_page($session['title'], $body, $extraStyle);
