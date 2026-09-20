<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_event') {
    delete_event((string) ($_POST['event_id'] ?? ''));
    header('Location: /admin/events.php?deleted=1');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string) ($_POST['name'] ?? ''));
    $sourceLang = trim((string) ($_POST['source_lang'] ?? 'tr')) ?: 'tr';

    if ($name === '') {
        header('Location: /admin/events.php?error=' . rawurlencode('Etkinlik adı boş olamaz'));
        exit;
    }

    $id = new_id();
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'INSERT INTO events (id, name, join_code, speaker_token, source_lang, qa_enabled, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    );
    $stmt->execute([$id, $name, new_join_code(), new_speaker_token(), $sourceLang, 'active', now_iso()]);

    header('Location: /admin/event.php?id=' . rawurlencode($id));
    exit;
}

$events = list_events();
$error = $_GET['error'] ?? null;
$deleted = ($_GET['deleted'] ?? '') === '1';
$errorBanner = $error ? notice('bad', esc($error)) : ($deleted ? notice('good', 'Etkinlik silindi.') : '');

$rows = '';
foreach ($events as $e) {
    $badge = $e['status'] === 'active'
        ? '<span class="badge text-bg-success">Aktif</span>'
        : '<span class="badge text-bg-secondary">Sona erdi</span>';
    $rows .= '<tr>
        <td><a href="/admin/event.php?id=' . esc($e['id']) . '">' . esc($e['name']) . '</a></td>
        <td>' . $badge . '</td>
        <td class="text-secondary">' . esc($e['created_at']) . '</td>
        <td class="text-end">
          <form method="post" class="d-inline" onsubmit="return confirm(\'Bu etkinliği KALICI olarak silmek istediğinize emin misiniz? Tüm konuşmacılar, transkript, sorular ve yüklenen görseller de silinecek. Bu işlem GERİ ALINAMAZ.\');">
            <input type="hidden" name="action" value="delete_event">
            <input type="hidden" name="event_id" value="' . esc($e['id']) . '">
            <button type="submit" class="btn btn-sm btn-outline-danger">Sil</button>
          </form>
        </td>
      </tr>';
}

$listHtml = count($events) === 0
    ? '<p class="text-secondary">Henüz etkinlik oluşturulmadı.</p>'
    : '<div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Ad</th><th>Durum</th><th>Oluşturulma</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>';

$langOptions = language_options_html('tr');

$body = <<<HTML
{$errorBanner}
<h1 class="h3 mb-4">Etkinlikler</h1>
<div class="card mb-4">
  <div class="card-body">
    <h2 class="h5 card-title">Yeni Etkinlik Oluştur</h2>
    <form method="post" class="row g-3 align-items-end">
      <div class="col-md-6">
        <label for="name" class="form-label">Etkinlik adı</label>
        <input type="text" class="form-control" id="name" name="name" required placeholder="Örn. Yıllık Konferans 2026">
      </div>
      <div class="col-md-4">
        <label for="source_lang" class="form-label">Konuşmacıların dili</label>
        <select class="form-select" id="source_lang" name="source_lang">{$langOptions}</select>
      </div>
      <div class="col-md-2">
        <button type="submit" class="btn btn-primary w-100">Oluştur</button>
      </div>
    </form>
  </div>
</div>
<div class="card">
  <div class="card-body">{$listHtml}</div>
</div>
HTML;

echo admin_page('events', 'Etkinlikler', $body);
