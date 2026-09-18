<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $apiKey = trim((string) ($_POST['nvidia_api_key'] ?? ''));
    $model = trim((string) ($_POST['nvidia_model'] ?? ''));
    $clearApiKey = ($_POST['clear_api_key'] ?? '') === '1';
    $clearModel = ($_POST['clear_model'] ?? '') === '1';

    try {
        update_nvidia_settings($apiKey ?: null, $model ?: null, $clearApiKey, $clearModel);
    } catch (Throwable $e) {
        header('Location: /admin/settings.php?error=' . rawurlencode($e->getMessage()));
        exit;
    }

    header('Location: /admin/settings.php?saved=1');
    exit;
}

$settings = get_effective_nvidia_settings();
$saved = ($_GET['saved'] ?? '') === '1';
$error = $_GET['error'] ?? null;

function source_label(string $source): string
{
    return match ($source) {
        'panel' => 'Panelde kayıtlı',
        'config' => "config.php'den",
        default => 'Tanımsız',
    };
}

$banner = $error
    ? '<div class="banner banner--bad">' . esc($error) . '</div>'
    : ($saved ? '<div class="banner banner--good">Ayarlar kaydedildi.</div>' : '');

$apiKeyStatus = $settings['apiKeySource'] === 'none'
    ? '<span class="muted">Hiçbir yerde tanımlı değil - çeviri çalışmaz.</span>'
    : '<span class="muted">' . esc(source_label($settings['apiKeySource'])) . ' kullanılıyor.</span>';

$clearKeyButton = $settings['apiKeySource'] === 'panel'
    ? '<form method="post" style="margin-top:0.5rem">
        <input type="hidden" name="clear_api_key" value="1">
        <button type="submit" class="danger">Panel anahtarını sil</button>
      </form>'
    : '';

$clearModelButton = $settings['modelSource'] === 'panel'
    ? '<form method="post" style="margin-top:0.5rem">
        <input type="hidden" name="clear_model" value="1">
        <button type="submit" class="danger">Panel model ayarını sil</button>
      </form>'
    : '';

$modelValue = esc($settings['model']);
$modelSourceLabel = esc(source_label($settings['modelSource']));

$body = <<<HTML
{$banner}
<h1>Ayarlar</h1>
<p class="muted">Çeviri için NVIDIA API (integrate.api.nvidia.com) anahtarı ve modeli - buradan girilen değer, config.php'nin ÜSTÜNE geçer.</p>

<div class="card">
  <form method="post">
    <div class="field">
      <label for="nvidia_api_key">NVIDIA API anahtarı</label>
      <input type="password" id="nvidia_api_key" name="nvidia_api_key" placeholder="nvapi-...">
      <p class="muted" style="margin-top:0.35rem">{$apiKeyStatus} Bu kutu her zaman boş görünür - doldurup kaydedince önceki değerin üzerine yazılır, boş bırakıp kaydedersen mevcut değer DEĞİŞMEZ.</p>
      {$clearKeyButton}
    </div>
    <div class="field" style="margin-top:1.25rem">
      <label for="nvidia_model">NVIDIA model kimliği</label>
      <input type="text" id="nvidia_model" name="nvidia_model" value="{$modelValue}">
      <p class="muted" style="margin-top:0.35rem">Kaynak: {$modelSourceLabel}.</p>
      {$clearModelButton}
    </div>
    <button type="submit" class="primary" style="margin-top:1.25rem">Ayarları Kaydet</button>
  </form>
</div>
HTML;

echo admin_page('settings', 'Ayarlar', $body);
