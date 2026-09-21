<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/qrcode.php';
require_admin_auth();

$eventId = (string) ($_GET['event_id'] ?? '');
$event = $eventId !== '' ? find_event($eventId) : null;
if (!$event) {
    http_response_code(404);
    echo 'Etkinlik bulunamadı.';
    exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];
$joinUrl = $origin . '/join.php?code=' . rawurlencode($event['join_code']);
$qrDataUri = render_qr_data_uri($joinUrl);

$eventNameEsc = esc($event['name']);
$joinCodeEsc = esc($event['join_code']);
$brandNameEsc = esc(get_effective_branding()['name']);

// Katılım QR'ıyla AYNI veri (data: URI), ayrıca büyükçe basılabilir bir
// "poster" içine yerleştiriliyor - masaya/girişe asılabilsin diye. SVG
// içine SVG gömme yerine <image href="data:..."> kullanıldı: chillerlan
// kütüphanesinin ham SVG çıktısını (kendi <svg> kök etiketiyle) elle
// yeniden boyutlandırmaya çalışmak kırılgan olurdu, data URI + <image>
// tüm tarayıcılarda güvenilir şekilde çalışıyor (zaten dashboard'daki
// <img> etiketinde AYNI data URI kullanılıyor, kanıtlanmış).
$svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <rect width="800" height="1100" fill="#ffffff"/>
  <text x="400" y="110" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#111111">{$eventNameEsc}</text>
  <text x="400" y="160" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#444444">Canlı çeviriye katılmak için QR kodu okutun</text>
  <rect x="150" y="220" width="500" height="500" fill="#ffffff" stroke="#cccccc" stroke-width="2"/>
  <image x="170" y="240" width="460" height="460" href="{$qrDataUri}"/>
  <text x="400" y="800" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#444444">Okutamıyorsanız katılım kodunu görevliye söyleyin:</text>
  <text x="400" y="845" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="4" fill="#111111">{$joinCodeEsc}</text>
  <text x="400" y="1050" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#888888">{$brandNameEsc}</text>
</svg>
SVG;

$safeName = preg_replace('/[^A-Za-z0-9]+/', '_', $event['name']);
$filename = 'qr_poster_' . trim((string) $safeName, '_') . '.svg';

header('Content-Type: image/svg+xml; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($svg));
echo $svg;
