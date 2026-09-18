<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim((string) ($_POST['title'] ?? ''));
    $speakerId = trim((string) ($_POST['speaker_id'] ?? ''));
    $sourceLang = trim((string) ($_POST['source_lang'] ?? 'tr')) ?: 'tr';

    if ($title === '' || $speakerId === '') {
        header('Location: /admin/sessions.php?error=' . rawurlencode('Başlık ve konuşmacı gerekli'));
        exit;
    }

    $id = new_id();
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'INSERT INTO sessions (id, join_code, title, speaker_id, source_lang, speaker_token, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    $stmt->execute([$id, new_join_code(), $title, $speakerId, $sourceLang, new_speaker_token(), 'active', now_iso()]);

    header('Location: /admin/session.php?id=' . rawurlencode($id));
    exit;
}

$speakers = list_speakers();
$sessions = list_sessions();
$speakerNameById = [];
foreach ($speakers as $s) {
    $speakerNameById[$s['id']] = $s['name'];
}

$error = $_GET['error'] ?? null;
$errorBanner = $error ? '<div class="banner banner--bad">' . esc($error) . '</div>' : '';

$speakerOptions = '';
foreach ($speakers as $s) {
    $speakerOptions .= '<option value="' . esc($s['id']) . '">' . esc($s['name']) . '</option>';
}

$rows = '';
foreach ($sessions as $s) {
    $badge = $s['status'] === 'active'
        ? '<span class="badge active">Aktif</span>'
        : '<span class="badge ended">Sona erdi</span>';
    $speakerName = $speakerNameById[$s['speaker_id']] ?? 'Bilinmeyen konuşmacı';
    $rows .= '<tr>
        <td><a href="/admin/session.php?id=' . esc($s['id']) . '">' . esc($s['title']) . '</a></td>
        <td>' . esc($speakerName) . '</td>
        <td>' . $badge . '</td>
        <td class="muted">' . esc($s['created_at']) . '</td>
      </tr>';
}

$speakerPicker = count($speakers) === 0
    ? '<p class="muted">Önce <a href="/admin/speakers.php">bir konuşmacı ekleyin</a>.</p>'
    : '<form method="post" class="row" style="align-items:flex-end">
    <div class="field">
      <label for="title">Oturum başlığı</label>
      <input type="text" id="title" name="title" required placeholder="Örn. Yıllık Toplantı">
    </div>
    <div class="field" style="max-width:220px">
      <label for="speaker_id">Konuşmacı</label>
      <select id="speaker_id" name="speaker_id" required>' . $speakerOptions . '</select>
    </div>
    <div class="field" style="max-width:220px">
      <label for="source_lang">Konuşmacının dili</label>
      <select id="source_lang" name="source_lang">' . language_options_html('tr') . '</select>
    </div>
    <button type="submit" class="primary">Oturumu Aç</button>
  </form>';

$listHtml = count($sessions) === 0
    ? '<p class="muted">Henüz oturum açılmadı.</p>'
    : '<table><thead><tr><th>Başlık</th><th>Konuşmacı</th><th>Durum</th><th>Açılma</th></tr></thead><tbody>' . $rows . '</tbody></table>';

$body = <<<HTML
{$errorBanner}
<h1>Oturumlar</h1>
<div class="card">{$speakerPicker}</div>
<div class="card">{$listHtml}</div>
HTML;

echo admin_page('sessions', 'Oturumlar', $body);
