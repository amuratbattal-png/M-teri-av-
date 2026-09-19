<?php
declare(strict_types=1);

// Bootstrap 5.3 (CDN) - "sistem profesyonel ve responsive olmalı, admin
// paneli de bootstrap olmalı" isteği üzerine tüm arayüz (admin + katılımcı
// + konuşmacı ekranı) buna geçirildi. data-bs-theme="dark" Bootstrap'ın
// KENDİ yerleşik koyu renk moduyla tüm bileşenleri (kart, form, tablo)
// otomatik uyumlu hale getiriyor - ayrıca özel bir "dark CSS" yazmaya
// gerek kalmadı.
const BOOTSTRAP_CSS = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
const BOOTSTRAP_JS = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';

const EXTRA_STYLE = <<<CSS
  body { min-height: 100vh; }
  .navbar-brand { font-weight: 700; }
  .placeholder-screen { display:flex; align-items:center; justify-content:center; min-height:50vh; }
  .placeholder-screen img { max-width:100%; max-height:60vh; border-radius: .5rem; }
  #transcript { min-height: 300px; max-height: 55vh; overflow-y:auto; }
  #transcript .line { padding: .5rem 0; border-bottom: 1px dashed var(--bs-border-color); }
  #transcript .line:last-child { border-bottom: none; }
  #transcript .source { font-size: .8rem; opacity: .7; }
  #interim-line { min-height: 1.6rem; color: var(--bs-info); }
  .mic-btn { width: 120px; height: 120px; border-radius: 50%; font-size: 2.4rem; }
  .mic-btn.on { animation: pulse 1.4s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(220,53,69,.5); } 100% { box-shadow: 0 0 0 20px rgba(220,53,69,0); } }
CSS;

function nav_item(string $href, string $key, string $active, string $label): string
{
    $class = 'nav-link' . ($active === $key ? ' active' : '');
    return '<li class="nav-item"><a class="' . $class . '" href="' . esc($href) . '">' . esc($label) . '</a></li>';
}

function admin_page(string $activeNav, string $title, string $bodyHtml): string
{
    $titleEsc = esc($title);
    $bsCss = BOOTSTRAP_CSS;
    $bsJs = BOOTSTRAP_JS;
    $extraStyle = EXTRA_STYLE;
    $nav = nav_item('/admin/events.php', 'events', $activeNav, 'Etkinlikler') .
        nav_item('/admin/settings.php', 'settings', $activeNav, 'Ayarlar');

    return <<<HTML
<!doctype html>
<html lang="tr" data-bs-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$titleEsc} - Canlı Çeviri Yönetimi</title>
<link href="{$bsCss}" rel="stylesheet">
<style>{$extraStyle}</style>
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary-subtle sticky-top">
  <div class="container">
    <a class="navbar-brand" href="/admin/events.php">Canlı Çeviri</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navMain">
      <ul class="navbar-nav me-auto">
        {$nav}
      </ul>
      <a class="btn btn-outline-light btn-sm" href="/admin/logout.php">Çıkış</a>
    </div>
  </div>
</nav>
<main class="container py-4">
{$bodyHtml}
</main>
<script src="{$bsJs}"></script>
</body>
</html>
HTML;
}

/** Katılımcı/konuşmacı ekranları için sade bir kabuk - admin panelinden bilerek AYRI (navbar yok, kendi başlıklarını kendileri çiziyor). */
function public_page(string $title, string $bodyHtml, string $htmlLang = 'tr', string $extraHead = ''): string
{
    $titleEsc = esc($title);
    $langEsc = esc($htmlLang);
    $bsCss = BOOTSTRAP_CSS;
    $bsJs = BOOTSTRAP_JS;
    $extraStyle = EXTRA_STYLE;

    return <<<HTML
<!doctype html>
<html lang="{$langEsc}" data-bs-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$titleEsc}</title>
<link href="{$bsCss}" rel="stylesheet">
<style>{$extraStyle}</style>
{$extraHead}
</head>
<body>
{$bodyHtml}
<script src="{$bsJs}"></script>
</body>
</html>
HTML;
}

function notice(string $kind, string $html): string
{
    $map = ['bad' => 'danger', 'good' => 'success', 'info' => 'warning'];
    $cls = $map[$kind] ?? 'secondary';
    return '<div class="alert alert-' . $cls . '" role="alert">' . $html . '</div>';
}

/**
 * admin/event.php (ilk yüklemede) VE admin/questions_feed.php (canlı
 * tazeleme) TARAFINDAN paylaşılıyor - ikisi de AYNI HTML'i üretsin diye
 * (DRY) tek bir yerde.
 */
function render_question_list_html(array $questions, string $defaultLang): string
{
    if (count($questions) === 0) {
        return '<p class="text-secondary" id="no-questions-msg">Henüz soru gelmedi.</p>';
    }
    $rows = '';
    foreach ($questions as $q) {
        $rows .= '<div class="border-bottom py-2" data-question-id="' . esc($q['id']) . '">
        <div class="d-flex justify-content-between">
          <strong>' . esc($q['asker_name']) . '</strong>
          <span class="text-secondary small">' . esc($q['created_at']) . '</span>
        </div>
        <div>' . nl2br(esc($q['message'])) . '</div>
        <div class="mt-1 d-flex gap-2 align-items-center">
          <select class="form-select form-select-sm w-auto question-lang-select">' . language_options_html($defaultLang) . '</select>
          <button type="button" class="btn btn-sm btn-outline-info question-translate-btn" data-id="' . esc($q['id']) . '">Çevir</button>
          <span class="question-translation small text-info"></span>
        </div>
      </div>';
    }
    return $rows;
}

function render_fatal_error_page(string $message): string
{
    $body = '<main class="container py-5"><div class="alert alert-danger"><strong>Bir şeyler ters gitti</strong><pre class="mb-0 mt-2">' .
        esc($message) . '</pre></div></main>';
    return public_page('Hata', $body);
}
