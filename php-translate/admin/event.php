<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/qrcode.php';
require_admin_auth();

const EVENT_UPLOAD_DIR = __DIR__ . '/../uploads/events';

$id = (string) ($_GET['id'] ?? '');
$event = $id !== '' ? find_event($id) : null;
if (!$event) {
    http_response_code(404);
    echo admin_page('events', 'Bulunamadı', notice('bad', 'Etkinlik bulunamadı.'));
    exit;
}

$formError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $pdo = get_pdo();

    if ($action === 'add_speaker') {
        $name = trim((string) ($_POST['name'] ?? ''));
        $topicTr = trim((string) ($_POST['topic_tr'] ?? ''));
        $topicEn = trim((string) ($_POST['topic_en'] ?? ''));
        if ($name === '') {
            $formError = 'Konuşmacı adı boş olamaz.';
        } else {
            $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM event_speakers WHERE event_id = ?');
            $stmt->execute([$id]);
            $sortOrder = ((int) $stmt->fetchColumn()) + 1;

            $newSpeakerId = new_id();
            $stmt = $pdo->prepare(
                'INSERT INTO event_speakers (id, event_id, name, topic_tr, topic_en, token, qa_enabled, source_lang, is_active, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)',
            );
            $stmt->execute([$newSpeakerId, $id, $name, $topicTr, $topicEn, new_speaker_token(), $event['source_lang'], $sortOrder, now_iso()]);
            // Yeni konuşmacı eklenir eklenmez detay sayfasına gidiliyor -
            // "konuşmacı detayına girince mikrofon kodu almalı" akışının
            // doğal bir parçası olarak, admin hemen mikrofon linkini/QR'ını
            // görüp konuşmacıya iletebiliyor.
            header('Location: /admin/speaker.php?id=' . rawurlencode($newSpeakerId));
            exit;
        }
    } elseif ($action === 'end_event') {
        $stmt = $pdo->prepare("UPDATE events SET status = 'ended', ended_at = ? WHERE id = ?");
        $stmt->execute([now_iso(), $id]);
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'delete_event') {
        delete_event($id);
        header('Location: /admin/events.php?deleted=1');
        exit;
    } elseif ($action === 'remove_placeholder') {
        if (!empty($event['placeholder_image'])) {
            @unlink(__DIR__ . '/../' . $event['placeholder_image']);
        }
        $stmt = $pdo->prepare('UPDATE events SET placeholder_image = NULL WHERE id = ?');
        $stmt->execute([$id]);
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'upload_placeholder') {
        $validated = validate_uploaded_image($_FILES['placeholder'] ?? null);
        if (!$validated['ok']) {
            $formError = $validated['error'];
        } else {
            if (!is_dir(EVENT_UPLOAD_DIR)) {
                mkdir(EVENT_UPLOAD_DIR, 0775, true);
            }
            if (!empty($event['placeholder_image'])) {
                @unlink(__DIR__ . '/../' . $event['placeholder_image']);
            }
            $relativePath = 'uploads/events/' . $id . '.' . $validated['ext'];
            if (move_uploaded_file($_FILES['placeholder']['tmp_name'], __DIR__ . '/../' . $relativePath)) {
                $stmt = $pdo->prepare('UPDATE events SET placeholder_image = ? WHERE id = ?');
                $stmt->execute([$relativePath, $id]);
                header('Location: /admin/event.php?id=' . rawurlencode($id));
                exit;
            }
            $formError = 'Görsel kaydedilemedi - klasör yazma izinlerini kontrol edin.';
        }
    }

    $event = find_event($id) ?? $event;
}

$speakers = list_event_speakers($id);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];
$joinUrl = $origin . '/join.php?code=' . rawurlencode($event['join_code']);
$qrDataUri = render_qr_data_uri($joinUrl);
$participantCount = count_active_participants($id);
$totalParticipants = count_total_participants($id);

$statusBadge = $event['status'] === 'active'
    ? '<span class="badge text-bg-success">Aktif</span>'
    : '<span class="badge text-bg-secondary">Sona erdi</span>';
$endDisabled = $event['status'] !== 'active' ? 'disabled' : '';

$errorBanner = $formError ? notice('bad', esc($formError)) : '';

$titleEsc = esc($event['name']);
$joinUrlEsc = esc($joinUrl);
$eventIdJson = json_encode($event['id']);
$eventIdEsc = esc($event['id']);
$titleJson = json_encode('Etkinlik: ' . $event['name'], JSON_UNESCAPED_UNICODE);

// --- Konuşmacılar listesi ---
// Her satırdaki tüm aksiyonlar (aktif/pasif et, fotoğraf, mikrofon
// linki, dil, soru-cevap, sil) artık admin/speaker.php'deki KENDİ
// detay sayfasına taşındı - "konuşmacı detayına girince mikrofon kodu
// almalı" isteği üzerine roster'ı sade bir liste hâline getirdik,
// isim detay sayfasına bağlanıyor.
$speakerRows = '';
foreach ($speakers as $s) {
    $activeBadge = $s['is_active'] ? ' <span class="badge text-bg-success">Aktif</span>' : '';
    $photoCell = !empty($s['photo'])
        ? '<img src="' . esc('/' . $s['photo'] . '?t=' . time()) . '" width="36" height="36" class="rounded-circle object-fit-cover" alt="">'
        : '<span class="text-secondary small">-</span>';
    $speakerRows .= '<tr>
        <td>' . $photoCell . '</td>
        <td><a href="/admin/speaker.php?id=' . esc($s['id']) . '">' . esc($s['name']) . '</a>' . $activeBadge . '</td>
        <td class="text-secondary small">' . esc($s['topic_tr']) . '</td>
        <td class="text-secondary small">' . esc($s['topic_en']) . '</td>
      </tr>';
}
$speakersTable = count($speakers) === 0
    ? '<p class="text-secondary">Henüz konuşmacı eklenmedi.</p>'
    : '<div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Fotoğraf</th><th>Ad Soyad</th><th>Konu (TR)</th><th>Konu (EN)</th></tr></thead><tbody>' . $speakerRows . '</tbody></table></div>';

// --- Placeholder görsel ---
$placeholderCard = '';
if (!empty($event['placeholder_image'])) {
    $imgUrl = esc('/' . $event['placeholder_image'] . '?t=' . time());
    $placeholderCard = '<img src="' . $imgUrl . '" class="img-fluid rounded mb-3" style="max-height:200px" alt="Boş ekran görseli">' .
        '<form method="post" onsubmit="return confirm(\'Görseli kaldırmak istediğinize emin misiniz?\');"><input type="hidden" name="action" value="remove_placeholder"><button type="submit" class="btn btn-sm btn-outline-danger">Görseli Kaldır</button></form>';
} else {
    $placeholderCard = '<p class="text-secondary">Henüz görsel yüklenmedi - hiçbir konuşmacı aktif değilken katılımcılar boş bir ekran görecek.</p>';
}

$questionsList = render_question_list_html($id, $event['source_lang']);

$body = <<<HTML
<p><a href="/admin/events.php">&larr; Etkinlikler</a></p>
<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
  <h1 class="h3 mb-0">{$titleEsc} {$statusBadge}</h1>
</div>
{$errorBanner}

<div class="row g-4">
  <div class="col-lg-6">
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Katılım (QR kod)</h2>
        <div class="d-flex gap-3 flex-wrap align-items-start">
          <div class="bg-white p-2 rounded"><img src="{$qrDataUri}" width="180" height="180" alt="Katılım QR kodu"></div>
          <div class="flex-grow-1">
            <p class="text-secondary small">Katılımcılar bu kodu okutarak veya linke giderek katılabilir - giriş gerekmez.</p>
            <div class="input-group input-group-sm mb-2">
              <input type="text" class="form-control" id="join-url" value="{$joinUrlEsc}" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="copyField('join-url')">Kopyala</button>
            </div>
            <p class="text-secondary small mb-0">Bağlı katılımcı: <strong id="participant-count">{$participantCount}</strong> &middot; Toplam katılımcı (bugüne kadar, yaklaşık): <strong>{$totalParticipants}</strong></p>
            <a href="/admin/export_qr_poster.php?event_id={$eventIdEsc}" class="btn btn-sm btn-outline-secondary mt-2">QR Posterini İndir (.svg)</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Boş Ekran Görseli</h2>
        <p class="text-secondary small">Hiçbir konuşmacı aktif değilken katılımcı ekranında bu görsel gösterilir.</p>
        {$placeholderCard}
        <form method="post" enctype="multipart/form-data" class="mt-3">
          <input type="hidden" name="action" value="upload_placeholder">
          <div class="input-group input-group-sm">
            <input type="file" class="form-control" name="placeholder" accept="image/png,image/jpeg,image/gif,image/webp" required>
            <button type="submit" class="btn btn-outline-primary">Yükle</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Transkript</h2>
        <p class="text-secondary small">Bu etkinlikte o ana kadar kaydedilmiş tüm konuşmayı (konuşmacı adı + zaman damgasıyla) düz metin olarak indirin.</p>
        <a href="/admin/export_transcript.php?event_id={$eventIdEsc}" class="btn btn-sm btn-outline-secondary">Transkripti İndir (.txt)</a>
      </div>
    </div>

    <div class="card border-danger-subtle">
      <div class="card-body">
        <h2 class="h5 card-title">Etkinlik Yönetimi</h2>
        <form method="post" class="mb-3" onsubmit="return confirm('Etkinliği sonlandırmak istediğinize emin misiniz? Tüm katılımcıların bağlantısı kesilecek.');">
          <input type="hidden" name="action" value="end_event">
          <button type="submit" class="btn btn-outline-danger" {$endDisabled}>Etkinliği Sonlandır</button>
        </form>
        <hr>
        <p class="text-secondary small mb-2">Aşağıdaki işlem etkinliği, tüm konuşmacıları, transkripti, soruları ve yüklenen görselleri KALICI olarak siler - geri alınamaz.</p>
        <form method="post" onsubmit="return confirm('Bu etkinliği KALICI olarak silmek istediğinize emin misiniz? Tüm konuşmacılar, transkript, sorular ve yüklenen görseller de silinecek. Bu işlem GERİ ALINAMAZ.');">
          <input type="hidden" name="action" value="delete_event">
          <button type="submit" class="btn btn-danger">Etkinliği Kalıcı Olarak Sil</button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-6">
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Konuşmacılar</h2>
        <p class="text-secondary small">Mikrofon linki, aktif/pasif etme, dil ve soru-cevap ayarları için bir konuşmacının adına tıklayıp kendi detay sayfasına gidin.</p>
        {$speakersTable}
        <hr>
        <form method="post" class="row g-2">
          <input type="hidden" name="action" value="add_speaker">
          <div class="col-12">
            <input type="text" class="form-control form-control-sm" name="name" placeholder="Ad Soyad" required>
          </div>
          <div class="col-6">
            <input type="text" class="form-control form-control-sm" name="topic_tr" placeholder="Konu (Türkçe)">
          </div>
          <div class="col-6">
            <input type="text" class="form-control form-control-sm" name="topic_en" placeholder="Topic (English)">
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-sm btn-primary">Konuşmacı Ekle</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <h2 class="h5 card-title mb-0">Sorular</h2>
          <button id="notif-btn" type="button" class="btn btn-sm btn-outline-secondary">Yeni Soru Bildirimlerini Aç</button>
        </div>
        <p class="text-secondary small">Soru sorma her konuşmacının kendi ekranından açılıp kapatılıyor - burada tüm konuşmacılara gelen sorular birlikte görünür.</p>
        <div id="questions-list" style="max-height:400px;overflow-y:auto">{$questionsList}</div>
      </div>
    </div>
  </div>
</div>

<script>
function copyField(id) {
  var el = document.getElementById(id);
  el.select();
  el.setSelectionRange(0, 99999);
  try { navigator.clipboard.writeText(el.value); } catch (e) { document.execCommand('copy'); }
}

function pollStatus() {
  fetch('/api/status.php?event_id=' + encodeURIComponent({$eventIdJson}))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var el = document.getElementById('participant-count');
      if (el && typeof data.participantCount === 'number') el.textContent = String(data.participantCount);
    })
    .catch(function () {});
}
setInterval(pollStatus, 4000);

// "Yeni soru geldiğinde admin'e bildirim" isteği - tarayıcının kendi
// Notification API'si kullanılıyor (ekstra bir sunucu/servis gerekmez).
// İzin isteme bir kullanıcı tıklamasıyla TETİKLENMELİ (tarayıcılar sessiz
// otomatik izin isteklerini engelliyor) - bu yüzden bir buton var.
var notifBtn = document.getElementById('notif-btn');
var notificationsEnabled = false;
var lastQuestionCount = document.querySelectorAll('#questions-list [data-question-id]').length;

function updateNotifButton() {
  if (!('Notification' in window)) {
    notifBtn.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    notificationsEnabled = true;
    notifBtn.textContent = 'Bildirimler Açık';
    notifBtn.disabled = true;
  } else {
    notificationsEnabled = false;
    notifBtn.textContent = 'Yeni Soru Bildirimlerini Aç';
    notifBtn.disabled = false;
  }
}
notifBtn.addEventListener('click', function () {
  Notification.requestPermission().then(updateNotifButton);
});
updateNotifButton();

function refreshQuestions() {
  fetch('/admin/questions_feed.php?event_id=' + encodeURIComponent({$eventIdJson}))
    .then(function (res) { return res.text(); })
    .then(function (html) {
      document.getElementById('questions-list').innerHTML = html;
      var newCount = document.querySelectorAll('#questions-list [data-question-id]').length;
      if (newCount > lastQuestionCount && notificationsEnabled) {
        try {
          new Notification('Yeni soru geldi', { body: {$titleJson} });
        } catch (e) {}
      }
      lastQuestionCount = newCount;
    })
    .catch(function () {});
}
setInterval(refreshQuestions, 5000);

document.getElementById('questions-list').addEventListener('click', function (event) {
  if (!event.target.classList.contains('question-translate-btn')) return;
  var btn = event.target;
  var wrap = btn.closest('[data-question-id]');
  var lang = wrap.querySelector('.question-lang-select').value;
  var out = wrap.querySelector('.question-translation');
  out.textContent = 'Çevriliyor...';
  fetch('/admin/translate_question.php?id=' + encodeURIComponent(btn.dataset.id) + '&lang=' + encodeURIComponent(lang))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      out.textContent = data.text || (data.message || data.error || 'Hata');
    })
    .catch(function () {
      out.textContent = 'Bağlantı hatası';
    });
});
</script>
HTML;

echo admin_page('events', $event['name'], $body);
