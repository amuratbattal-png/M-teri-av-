<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

if (is_admin_logged_in()) {
    header('Location: /admin/events.php');
    exit;
}

// Açık yönlendirme (open redirect) riskine karşı sadece /admin/ altındaki
// yollara izin veriliyor.
$redirectRaw = (string) ($_GET['redirect'] ?? $_POST['redirect'] ?? '/admin/events.php');
$redirect = str_starts_with($redirectRaw, '/admin/') ? $redirectRaw : '/admin/events.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $config = get_config();
    $username = (string) ($_POST['username'] ?? '');
    $password = (string) ($_POST['password'] ?? '');

    if (hash_equals((string) $config['admin_username'], $username) && hash_equals((string) $config['admin_password'], $password)) {
        log_in_admin();
        header('Location: ' . $redirect);
        exit;
    }
    $error = 'Kullanıcı adı veya şifre hatalı.';
}

$branding = get_effective_branding();
$brandNameEsc = esc($branding['name']);
$loginLogoHtml = !empty($branding['logo'])
    ? '<img src="' . esc('/' . $branding['logo']) . '" alt="" class="login-logo">'
    : '';
$faviconLink = favicon_link_html($branding);
$bsCss = BOOTSTRAP_CSS;
$bsJs = BOOTSTRAP_JS;
$fontLinks = FONT_LINKS;
$designStyle = DESIGN_STYLE;
$redirectEsc = esc($redirect);
$errorHtml = $error ? '<div class="alert alert-danger">' . esc($error) . '</div>' : '';

echo <<<HTML
<!doctype html>
<html lang="tr" data-bs-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Giriş - {$brandNameEsc}</title>
{$faviconLink}
{$fontLinks}
<link href="{$bsCss}" rel="stylesheet">
<style>{$designStyle}</style>
</head>
<body class="d-flex align-items-center justify-content-center" style="min-height:100vh">
  <div class="card" style="width:100%;max-width:380px">
    <div class="card-body p-4">
      <div class="text-center">
        {$loginLogoHtml}
        <h1 class="h4 mb-3">{$brandNameEsc}</h1>
        <p class="text-secondary mb-4">Yönetim Paneli Girişi</p>
      </div>
      {$errorHtml}
      <form method="post">
        <input type="hidden" name="redirect" value="{$redirectEsc}">
        <div class="mb-3">
          <label for="username" class="form-label">Kullanıcı adı</label>
          <input type="text" class="form-control" id="username" name="username" required autofocus>
        </div>
        <div class="mb-4">
          <label for="password" class="form-label">Şifre</label>
          <input type="password" class="form-control" id="password" name="password" required>
        </div>
        <button type="submit" class="btn btn-primary w-100">Giriş Yap</button>
      </form>
    </div>
  </div>
<script src="{$bsJs}"></script>
</body>
</html>
HTML;
