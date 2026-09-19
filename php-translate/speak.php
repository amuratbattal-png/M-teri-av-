<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$eventId = (string) ($_GET['event'] ?? '');
$token = (string) ($_GET['token'] ?? '');
$event = $eventId !== '' ? find_event($eventId) : null;

if (!$event) {
    http_response_code(404);
    echo public_page('Bulunamadı', '<main class="container py-5"><h1 class="h4">Etkinlik bulunamadı.</h1></main>');
    exit;
}
if ($event['status'] !== 'active') {
    echo public_page('Etkinlik sona erdi', '<main class="container py-5"><h1 class="h4">Bu etkinlik sona erdi.</h1></main>');
    exit;
}
if (!hash_equals($event['speaker_token'], $token)) {
    http_response_code(401);
    echo public_page('Yetkisiz', '<main class="container py-5"><h1 class="h4">Geçersiz mikrofon bağlantısı.</h1></main>', 'tr');
    exit;
}

$extraHead = '<style>
body { display:flex; align-items:center; justify-content:center; padding: 1.25rem; min-height:100vh; }
main { width: 100%; max-width: 640px; }
#interim { min-height: 2.4rem; text-align:center; font-size:1.15rem; }
#transcript { max-height: 220px; overflow-y:auto; }
#log { max-height: 100px; overflow-y:auto; font-size:.78rem; }
</style>';

$titleEsc = esc($event['name']);
$eventIdJson = json_encode($event['id']);
$tokenJson = json_encode($event['speaker_token']);
$sourceBcp47Json = json_encode(bcp47_for($event['source_lang']));

$body = <<<HTML
<main class="container">
  <div class="d-flex justify-content-between align-items-center mb-3">
    <div>
      <h1 class="h4 mb-0">{$titleEsc}</h1>
      <p class="text-secondary small mb-0">Mikrofon ekranı</p>
    </div>
    <div class="text-end">
      <div class="text-secondary small">Katılımcı</div>
      <strong id="participant-count">0</strong>
    </div>
  </div>

  <div class="card mb-3">
    <div class="card-body text-center">
      <div class="text-secondary small mb-2">Şu an aktif konuşmacı</div>
      <div class="h5" id="active-speaker-name">-</div>
      <p class="mt-3 mb-1" id="support-warning" style="display:none">
        <span class="badge text-bg-warning">Bu tarayıcı konuşma tanımayı desteklemiyor olabilir - Chrome/Edge önerilir.</span>
      </p>
      <button id="mic-btn" type="button" class="btn btn-danger rounded-circle mic-btn my-3">&#127908;</button>
      <p class="text-secondary" id="mic-label">Başlatmak için mikrofona dokunun</p>
      <div id="interim" class="text-info"></div>
    </div>
  </div>

  <h2 class="h6">Yakalanan cümleler</h2>
  <div id="transcript" class="card card-body mb-3"></div>

  <div class="card card-body d-flex flex-row justify-content-between align-items-center">
    <span class="text-secondary small">Etkinlik bitince sonlandırabilirsiniz.</span>
    <button id="end-btn" type="button" class="btn btn-outline-danger btn-sm">Etkinliği Sonlandır</button>
  </div>

  <div id="log" class="text-secondary small mt-2"></div>
</main>

<script>
var eventId = {$eventIdJson};
var speakerToken = {$tokenJson};
var sourceBcp47 = {$sourceBcp47Json};
var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
var recognition = null;
var listening = false;
var manuallyStopped = true;
var lastInterimSentAt = 0;

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
  div.className = 'border-bottom py-1';
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function postToServer(type, text) {
  fetch('/api/speak_post.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, token: speakerToken, type: type, text: text })
  }).catch(function () {});
}

function pollStatus() {
  fetch('/api/status.php?event_id=' + encodeURIComponent(eventId))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (typeof data.participantCount === 'number') setText('participant-count', String(data.participantCount));
      if (data.activeSpeaker) {
        setText('active-speaker-name', data.activeSpeaker.name + ' - ' + data.activeSpeaker.topic_tr);
      } else {
        setText('active-speaker-name', 'Aktif konuşmacı yok');
      }
    })
    .catch(function () {});
}
setInterval(pollStatus, 4000);
pollStatus();

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
  recognition.lang = sourceBcp47;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    var interimText = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var result = event.results[i];
      var t = result[0].transcript;
      if (result.isFinal) {
        addTranscriptLine(t);
        postToServer('final', t);
        setText('interim', '');
      } else {
        interimText += t;
      }
    }
    if (interimText) {
      setText('interim', interimText);
      var now = Date.now();
      if (now - lastInterimSentAt > 700) {
        lastInterimSentAt = now;
        postToServer('interim', interimText);
      }
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
    try { recognition.stop(); } catch (e) {}
  }
  listening = false;
  updateMicButton();
}

document.getElementById('mic-btn').addEventListener('click', function () {
  if (listening) stopRecognition(); else startRecognition();
});

document.getElementById('end-btn').addEventListener('click', function () {
  if (!confirm('Etkinliği sonlandırmak istediğinize emin misiniz?')) return;
  fetch('/api/speak_post.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, token: speakerToken, type: 'end_event' })
  }).then(function () {
    logLine('Etkinlik sonlandırıldı.');
    stopRecognition();
  }).catch(function () {});
});

if (!SpeechRecognitionImpl) {
  document.getElementById('support-warning').style.display = 'block';
  document.getElementById('mic-btn').disabled = true;
}
</script>
HTML;

echo public_page($event['name'], $body, 'tr', $extraHead);
