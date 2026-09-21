<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/qrcode.php';
require_admin_auth();

const SPEAKER_PHOTO_DIR = __DIR__ . '/../uploads/speakers';

$id = (string) ($_GET['id'] ?? '');
$speaker = $id !== '' ? find_event_speaker($id) : null;
if (!$speaker) {
    http_response_code(404);
    echo admin_page('events', 'Bulunamadı', notice('bad', 'Konuşmacı bulunamadı.'));
    exit;
}
$event = find_event($speaker['event_id']);
if (!$event) {
    http_response_code(404);
    echo admin_page('events', 'Bulunamadı', notice('bad', 'Etkinlik bulunamadı.'));
    exit;
}

$formError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $pdo = get_pdo();

    if ($action === 'update_info') {
        $name = trim((string) ($_POST['name'] ?? ''));
        $topicTr = trim((string) ($_POST['topic_tr'] ?? ''));
        $topicEn = trim((string) ($_POST['topic_en'] ?? ''));
        if ($name === '') {
            $formError = 'Konuşmacı adı boş olamaz.';
        } else {
            $stmt = $pdo->prepare('UPDATE event_speakers SET name = ?, topic_tr = ?, topic_en = ? WHERE id = ?');
            $stmt->execute([$name, $topicTr, $topicEn, $id]);
            header('Location: /admin/speaker.php?id=' . rawurlencode($id) . '&saved=1');
            exit;
        }
    } elseif ($action === 'activate') {
        activate_speaker($event['id'], $id);
        header('Location: /admin/speaker.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'deactivate') {
        deactivate_speaker($id);
        header('Location: /admin/speaker.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'set_lang') {
        $lang = (string) ($_POST['source_lang'] ?? 'tr');
        if (!in_array($lang, ['tr', 'en'], true)) {
            $lang = 'tr';
        }
        $stmt = $pdo->prepare('UPDATE event_speakers SET source_lang = ? WHERE id = ?');
        $stmt->execute([$lang, $id]);
        header('Location: /admin/speaker.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'toggle_qa') {
        $newValue = $speaker['qa_enabled'] ? 0 : 1;
        $stmt = $pdo->prepare('UPDATE event_speakers SET qa_enabled = ? WHERE id = ?');
        $stmt->execute([$newValue, $id]);
        header('Location: /admin/speaker.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'upload_photo') {
        $validated = validate_uploaded_image($_FILES['photo'] ?? null);
        if (!$validated['ok']) {
            $formError = $validated['error'];
        } else {
            if (!is_dir(SPEAKER_PHOTO_DIR)) {
                mkdir(SPEAKER_PHOTO_DIR, 0775, true);
            }
            if (!empty($speaker['photo'])) {
                @unlink(__DIR__ . '/../' . $speaker['photo']);
            }
            $relativePath = 'uploads/speakers/' . $id . '.' . $validated['ext'];
            if (move_uploaded_file($_FILES['photo']['tmp_name'], __DIR__ . '/../' . $relativePath)) {
                $stmt = $pdo->prepare('UPDATE event_speakers SET photo = ? WHERE id = ?');
                $stmt->execute([$relativePath, $id]);
                header('Location: /admin/speaker.php?id=' . rawurlencode($id));
                exit;
            }
            $formError = 'Fotoğraf kaydedilemedi - klasör yazma izinlerini kontrol edin.';
        }
    } elseif ($action === 'remove_photo') {
        if (!empty($speaker['photo'])) {
            @unlink(__DIR__ . '/../' . $speaker['photo']);
            $stmt = $pdo->prepare('UPDATE event_speakers SET photo = NULL WHERE id = ?');
            $stmt->execute([$id]);
        }
        header('Location: /admin/speaker.php?id=' . rawurlencode($id));
        exit;
    } elseif ($action === 'delete_speaker') {
        if (!empty($speaker['photo'])) {
            @unlink(__DIR__ . '/../' . $speaker['photo']);
        }
        $stmt = $pdo->prepare('DELETE FROM event_speakers WHERE id = ?');
        $stmt->execute([$id]);
        header('Location: /admin/event.php?id=' . rawurlencode($event['id']));
        exit;
    }

    $speaker = find_event_speaker($id) ?? $speaker;
}

$saved = ($_GET['saved'] ?? '') === '1';

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];
$speakUrl = $origin . '/speak.php?speaker=' . rawurlencode($speaker['id']) . '&token=' . rawurlencode($speaker['token']);
$speakQrDataUri = render_qr_data_uri($speakUrl);

$statusBadge = $speaker['is_active']
    ? '<span class="badge text-bg-success">Aktif</span>'
    : '<span class="badge text-bg-secondary">Pasif</span>';

$errorBanner = $formError ? notice('bad', esc($formError)) : ($saved ? notice('good', 'Kaydedildi.') : '');

$nameEsc = esc($speaker['name']);
$topicTrEsc = esc($speaker['topic_tr']);
$topicEnEsc = esc($speaker['topic_en']);
$speakUrlEsc = esc($speakUrl);
$eventNameEsc = esc($event['name']);
$eventIdEsc = esc($event['id']);

$photoCard = !empty($speaker['photo'])
    ? '<img src="' . esc('/' . $speaker['photo'] . '?t=' . time()) . '" class="rounded-circle mb-3" width="96" height="96" style="object-fit:cover" alt="">' .
      '<form method="post" onsubmit="return confirm(\'Fotoğrafı kaldırmak istediğinize emin misiniz?\');"><input type="hidden" name="action" value="remove_photo"><button type="submit" class="btn btn-sm btn-outline-danger">Fotoğrafı Kaldır</button></form>'
    : '<p class="text-secondary small">Henüz fotoğraf yüklenmedi.</p>';

$activateForm = $speaker['is_active']
    ? '<form method="post" onsubmit="return confirm(\'Bu konuşmacıyı pasif yapmak istediğinize emin misiniz?\');"><input type="hidden" name="action" value="deactivate"><button type="submit" class="btn btn-outline-warning">Pasif Yap</button></form>'
    : '<form method="post"><input type="hidden" name="action" value="activate"><button type="submit" class="btn btn-success">Aktif Yap</button></form>';

$trLangActive = $speaker['source_lang'] === 'en' ? '' : 'active';
$enLangActive = $speaker['source_lang'] === 'en' ? 'active' : '';

$qaToggleLabel = $speaker['qa_enabled'] ? 'Soru Sormayı Kapat' : 'Soru Sormayı Aç';
$qaToggleClass = $speaker['qa_enabled'] ? 'btn-outline-warning' : 'btn-success';
$qaStatusBadge = $speaker['qa_enabled']
    ? '<span class="badge text-bg-success">Soru sorma AÇIK</span>'
    : '<span class="badge text-bg-secondary">Soru sorma KAPALI</span>';

$questions = list_questions_for_speaker($event['id'], $id);
$questionsHtml = '';
if (count($questions) === 0) {
    $questionsHtml = '<p class="text-secondary small">Henüz soru gelmedi.</p>';
} else {
    foreach ($questions as $q) {
        $questionsHtml .= '<div class="border-bottom py-2" data-question-id="' . esc($q['id']) . '">
        <div class="d-flex justify-content-between">
          <strong>' . esc($q['asker_name']) . '</strong>
          <span class="text-secondary small">' . esc($q['created_at']) . '</span>
        </div>
        <div>' . nl2br(esc($q['message'])) . '</div>
        <div class="mt-1 d-flex gap-2 align-items-center">
          <select class="form-select form-select-sm w-auto question-lang-select">' . language_options_html($event['source_lang']) . '</select>
          <button type="button" class="btn btn-sm btn-outline-info question-translate-btn" data-id="' . esc($q['id']) . '">Çevir</button>
          <span class="question-translation small text-info"></span>
        </div>
      </div>';
    }
}

$body = <<<HTML
<p><a href="/admin/event.php?id={$eventIdEsc}">&larr; {$eventNameEsc}</a></p>
<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
  <h1 class="h3 mb-0">{$nameEsc} {$statusBadge}</h1>
</div>
{$errorBanner}

<div class="row g-4">
  <div class="col-lg-6">
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Temel Bilgiler</h2>
        <form method="post">
          <input type="hidden" name="action" value="update_info">
          <div class="mb-3">
            <label class="form-label">Ad Soyad</label>
            <input type="text" class="form-control" name="name" value="{$nameEsc}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Konu (Türkçe)</label>
            <input type="text" class="form-control" name="topic_tr" value="{$topicTrEsc}">
          </div>
          <div class="mb-3">
            <label class="form-label">Konu (İngilizce)</label>
            <input type="text" class="form-control" name="topic_en" value="{$topicEnEsc}">
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Kaydet</button>
        </form>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Fotoğraf</h2>
        {$photoCard}
        <form method="post" enctype="multipart/form-data" class="d-flex gap-2 mt-2">
          <input type="hidden" name="action" value="upload_photo">
          <input type="file" class="form-control form-control-sm" name="photo" accept="image/png,image/jpeg,image/gif,image/webp" required>
          <button type="submit" class="btn btn-sm btn-outline-primary text-nowrap">Yükle</button>
        </form>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Mikrofon Ekranı</h2>
        <p class="text-secondary small">Bu konuşmacının KENDİ mikrofon linki/QR'ı - konuşmacının kendi cihazına gönderin, buradan konuşmasını yakalayıp kendini aktif/pasif yapabilir.</p>
        <div class="d-flex gap-3 flex-wrap align-items-start">
          <div class="bg-white p-2 rounded"><img src="{$speakQrDataUri}" width="160" height="160" alt="Mikrofon ekranı QR kodu"></div>
          <div class="flex-grow-1">
            <div class="input-group input-group-sm mb-2">
              <input type="text" class="form-control" id="speak-url" value="{$speakUrlEsc}" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="copyField('speak-url')">Kopyala</button>
            </div>
            <a href="{$speakUrlEsc}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Mikrofon ekranını aç &rarr;</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card border-danger-subtle">
      <div class="card-body">
        <h2 class="h5 card-title">Sil</h2>
        <p class="text-secondary small mb-2">Bu konuşmacıyı roster'dan kaldırır (geçmiş transkript/sorular etkinlikte kalır, "silinmiş konuşmacı" olarak görünür).</p>
        <form method="post" onsubmit="return confirm('Bu konuşmacıyı silmek istediğinize emin misiniz?');">
          <input type="hidden" name="action" value="delete_speaker">
          <button type="submit" class="btn btn-outline-danger">Konuşmacıyı Sil</button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-6">
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Konuşma Durumu</h2>
        <p class="text-secondary small">Aktif olduğunda katılımcı ekranında bu konuşmacı görünür - aynı anda sadece bir konuşmacı aktif olabilir.</p>
        {$activateForm}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5 card-title">Konuşma Dili</h2>
        <p class="text-secondary small">Bu konuşmacı hangi dilde konuşuyor - mikrofonun konuşma tanıması buna göre ayarlanır.</p>
        <div class="btn-group btn-group-sm" role="group">
          <form method="post"><input type="hidden" name="action" value="set_lang"><input type="hidden" name="source_lang" value="tr"><button type="submit" class="btn btn-outline-secondary {$trLangActive}">Türkçe</button></form>
          <form method="post"><input type="hidden" name="action" value="set_lang"><input type="hidden" name="source_lang" value="en"><button type="submit" class="btn btn-outline-secondary {$enLangActive}">İngilizce</button></form>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="h5 card-title mb-0">Sorular {$qaStatusBadge}</h2>
          <form method="post"><input type="hidden" name="action" value="toggle_qa"><button type="submit" class="btn btn-sm {$qaToggleClass}">{$qaToggleLabel}</button></form>
        </div>
        <div id="questions-list" style="max-height:400px;overflow-y:auto">{$questionsHtml}</div>
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

echo admin_page('events', $speaker['name'], $body);
