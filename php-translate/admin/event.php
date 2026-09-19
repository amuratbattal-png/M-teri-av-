<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/qrcode.php';
require_admin_auth();

const UPLOAD_DIR = __DIR__ . '/../uploads/events';
const ALLOWED_IMAGE_TYPES = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG => 'png',
    IMAGETYPE_GIF => 'gif',
    IMAGETYPE_WEBP => 'webp',
];

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

            $stmt = $pdo->prepare(
                'INSERT INTO event_speakers (id, event_id, name, topic_tr, topic_en, is_active, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
            );
            $stmt->execute([new_id(), $id, $name, $topicTr, $topicEn, $sortOrder, now_iso()]);
            header('Location: /admin/event.php?id=' . rawurlencode($id));
            exit;
        }
    } elseif ($action === 'activate_speaker') {
        activate_speaker($id, (string) ($_POST['speaker_id'] ?? ''));
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'deactivate_speaker') {
        deactivate_speaker((string) ($_POST['speaker_id'] ?? ''));
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'delete_speaker') {
        $stmt = $pdo->prepare('DELETE FROM event_speakers WHERE id = ? AND event_id = ?');
        $stmt->execute([(string) ($_POST['speaker_id'] ?? ''), $id]);
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'toggle_qa') {
        $newValue = $event['qa_enabled'] ? 0 : 1;
        $stmt = $pdo->prepare('UPDATE events SET qa_enabled = ? WHERE id = ?');
        $stmt->execute([$newValue, $id]);
        header('Location: /admin/event.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'end_event') {
        $stmt = $pdo->prepare("UPDATE events SET status = 'ended', ended_at = ? WHERE id = ?");
        $stmt->execute([now_iso(), $id]);
        header('Location: /admin/event.php?id=' . rawurlencode($id));
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
        $file = $_FILES['placeholder'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $formError = 'Görsel yüklenemedi - bir dosya seçtiğinizden emin olun.';
        } else {
            $imageInfo = @getimagesize($file['tmp_name']);
            $ext = $imageInfo ? (ALLOWED_IMAGE_TYPES[$imageInfo[2]] ?? null) : null;
            if (!$imageInfo || !$ext) {
                $formError = 'Sadece JPG, PNG, GIF veya WEBP görsel dosyaları kabul ediliyor.';
            } elseif ($file['size'] > 8 * 1024 * 1024) {
                $formError = 'Görsel çok büyük (en fazla 8 MB).';
            } else {
                if (!is_dir(UPLOAD_DIR)) {
                    mkdir(UPLOAD_DIR, 0775, true);
                }
                if (!empty($event['placeholder_image'])) {
                    @unlink(__DIR__ . '/../' . $event['placeholder_image']);
                }
                $relativePath = 'uploads/events/' . $id . '.' . $ext;
                if (move_uploaded_file($file['tmp_name'], __DIR__ . '/../' . $relativePath)) {
                    $stmt = $pdo->prepare('UPDATE events SET placeholder_image = ? WHERE id = ?');
                    $stmt->execute([$relativePath, $id]);
                    header('Location: /admin/event.php?id=' . rawurlencode($id));
                    exit;
                }
                $formError = 'Görsel kaydedilemedi - klasör yazma izinlerini kontrol edin.';
            }
        }
    }

    $event = find_event($id) ?? $event;
}

$speakers = list_event_speakers($id);
$questions = list_questions($id);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];
$joinUrl = $origin . '/join.php?code=' . rawurlencode($event['join_code']);
$speakUrl = $origin . '/speak.php?event=' . rawurlencode($event['id']) . '&token=' . rawurlencode($event['speaker_token']);
$qrDataUri = render_qr_data_uri($joinUrl);
$participantCount = count_active_participants($id);

$statusBadge = $event['status'] === 'active'
    ? '<span class="badge text-bg-success">Aktif</span>'
    : '<span class="badge text-bg-secondary">Sona erdi</span>';
$endDisabled = $event['status'] !== 'active' ? 'disabled' : '';

$errorBanner = $formError ? notice('bad', esc($formError)) : '';

$titleEsc = esc($event['name']);
$joinUrlEsc = esc($joinUrl);
$speakUrlEsc = esc($speakUrl);
$eventIdJson = json_encode($event['id']);

// --- Konuşmacılar listesi ---
$speakerRows = '';
foreach ($speakers as $s) {
    $activeBadge = $s['is_active'] ? ' <span class="badge text-bg-success">Aktif</span>' : '';
    $toggleForm = $s['is_active']
        ? '<form method="post" class="d-inline"><input type="hidden" name="action" value="deactivate_speaker"><input type="hidden" name="speaker_id" value="' . esc($s['id']) . '"><button type="submit" class="btn btn-sm btn-outline-warning">Pasif Yap</button></form>'
        : '<form method="post" class="d-inline"><input type="hidden" name="action" value="activate_speaker"><input type="hidden" name="speaker_id" value="' . esc($s['id']) . '"><button type="submit" class="btn btn-sm btn-success">Aktif Yap</button></form>';

    $speakerRows .= '<tr>
        <td>' . esc($s['name']) . $activeBadge . '</td>
        <td class="text-secondary small">' . esc($s['topic_tr']) . '</td>
        <td class="text-secondary small">' . esc($s['topic_en']) . '</td>
        <td class="text-nowrap">
          ' . $toggleForm . '
          <form method="post" class="d-inline" onsubmit="return confirm(\'Bu konuşmacıyı silmek istediğinize emin misiniz?\');">
            <input type="hidden" name="action" value="delete_speaker">
            <input type="hidden" name="speaker_id" value="' . esc($s['id']) . '">
            <button type="submit" class="btn btn-sm btn-outline-danger">Sil</button>
          </form>
        </td>
      </tr>';
}
$speakersTable = count($speakers) === 0
    ? '<p class="text-secondary">Henüz konuşmacı eklenmedi.</p>'
    : '<div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Ad Soyad</th><th>Konu (TR)</th><th>Konu (EN)</th><th></th></tr></thead><tbody>' . $speakerRows . '</tbody></table></div>';

// --- Placeholder görsel ---
$placeholderCard = '';
if (!empty($event['placeholder_image'])) {
    $imgUrl = esc('/' . $event['placeholder_image'] . '?t=' . time());
    $placeholderCard = '<img src="' . $imgUrl . '" class="img-fluid rounded mb-3" style="max-height:200px" alt="Boş ekran görseli">' .
        '<form method="post" onsubmit="return confirm(\'Görseli kaldırmak istediğinize emin misiniz?\');"><input type="hidden" name="action" value="remove_placeholder"><button type="submit" class="btn btn-sm btn-outline-danger">Görseli Kaldır</button></form>';
} else {
    $placeholderCard = '<p class="text-secondary">Henüz görsel yüklenmedi - hiçbir konuşmacı aktif değilken katılımcılar boş bir ekran görecek.</p>';
}

// --- Soru-Cevap ---
$qaToggleLabel = $event['qa_enabled'] ? 'Soru Sormayı Kapat' : 'Soru Sormayı Aç';
$qaToggleClass = $event['qa_enabled'] ? 'btn-outline-warning' : 'btn-success';
$qaStatusBadge = $event['qa_enabled']
    ? '<span class="badge text-bg-success">Soru sorma AÇIK</span>'
    : '<span class="badge text-bg-secondary">Soru sorma KAPALI</span>';

$questionsList = render_question_list_html($questions, $event['source_lang']);

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
            <p class="text-secondary small mb-0">Bağlı katılımcı: <strong id="participant-count">{$participantCount}</strong></p>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Konuşmacı Mikrofon Ekranı</h2>
        <p class="text-secondary small">Bu tek link, etkinlik boyunca konuşmayı yakalayan cihazda (ör. podyumdaki laptop) açık kalır - hangi konuşmacının aktif olduğunu aşağıdaki listeden siz değiştirirsiniz.</p>
        <div class="input-group input-group-sm mb-2">
          <input type="text" class="form-control" id="speak-url" value="{$speakUrlEsc}" readonly>
          <button class="btn btn-outline-secondary" type="button" onclick="copyField('speak-url')">Kopyala</button>
        </div>
        <a href="{$speakUrlEsc}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Mikrofon ekranını aç &rarr;</a>
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

    <div class="card">
      <div class="card-body">
        <h2 class="h5 card-title">Etkinlik Yönetimi</h2>
        <form method="post" onsubmit="return confirm('Etkinliği sonlandırmak istediğinize emin misiniz? Tüm katılımcıların bağlantısı kesilecek.');">
          <input type="hidden" name="action" value="end_event">
          <button type="submit" class="btn btn-outline-danger" {$endDisabled}>Etkinliği Sonlandır</button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-6">
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Konuşmacılar</h2>
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
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="h5 card-title mb-0">Sorular {$qaStatusBadge}</h2>
          <form method="post"><input type="hidden" name="action" value="toggle_qa"><button type="submit" class="btn btn-sm {$qaToggleClass}">{$qaToggleLabel}</button></form>
        </div>
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

function refreshQuestions() {
  fetch('/admin/questions_feed.php?event_id=' + encodeURIComponent({$eventIdJson}))
    .then(function (res) { return res.text(); })
    .then(function (html) {
      document.getElementById('questions-list').innerHTML = html;
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
