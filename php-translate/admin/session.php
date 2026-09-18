<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/qrcode.php';
require_admin_auth();

$id = (string) ($_GET['id'] ?? '');
$session = $id !== '' ? find_session($id) : null;
if (!$session) {
    http_response_code(404);
    echo admin_page('sessions', 'Bulunamadı', '<p>Oturum bulunamadı.</p>');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'end') {
    $pdo = get_pdo();
    $stmt = $pdo->prepare("UPDATE sessions SET status = 'ended', ended_at = ? WHERE id = ?");
    $stmt->execute([now_iso(), $id]);
    header('Location: /admin/session.php?id=' . rawurlencode($id));
    exit;
}

$speaker = find_speaker($session['speaker_id']);
$speakerName = $speaker['name'] ?? 'Bilinmeyen konuşmacı';

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];
$joinUrl = $origin . '/join.php?code=' . rawurlencode($session['join_code']);
$speakUrl = $origin . '/speak.php?session=' . rawurlencode($session['id']) . '&token=' . rawurlencode($session['speaker_token']);
$qrDataUri = render_qr_data_uri($joinUrl);
$participantCount = count_active_participants($session['id']);

$badge = $session['status'] === 'active'
    ? '<span class="badge active">Aktif</span>'
    : '<span class="badge ended">Sona erdi</span>';

$endButton = $session['status'] === 'active'
    ? '<form method="post" onsubmit="return confirm(\'Oturumu sonlandırmak istediğinize emin misiniz? Tüm katılımcıların bağlantısı kesilecek.\');">
        <input type="hidden" name="action" value="end">
        <button type="submit" class="danger">Oturumu Sonlandır</button>
      </form>'
    : '<p class="muted">Bu oturum sona erdi.</p>';

$pollScript = $session['status'] === 'active'
    ? "setInterval(pollStatus, 4000);"
    : "";

$sessionIdJs = json_encode($session['id']);
$titleEsc = esc($session['title']);
$speakerNameEsc = esc($speakerName);
$sourceLangEsc = esc($session['source_lang']);
$joinUrlEsc = esc($joinUrl);
$speakUrlEsc = esc($speakUrl);

$body = <<<HTML
<p><a href="/admin/sessions.php">&larr; Oturumlar</a></p>
<h1>{$titleEsc} {$badge}</h1>
<p class="muted">Konuşmacı: {$speakerNameEsc} &middot; Kaynak dil: {$sourceLangEsc}</p>

<div class="card">
  <h2 style="margin-top:0">Katılım (QR kod)</h2>
  <div class="row" style="align-items:flex-start;gap:1.5rem">
    <div class="qr-wrap"><img src="{$qrDataUri}" alt="Katılım QR kodu" width="220" height="220"></div>
    <div style="flex:1;min-width:240px">
      <p class="muted">Katılımcılar bu kodu okutarak veya aşağıdaki linke giderek katılabilir - giriş/şifre gerekmez.</p>
      <div class="copy-box">
        <input type="text" class="mono" id="join-url" value="{$joinUrlEsc}" readonly>
        <button type="button" onclick="copyField('join-url')">Kopyala</button>
      </div>
      <p class="muted" style="margin-top:0.6rem">Şu anda bağlı katılımcı: <strong id="participant-count">{$participantCount}</strong></p>
    </div>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0">Konuşmacı ekranı</h2>
  <p class="muted">Bu linki konuşmacının kendi telefon/tablet/bilgisayarında açın - mikrofon izni istenecek. Link kimseyle paylaşılmamalı.</p>
  <div class="copy-box">
    <input type="text" class="mono" id="speak-url" value="{$speakUrlEsc}" readonly>
    <button type="button" onclick="copyField('speak-url')">Kopyala</button>
  </div>
  <p style="margin-top:0.6rem"><a class="btn" href="{$speakUrlEsc}" target="_blank" rel="noopener">Konuşmacı ekranını aç &rarr;</a></p>
</div>

<div class="card">{$endButton}</div>

<script>
function copyField(id) {
  var el = document.getElementById(id);
  el.select();
  el.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(el.value);
  } catch (e) {
    document.execCommand('copy');
  }
}

function pollStatus() {
  fetch('/api/status.php?session_id=' + encodeURIComponent({$sessionIdJs}))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var el = document.getElementById('participant-count');
      if (el && typeof data.participantCount === 'number') {
        el.textContent = String(data.participantCount);
      }
    })
    .catch(function () {});
}
{$pollScript}
</script>
HTML;

echo admin_page('sessions', $session['title'], $body);
