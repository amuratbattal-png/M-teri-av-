<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['delete_id'])) {
        $pdo = get_pdo();
        $stmt = $pdo->prepare('DELETE FROM speakers WHERE id = ?');
        $stmt->execute([$_POST['delete_id']]);
        header('Location: /admin/speakers.php');
        exit;
    }

    $name = trim((string) ($_POST['name'] ?? ''));
    if ($name === '') {
        header('Location: /admin/speakers.php?error=' . rawurlencode('Ad boş olamaz'));
        exit;
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare('INSERT INTO speakers (id, name, created_at) VALUES (?, ?, ?)');
    $stmt->execute([new_id(), $name, now_iso()]);
    header('Location: /admin/speakers.php');
    exit;
}

$speakers = list_speakers();
$error = $_GET['error'] ?? null;

$rows = '';
foreach ($speakers as $s) {
    $rows .= '<tr>
        <td>' . esc($s['name']) . '</td>
        <td class="muted">' . esc($s['created_at']) . '</td>
        <td>
          <form method="post" onsubmit="return confirm(\'Bu konuşmacıyı silmek istediğinize emin misiniz?\');">
            <input type="hidden" name="delete_id" value="' . esc($s['id']) . '">
            <button type="submit" class="danger">Sil</button>
          </form>
        </td>
      </tr>';
}

$errorBanner = $error ? '<div class="banner banner--bad">' . esc($error) . '</div>' : '';
$listHtml = count($speakers) === 0
    ? '<p class="muted">Henüz konuşmacı eklenmedi.</p>'
    : '<table><thead><tr><th>Ad</th><th>Eklenme</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table>';

$body = <<<HTML
{$errorBanner}
<h1>Konuşmacılar</h1>
<div class="card">
  <form method="post" class="row" style="align-items:flex-end">
    <div class="field">
      <label for="name">Yeni konuşmacı adı</label>
      <input type="text" id="name" name="name" required placeholder="Örn. Ahmet Yılmaz">
    </div>
    <button type="submit" class="primary">Ekle</button>
  </form>
</div>
<div class="card">{$listHtml}</div>
HTML;

echo admin_page('speakers', 'Konuşmacılar', $body);
