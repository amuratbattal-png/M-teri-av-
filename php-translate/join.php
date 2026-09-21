<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';

$code = (string) ($_GET['code'] ?? '');
$uiLang = current_ui_lang();

// ?ui= query param geldiyse tercih kalıcı olsun diye çerezi güncelle -
// "isterse header alanından dili türkçe veya ingilizce yapabilecek" isteği.
if (isset($_GET['ui'])) {
    setcookie('ui_lang', $uiLang, time() + 60 * 60 * 24 * 365, '/');
}

$event = $code !== '' ? find_event_by_join_code($code) : null;

if (!$event) {
    http_response_code(404);
    echo public_page(
        'Not Found',
        '<main class="container py-5"><div class="alert alert-danger">' . esc(t('not_found', $uiLang)) . '</div></main>',
        $uiLang,
    );
    exit;
}

$activeSpeaker = find_active_speaker($event['id']);
$ended = $event['status'] !== 'active';

$extraHead = '<style>
main { max-width: 720px; margin: 0 auto; padding-top: 1rem; }
#speaker-header-body img { max-width: 100%; max-height: 220px; border-radius: .5rem; }
#transcript { min-height: 260px; }
#transcript .line { padding: .5rem 0; border-bottom: 1px dashed var(--bs-border-color); }
#transcript .line:last-child { border-bottom: none; }
#transcript .source { font-size: .78rem; opacity: .7; }
</style>';

$eventNameEsc = esc($event['name']);
$codeEsc = esc($event['join_code']);
$trActiveClass = $uiLang === 'tr' ? 'active' : '';
$enActiveClass = $uiLang === 'en' ? 'active' : '';

$langLabel = esc(t('lang_label', $uiLang));
$joinLabel = esc(t('join', $uiLang));
$ttsOnLabel = esc(t('tts_on', $uiLang));
$leaveLabel = esc(t('leave', $uiLang));
$askLabel = esc(t('ask_question', $uiLang));
$askTitle = esc(t('ask_question_title', $uiLang));
$yourNameLabel = esc(t('your_name', $uiLang));
$yourMessageLabel = esc(t('your_message', $uiLang));
$sendLabel = esc(t('send', $uiLang));
$cancelLabel = esc(t('cancel', $uiLang));
$langOptions = language_options_html($event['source_lang'], $uiLang, PARTICIPANT_LANGUAGE_CODES);

// İlk yüklemede JS'in "flaş" etmeden hemen doğru içerikle başlaması için
// başlık (aktif konuşmacı/placeholder) sunucu tarafında da hesaplanıyor -
// ilk poll() çağrısı zaten anında tetiklenip bunu tazeleyecek.
if ($activeSpeaker) {
    $speakerPhotoHtml = !empty($activeSpeaker['photo'])
        ? '<img src="' . esc('/' . $activeSpeaker['photo']) . '" class="speaker-photo" width="132" height="132" alt="">'
        : '';
    $headerInitial = $speakerPhotoHtml . '<div class="speaker-name">' . esc($activeSpeaker['name']) . '</div><div class="speaker-topic text-secondary">' .
        esc($uiLang === 'en' ? $activeSpeaker['topic_en'] : $activeSpeaker['topic_tr']) . '</div>';
} elseif (!empty($event['placeholder_image'])) {
    $headerInitial = '<img src="' . esc('/' . $event['placeholder_image']) . '" alt="">';
} else {
    $headerInitial = '<span class="text-secondary">' . esc(t('no_speaker', $uiLang)) . '</span>';
}

// "Hiçbir konuşmacı aktif değilken sadece görsel görünsün" isteği - katılım
// (dil seçimi) ve oturum (transkript) panelleri, bir konuşmacı aktif OLMADIĞI
// sürece hiç gösterilmiyor; JS'teki updateHeader() de her anket (poll)
// sonucuna göre bu iki paneli aynı kuralla açıp kapatıyor.
$joinPanelInitialDisplay = $activeSpeaker ? 'block' : 'none';

$bcp47Map = [];
foreach (LANGUAGES as $l) {
    $bcp47Map[$l['code']] = $l['bcp47'];
}

$config = [
    'eventId' => $event['id'],
    'code' => $event['join_code'],
    'uiLang' => $uiLang,
    'sourceLang' => $event['source_lang'],
    'ended' => $ended,
    'bcp47' => $bcp47Map,
    'strings' => [
        'connected' => t('connected', $uiLang),
        'connection_issue' => t('connection_issue', $uiLang),
        'ended' => t('ended', $uiLang),
        'error_prefix' => t('error_prefix', $uiLang),
        'no_speaker' => t('no_speaker', $uiLang),
        'validation_error' => t('validation_error', $uiLang),
        'sent' => t('sent', $uiLang),
        'tts_on' => t('tts_on', $uiLang),
        'tts_off' => t('tts_off', $uiLang),
        'tts_unsupported' => t('tts_unsupported', $uiLang),
        'download_transcript_prefix' => t('download_transcript_prefix', $uiLang),
    ],
];
$configJson = json_encode($config, JSON_UNESCAPED_UNICODE);

$body = <<<HTML
<main class="container">
  <div class="d-flex justify-content-between align-items-center py-2 border-bottom mb-3">
    <strong>{$eventNameEsc}</strong>
    <div class="btn-group btn-group-sm" role="group">
      <a href="?code={$codeEsc}&ui=tr" class="btn btn-outline-secondary {$trActiveClass}">TR</a>
      <a href="?code={$codeEsc}&ui=en" class="btn btn-outline-secondary {$enActiveClass}">EN</a>
    </div>
  </div>

  <div class="card mb-3">
    <div class="card-body text-center placeholder-screen py-4" id="speaker-header-body">{$headerInitial}</div>
    <div class="card-body pt-0 text-center" id="download-transcript-wrap" style="display:none">
      <a href="#" id="download-transcript-btn" class="btn btn-sm btn-outline-primary" download></a>
    </div>
  </div>

  <div id="join-panel" class="card mb-3" style="display:{$joinPanelInitialDisplay}">
    <div class="card-body">
      <label for="lang-select" class="form-label">{$langLabel}</label>
      <select id="lang-select" class="form-select mb-3">{$langOptions}</select>
      <button id="join-btn" class="btn btn-primary w-100">{$joinLabel}</button>
    </div>
  </div>

  <div id="session-panel" style="display:none">
    <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
      <select id="lang-select-live" class="form-select form-select-sm w-auto"></select>
      <button id="ask-btn" type="button" class="btn btn-sm btn-outline-info" style="display:none" data-bs-toggle="modal" data-bs-target="#questionModal">{$askLabel}</button>
    </div>
    <div id="transcript" class="card card-body mb-2"></div>
    <div id="interim-line" class="mb-2 text-info"></div>
    <div id="tts-note" class="text-warning small text-center mb-2" style="display:none"></div>
    <div class="d-flex gap-2 mb-2">
      <button id="tts-toggle" class="btn btn-outline-secondary btn-sm flex-fill">{$ttsOnLabel}</button>
      <button id="leave-btn" class="btn btn-outline-secondary btn-sm flex-fill">{$leaveLabel}</button>
    </div>
    <div id="conn-status" class="text-secondary small text-center"></div>
  </div>
</main>

<div class="modal fade" id="questionModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{$askTitle}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="question-error" class="alert alert-danger" style="display:none"></div>
        <div class="mb-3">
          <label for="question-name" class="form-label">{$yourNameLabel}</label>
          <input type="text" id="question-name" class="form-control" required>
        </div>
        <div class="mb-3">
          <label for="question-message" class="form-label">{$yourMessageLabel}</label>
          <textarea id="question-message" class="form-control" rows="3" required></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{$cancelLabel}</button>
        <button type="button" id="question-send-btn" class="btn btn-primary">{$sendLabel}</button>
      </div>
    </div>
  </div>
</div>

<script type="application/json" id="config">{$configJson}</script>
<script>
var config = JSON.parse(document.getElementById('config').textContent);
var currentLang = null;
var afterSeq = 0;
var joined = false;
var autoSpeak = true;
var qaEnabled = false;
var ended = config.ended;
var clientId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('c' + Date.now() + Math.random());

var headerBody = document.getElementById('speaker-header-body');
var transcriptEl = document.getElementById('transcript');
var interimEl = document.getElementById('interim-line');
var statusEl = document.getElementById('conn-status');
var askBtn = document.getElementById('ask-btn');
var ttsNoteEl = document.getElementById('tts-note');
var downloadWrap = document.getElementById('download-transcript-wrap');
var downloadBtn = document.getElementById('download-transcript-btn');

// "Konuşmacı konuşmayı bitirince transkript indir butonu olmalı" isteği -
// en son aktif olan konuşmacıyı hatırlıyoruz, aktif konuşmacı yoksa (ama
// daha önce biri vardıysa) o konuşmacının indirme linkini gösteriyoruz.
var lastKnownSpeaker = null;
// "Konuşmacı değişince katılımcı SADECE yeni konuşmacının içeriğini
// görmeli" isteği - bir sonraki poll() cevabında aktif konuşmacı değiştiği
// anlaşılırsa transkript, dil değişiminde kullanılan AYNI mekanizmayla
// (afterSeq=0 + firstPollAfterJoin=true) sıfırdan dolduruluyor.
var lastActiveSpeakerId = undefined;

// Tarayıcının ses (voice) listesi ÇOĞU tarayıcıda ASENKRON yükleniyor -
// sayfa açılır açılmaz getVoices() boş dönebilir. Hem hemen bir deneme
// yapıyoruz hem de 'voiceschanged' olayını dinleyip listeyi tazeliyoruz -
// aksi halde "hangi dil için gerçek bir ses var" sorusuna baştan yanlış
// (boş) cevap verip gereksiz yere "desteklenmiyor" uyarısı gösterebiliriz.
var speechVoices = [];
var speechVoicesLoaded = false;
function loadSpeechVoices() {
  if (!window.speechSynthesis) return;
  speechVoices = window.speechSynthesis.getVoices() || [];
  if (speechVoices.length > 0) speechVoicesLoaded = true;
}
if (window.speechSynthesis) {
  loadSpeechVoices();
  window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
}

function findVoiceForLang(bcp47) {
  if (!bcp47 || speechVoices.length === 0) return null;
  var lower = bcp47.toLowerCase();
  var exact = null;
  var sameBase = null;
  var base = lower.split('-')[0];
  for (var i = 0; i < speechVoices.length; i++) {
    var voiceLang = (speechVoices[i].lang || '').toLowerCase();
    if (voiceLang === lower) { exact = speechVoices[i]; break; }
    if (!sameBase && voiceLang.split('-')[0] === base) sameBase = speechVoices[i];
  }
  return exact || sameBase;
}

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function buildLineEl(entry) {
  var wrap = document.createElement('div');
  wrap.className = 'line';

  var text = document.createElement('div');
  text.textContent = entry.text;
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

function replaceHistory(entries) {
  transcriptEl.textContent = '';
  for (var i = 0; i < entries.length; i++) transcriptEl.appendChild(buildLineEl(entries[i]));
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function speakIfEnabled(entry) {
  if (!autoSpeak || !joined) return;
  if (!window.speechSynthesis) return;
  var targetLang = config.bcp47[currentLang] || config.bcp47[config.sourceLang] || config.sourceLang;
  try {
    var voice = findVoiceForLang(targetLang);
    if (!voice && speechVoicesLoaded) {
      // Ses listesi gerçekten yüklendi VE bu dil için hiçbir ses yok -
      // sessizce hiçbir şey olmaması yerine katılımcıya AÇIKÇA bildiriyoruz
      // (aksi halde "sesli çeviri çalışmıyor" şikayetinin sebebi hiç
      // anlaşılamaz - cihaz/tarayıcı kısıtı mı, çeviri mi bozuk anlaşılmaz).
      ttsNoteEl.textContent = config.strings.tts_unsupported;
      ttsNoteEl.style.display = 'block';
      return;
    }
    ttsNoteEl.style.display = 'none';
    var utter = new SpeechSynthesisUtterance(entry.text);
    utter.lang = targetLang;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

function updateHeader(data) {
  headerBody.textContent = '';
  if (data.active_speaker) {
    if (data.active_speaker.photo) {
      var photo = document.createElement('img');
      photo.src = data.active_speaker.photo;
      photo.alt = '';
      photo.className = 'speaker-photo';
      photo.width = 132;
      photo.height = 132;
      headerBody.appendChild(photo);
    }
    var h = document.createElement('div');
    h.className = 'speaker-name';
    h.textContent = data.active_speaker.name;
    var p = document.createElement('div');
    p.className = 'speaker-topic text-secondary';
    p.textContent = data.active_speaker.topic;
    headerBody.appendChild(h);
    headerBody.appendChild(p);
  } else if (data.placeholder_image) {
    var img = document.createElement('img');
    img.src = data.placeholder_image;
    img.alt = '';
    headerBody.appendChild(img);
  } else {
    var span = document.createElement('span');
    span.className = 'text-secondary';
    span.textContent = config.strings.no_speaker;
    headerBody.appendChild(span);
  }

  // Hiçbir konuşmacı aktif değilken SADECE yukarıdaki görsel/metin görünsün -
  // katılım/oturum panelleri tamamen gizlenir (zaten katılmış biri için de
  // geçerli: konuşmacı ortasında pasif olursa oturum ekranı da kaybolur).
  var hasActiveSpeaker = !!data.active_speaker;
  lastHasActiveSpeaker = hasActiveSpeaker;
  var joinPanelEl = document.getElementById('join-panel');
  var sessionPanelEl = document.getElementById('session-panel');
  if (!hasActiveSpeaker) {
    joinPanelEl.style.display = 'none';
    sessionPanelEl.style.display = 'none';
  } else if (joined) {
    sessionPanelEl.style.display = 'block';
    joinPanelEl.style.display = 'none';
  } else {
    joinPanelEl.style.display = 'block';
    sessionPanelEl.style.display = 'none';
  }

  // "qa_enabled" artık ETKİNLİK genelinde değil, aktif KONUŞMACININ kendi
  // ayarı - api/participant_poll.php artık bunu data.active_speaker İÇİNDE
  // dönüyor, üst seviyede değil.
  qaEnabled = !!(data.active_speaker && data.active_speaker.qa_enabled);
  askBtn.style.display = qaEnabled ? 'inline-block' : 'none';
}

function updateDownloadLink(data) {
  if (data.active_speaker) {
    lastKnownSpeaker = data.active_speaker;
    downloadWrap.style.display = 'none';
    return;
  }
  if (!lastKnownSpeaker) {
    downloadWrap.style.display = 'none';
    return;
  }
  var dlLang = currentLang || config.uiLang;
  downloadBtn.href = '/api/download_transcript.php?event_id=' + encodeURIComponent(config.eventId) +
    '&speaker_id=' + encodeURIComponent(lastKnownSpeaker.id) +
    '&lang=' + encodeURIComponent(dlLang);
  downloadBtn.textContent = config.strings.download_transcript_prefix + lastKnownSpeaker.name;
  downloadWrap.style.display = 'block';
}

var firstPollAfterJoin = false;
var lastHasActiveSpeaker = false;

function poll() {
  var url = '/api/participant_poll.php?event_id=' + encodeURIComponent(config.eventId) +
    '&lang=' + encodeURIComponent(currentLang || config.sourceLang) +
    '&ui=' + encodeURIComponent(config.uiLang) +
    '&after_seq=' + encodeURIComponent(afterSeq) +
    '&client_id=' + encodeURIComponent(clientId);

  fetch(url).then(function (res) { return res.json(); }).then(function (data) {
    if (data.error) {
      statusEl.textContent = config.strings.error_prefix + (data.message || data.error);
      return;
    }
    updateHeader(data);
    updateDownloadLink(data);

    var newActiveSpeakerId = data.active_speaker ? data.active_speaker.id : null;
    if (lastActiveSpeakerId !== undefined && newActiveSpeakerId !== lastActiveSpeakerId) {
      afterSeq = 0;
      firstPollAfterJoin = true;
    }
    lastActiveSpeakerId = newActiveSpeakerId;

    if (data.ended) {
      ended = true;
      statusEl.textContent = config.strings.ended;
      return;
    }
    if (!joined) return;
    statusEl.textContent = config.strings.connected;
    if (firstPollAfterJoin) {
      firstPollAfterJoin = false;
      replaceHistory(data.entries || []);
      if (data.entries && data.entries.length) afterSeq = data.entries[data.entries.length - 1].seq;
    } else if (data.entries && data.entries.length > 0) {
      for (var i = 0; i < data.entries.length; i++) {
        appendLine(data.entries[i]);
        if (data.entries[i].seq > afterSeq) afterSeq = data.entries[i].seq;
      }
    }
    interimEl.textContent = data.interim || '';
  }).catch(function () {
    if (joined) statusEl.textContent = config.strings.connection_issue;
  });
}

setInterval(poll, 2000);
poll();

document.getElementById('join-btn').addEventListener('click', function () {
  currentLang = document.getElementById('lang-select').value;
  joined = true;
  afterSeq = 0;
  firstPollAfterJoin = true;
  document.getElementById('join-panel').style.display = 'none';
  document.getElementById('session-panel').style.display = 'block';
  var live = document.getElementById('lang-select-live');
  live.innerHTML = document.getElementById('lang-select').innerHTML;
  live.value = currentLang;
  // Bazı tarayıcılarda (özellikle mobil Safari) sesli okuma, bir kullanıcı
  // etkileşimi (tıklama) İÇİNDE en az bir kere tetiklenmeden sonraki
  // otomatik (anket döngüsünden gelen) speak() çağrılarını sessizce
  // engelliyor - burada sessiz (volume:0) bir "ısınma" çağrısı bu kilidi
  // AÇIYOR, gerçek bir ses duyulmaz.
  if (window.speechSynthesis) {
    try {
      var warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
    } catch (e) {}
  }
  poll();
});

document.getElementById('lang-select-live').addEventListener('change', function (event) {
  currentLang = event.target.value;
  afterSeq = 0;
  firstPollAfterJoin = true;
  poll();
});

document.getElementById('tts-toggle').addEventListener('click', function (event) {
  autoSpeak = !autoSpeak;
  event.target.textContent = autoSpeak ? config.strings.tts_on : config.strings.tts_off;
  if (!autoSpeak && window.speechSynthesis) window.speechSynthesis.cancel();
});

document.getElementById('leave-btn').addEventListener('click', function () {
  joined = false;
  document.getElementById('session-panel').style.display = 'none';
  document.getElementById('join-panel').style.display = lastHasActiveSpeaker ? 'block' : 'none';
});

document.getElementById('question-send-btn').addEventListener('click', function () {
  var name = document.getElementById('question-name').value.trim();
  var message = document.getElementById('question-message').value.trim();
  var errEl = document.getElementById('question-error');
  if (!name || !message) {
    errEl.textContent = config.strings.validation_error;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  fetch('/api/ask_question.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: config.eventId,
      asker_name: name,
      asker_lang: currentLang || config.sourceLang,
      message: message
    })
  }).then(function (res) { return res.json(); }).then(function (data) {
    if (data.ok) {
      document.getElementById('question-name').value = '';
      document.getElementById('question-message').value = '';
      var modalEl = document.getElementById('questionModal');
      var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    } else {
      errEl.textContent = data.message || data.error || 'Error';
      errEl.style.display = 'block';
    }
  }).catch(function () {
    errEl.textContent = 'Connection error';
    errEl.style.display = 'block';
  });
});
</script>
HTML;

echo public_page($event['name'], $body, $uiLang, $extraHead);
