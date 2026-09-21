<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

// "Her konuşmacının kendi mikrofon kodu olmalı" isteği üzerine artık
// events.speaker_token DEĞİL, doğrudan BU konuşmacının kendi token'ı
// ile doğrulanıyor - link admin panelindeki konuşmacı detay sayfasından
// (admin/speaker.php) alınıyor.
$speakerId = (string) ($_GET['speaker'] ?? '');
$token = (string) ($_GET['token'] ?? '');
$speaker = $speakerId !== '' ? find_event_speaker($speakerId) : null;

if (!$speaker) {
    http_response_code(404);
    echo public_page('Bulunamadı', '<main class="container py-5"><h1 class="h4">Konuşmacı bulunamadı.</h1></main>');
    exit;
}
if (!hash_equals($speaker['token'], $token)) {
    http_response_code(401);
    echo public_page('Yetkisiz', '<main class="container py-5"><h1 class="h4">Geçersiz mikrofon bağlantısı.</h1></main>', 'tr');
    exit;
}
$event = find_event($speaker['event_id']);
if (!$event || $event['status'] !== 'active') {
    echo public_page('Etkinlik sona erdi', '<main class="container py-5"><h1 class="h4">Bu etkinlik sona erdi.</h1></main>');
    exit;
}

$extraHead = '<style>
body { display:flex; align-items:center; justify-content:center; padding: 1.25rem; min-height:100vh; }
main { width: 100%; max-width: 640px; }
#interim { min-height: 2.4rem; text-align:center; font-size:1.15rem; }
#transcript { max-height: 220px; overflow-y:auto; }
#speaker-questions { max-height: 220px; overflow-y:auto; }
#log { max-height: 100px; overflow-y:auto; font-size:.78rem; }
.lang-toggle .btn.active { pointer-events: none; }
</style>';

$eventNameEsc = esc($event['name']);
$speakerNameEsc = esc($speaker['name']);
$speakerIdJson = json_encode($speaker['id']);
$speakerTokenJson = json_encode($speaker['token']);
$eventIdForStatusJson = json_encode($event['id']);
$sourceLangValue = in_array($speaker['source_lang'], ['tr', 'en'], true) ? $speaker['source_lang'] : 'tr';
$sourceLangJson = json_encode($sourceLangValue);
$sourceBcp47Json = json_encode(bcp47_for($sourceLangValue));
$trActiveClass = $sourceLangValue === 'tr' ? 'active' : '';
$enActiveClass = $sourceLangValue === 'en' ? 'active' : '';
$qaToggleLabel = $speaker['qa_enabled'] ? 'Soru Sormayı Kapat' : 'Soru Sormayı Aç';
$qaToggleClass = $speaker['qa_enabled'] ? 'btn-outline-warning' : 'btn-success';
$qaEnabledJson = json_encode((bool) $speaker['qa_enabled']);
// Soruları çevirebilmek için bir dil seçici gerekiyor - admin panelindeki
// AYNI language_options_html() ile üretilip JS'e hazır HTML olarak
// veriliyor (LANGUAGES sabitinden geldiği için güvenli, kullanıcı
// girdisi değil - doğrudan innerHTML'e yazılabilir).
$languageOptionsJson = json_encode(language_options_html($sourceLangValue, 'tr'), JSON_UNESCAPED_UNICODE);

$body = <<<HTML
<main class="container">
  <div class="d-flex justify-content-between align-items-center mb-3">
    <div>
      <h1 class="h4 mb-0">{$speakerNameEsc}</h1>
      <p class="text-secondary small mb-0">{$eventNameEsc} &middot; Mikrofon ekranı</p>
    </div>
    <div class="text-end">
      <div class="text-secondary small">Katılımcı</div>
      <strong id="participant-count">0</strong>
    </div>
  </div>

  <div id="active-warning" class="alert alert-warning small py-2" style="display:none">Şu an aktif konuşmacı siz değilsiniz - "Konuşmayı Başlat"a basınca aktif olursunuz.</div>

  <div class="card mb-3">
    <div class="card-body text-center">
      <div class="btn-group btn-group-sm lang-toggle mb-3" role="group">
        <button type="button" class="btn btn-outline-secondary {$trActiveClass}" data-lang="tr">Türkçe konuşuyorum</button>
        <button type="button" class="btn btn-outline-secondary {$enActiveClass}" data-lang="en">I'm speaking English</button>
      </div>
      <p class="mt-1 mb-1" id="support-warning" style="display:none">
        <span class="badge text-bg-warning">Bu tarayıcı konuşma tanımayı desteklemiyor olabilir - Chrome/Edge önerilir.</span>
      </p>
      <button id="mic-btn" type="button" class="btn btn-primary rounded-circle mic-btn my-3">&#127908;</button>
      <p class="text-secondary" id="mic-label">Başlatmak için mikrofona dokunun</p>
      <div id="interim" class="text-info"></div>
      <button id="start-stop-btn" type="button" class="btn btn-primary w-100 mt-2">Konuşmayı Başlat</button>
    </div>
  </div>

  <h2 class="h6">Yakalanan cümleler</h2>
  <div id="transcript" class="card card-body mb-3"></div>

  <div class="d-flex justify-content-between align-items-center mb-2">
    <h2 class="h6 mb-0">Soru-Cevap</h2>
    <button id="qa-toggle-btn" type="button" class="btn btn-sm {$qaToggleClass}">{$qaToggleLabel}</button>
  </div>
  <p class="text-secondary small mb-1">Açıksa, siz aktifken katılımcıların sorduğu sorular burada görünür.</p>
  <div id="speaker-questions" class="card card-body mb-3">
    <span class="text-secondary small">Henüz soru yok.</span>
  </div>

  <div id="log" class="text-secondary small mt-2"></div>
</main>

<script>
var speakerId = {$speakerIdJson};
var speakerToken = {$speakerTokenJson};
var sourceLang = {$sourceLangJson};
var sourceBcp47 = {$sourceBcp47Json};
var qaEnabled = {$qaEnabledJson};
var languageOptionsHtml = {$languageOptionsJson};
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

function postToServer(type, text, langOverride) {
  return fetch('/api/speak_post.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speaker_id: speakerId,
      token: speakerToken,
      type: type,
      text: text,
      lang: (langOverride !== undefined ? langOverride : sourceLang)
    })
  }).then(function (res) { return res.json(); }).catch(function () { return null; });
}

function pollStatus() {
  fetch('/api/status.php?event_id=' + encodeURIComponent({$eventIdForStatusJson}))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (typeof data.participantCount === 'number') setText('participant-count', String(data.participantCount));
      var warning = document.getElementById('active-warning');
      var amIActive = !!(data.activeSpeaker && data.activeSpeaker.id === speakerId);
      warning.style.display = (!amIActive && listening) ? 'block' : 'none';
    })
    .catch(function () {});
}
setInterval(pollStatus, 4000);
pollStatus();

function pollQuestions() {
  fetch('/api/speaker_questions.php?speaker_id=' + encodeURIComponent(speakerId) + '&token=' + encodeURIComponent(speakerToken))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var box = document.getElementById('speaker-questions');
      if (data.error || !data.questions || data.questions.length === 0) {
        box.textContent = '';
        var empty = document.createElement('span');
        empty.className = 'text-secondary small';
        empty.textContent = 'Henüz soru yok.';
        box.appendChild(empty);
        return;
      }
      var wasNear = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.textContent = '';
      data.questions.forEach(function (q) {
        var row = document.createElement('div');
        row.className = 'border-bottom py-1';
        row.setAttribute('data-question-id', q.id);
        var head = document.createElement('div');
        head.className = 'd-flex justify-content-between';
        var name = document.createElement('strong');
        name.textContent = q.asker_name;
        var time = document.createElement('span');
        time.className = 'text-secondary small';
        time.textContent = q.created_at;
        head.appendChild(name);
        head.appendChild(time);
        var msg = document.createElement('div');
        msg.textContent = q.message;
        row.appendChild(head);
        row.appendChild(msg);

        var controls = document.createElement('div');
        controls.className = 'mt-1 d-flex gap-2 align-items-center';
        var select = document.createElement('select');
        select.className = 'form-select form-select-sm w-auto question-lang-select';
        select.innerHTML = languageOptionsHtml;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-outline-info question-translate-btn';
        btn.textContent = 'Çevir';
        var result = document.createElement('span');
        result.className = 'question-translation small text-info';
        controls.appendChild(select);
        controls.appendChild(btn);
        controls.appendChild(result);
        row.appendChild(controls);

        box.appendChild(row);
      });
      if (wasNear) box.scrollTop = box.scrollHeight;
    })
    .catch(function () {});
}
setInterval(pollQuestions, 5000);
pollQuestions();

document.getElementById('speaker-questions').addEventListener('click', function (event) {
  if (!event.target.classList.contains('question-translate-btn')) return;
  var btn = event.target;
  var row = btn.closest('[data-question-id]');
  var lang = row.querySelector('.question-lang-select').value;
  var out = row.querySelector('.question-translation');
  out.textContent = 'Çevriliyor...';
  fetch('/api/speaker_translate_question.php?speaker_id=' + encodeURIComponent(speakerId) +
    '&token=' + encodeURIComponent(speakerToken) +
    '&id=' + encodeURIComponent(row.getAttribute('data-question-id')) +
    '&lang=' + encodeURIComponent(lang))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      out.textContent = data.text || (data.message || data.error || 'Hata');
    })
    .catch(function () {
      out.textContent = 'Bağlantı hatası';
    });
});

document.getElementById('qa-toggle-btn').addEventListener('click', function () {
  var btn = this;
  btn.disabled = true;
  postToServer('toggle_qa', '').then(function (data) {
    btn.disabled = false;
    if (!data || !data.ok) return;
    qaEnabled = data.qa_enabled;
    btn.textContent = qaEnabled ? 'Soru Sormayı Kapat' : 'Soru Sormayı Aç';
    btn.className = 'btn btn-sm ' + (qaEnabled ? 'btn-outline-warning' : 'btn-success');
  });
});

document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (listening) return;
    var lang = btn.getAttribute('data-lang');
    postToServer('set_lang', '', lang).then(function (data) {
      if (!data || !data.ok) return;
      sourceLang = data.source_lang;
      sourceBcp47 = (sourceLang === 'en') ? 'en-US' : 'tr-TR';
      document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-lang') === sourceLang);
      });
    });
  });
});

function updateMicButton() {
  var btn = document.getElementById('mic-btn');
  var label = document.getElementById('mic-label');
  var startStopBtn = document.getElementById('start-stop-btn');
  if (listening) {
    btn.classList.add('on');
    label.textContent = 'Dinleniyor - durdurmak için dokunun';
    startStopBtn.textContent = 'Konuşmayı Bitir';
    startStopBtn.className = 'btn btn-outline-danger w-100 mt-2';
  } else {
    btn.classList.remove('on');
    label.textContent = 'Başlatmak için mikrofona dokunun';
    startStopBtn.textContent = 'Konuşmayı Başlat';
    startStopBtn.className = 'btn btn-primary w-100 mt-2';
  }
  document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (b) {
    b.disabled = listening;
  });
}

// Web Speech API'nin bir sınırı var: bir tanıma oturumu süresiz sürmüyor,
// bir süre sonra (sessizlik, dahili zaman aşımı vb.) kendiliğinden
// 'onend' ile bitiyor - "sürekli" bir mikrofon deneyimi için bunu her
// bittiğinde YENİDEN başlatmamız gerekiyor. Her yeniden başlatmada
// TAMAMEN YENİ bir SpeechRecognition nesnesi oluşturuluyor (bazı
// tarayıcılar AYNI nesneyi tekrar start() etmeye izin vermiyor, anında
// "aborted" hatasıyla başarısız oluyor) + çok hızlı art arda başlatmayı
// önlemek için kısa bir gecikme (300ms).
var restartTimer = null;

function createRecognition() {
  var r = new SpeechRecognitionImpl();
  r.lang = sourceBcp47;
  r.continuous = true;
  r.interimResults = true;

  r.onresult = function (event) {
    var interimText = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var result = event.results[i];
      var t = result[0].transcript;
      if (result.isFinal) {
        addTranscriptLine(t);
        postToServer('final', t).then(function (data) {
          if (data && data.error === 'not_active') {
            logLine('Aktif konuşmacı değilsiniz - mikrofon durduruldu.');
            stopRecognition();
          }
        });
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

  r.onerror = function (event) {
    logLine('Tanıma hatası: ' + event.error);
    // 'not-allowed'/'service-not-allowed' = mikrofon izni verilmedi -
    // bu, yeniden başlatarak DÜZELMEZ, tekrar tekrar denemek sadece
    // gereksiz bir döngüye sokar. Diğer hatalar ('aborted', 'no-speech',
    // 'network', 'audio-capture' gibi) genelde GEÇİCİ - asıl yeniden
    // başlatma kararı aşağıdaki 'onend'de veriliyor (Web Speech API bu
    // hatalardan sonra da onend'i tetikliyor).
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      manuallyStopped = true;
      logLine('Mikrofon izni verilmedi - tarayıcı adres çubuğundaki izin ayarından izin verip tekrar deneyin.');
    }
  };

  r.onend = function () {
    listening = false;
    updateMicButton();
    if (manuallyStopped) return;
    restartTimer = setTimeout(function () {
      startRecognition();
    }, 300);
  };

  return r;
}

function startRecognition() {
  if (!SpeechRecognitionImpl) return;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  manuallyStopped = false;
  recognition = createRecognition();
  try {
    recognition.start();
    listening = true;
    updateMicButton();
  } catch (e) {
    logLine('Başlatılamadı: ' + e.message);
    listening = false;
    updateMicButton();
  }
}

function stopRecognition() {
  manuallyStopped = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
  listening = false;
  updateMicButton();
}

// "Konuşmayı Başlat" - hem bu konuşmacıyı AKTİF yapar (diğerlerini
// otomatik pasif yaparak, bkz. activate_speaker) hem mikrofonu başlatır.
// "Konuşmayı Bitir" - mikrofonu durdurur ve bu konuşmacıyı pasif yapar.
function startSpeaking() {
  postToServer('activate', '').then(function () {
    startRecognition();
  });
}

function stopSpeaking() {
  stopRecognition();
  postToServer('deactivate', '');
}

document.getElementById('mic-btn').addEventListener('click', function () {
  if (listening) stopSpeaking(); else startSpeaking();
});
document.getElementById('start-stop-btn').addEventListener('click', function () {
  if (listening) stopSpeaking(); else startSpeaking();
});

if (!SpeechRecognitionImpl) {
  document.getElementById('support-warning').style.display = 'block';
  document.getElementById('mic-btn').disabled = true;
  document.getElementById('start-stop-btn').disabled = true;
}
</script>
HTML;

echo public_page($speaker['name'] . ' - ' . $event['name'], $body, 'tr', $extraHead);
