<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

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
$errorBanner = $error ? notice('bad', esc($error)) : '';

$rows = '';
foreach ($events as $e) {
    $badge = $e['status'] === 'active'
        ? '<span class="badge text-bg-success">Aktif</span>'
        : '<span class="badge text-bg-secondary">Sona erdi</span>';
    $rows .= '<tr>
        <td><a href="/admin/event.php?id=' . esc($e['id']) . '">' . esc($e['name']) . '</a></td>
        <td>' . $badge . '</td>
        <td class="text-secondary">' . esc($e['created_at']) . '</td>
      </tr>';
}

$listHtml = count($events) === 0
    ? '<p class="text-secondary">Henüz etkinlik oluşturulmadı.</p>'
    : '<div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Ad</th><th>Durum</th><th>Oluşturulma</th></tr></thead><tbody>' . $rows . '</tbody></table></div>';

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
