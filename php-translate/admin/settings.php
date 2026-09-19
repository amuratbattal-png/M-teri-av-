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
    ? notice('bad', esc($error))
    : ($saved ? notice('good', 'Ayarlar kaydedildi.') : '');

$apiKeyStatus = $settings['apiKeySource'] === 'none'
    ? '<span class="text-secondary">Hiçbir yerde tanımlı değil - çeviri çalışmaz.</span>'
    : '<span class="text-secondary">' . esc(source_label($settings['apiKeySource'])) . ' kullanılıyor.</span>';

$clearKeyButton = $settings['apiKeySource'] === 'panel'
    ? '<form method="post" class="mt-2"><input type="hidden" name="clear_api_key" value="1"><button type="submit" class="btn btn-sm btn-outline-danger">Panel anahtarını sil</button></form>'
    : '';

$clearModelButton = $settings['modelSource'] === 'panel'
    ? '<form method="post" class="mt-2"><input type="hidden" name="clear_model" value="1"><button type="submit" class="btn btn-sm btn-outline-danger">Panel model ayarını sil</button></form>'
    : '';

$modelValue = esc($settings['model']);
$modelSourceLabel = esc(source_label($settings['modelSource']));

$body = <<<HTML
{$banner}
<h1 class="h3 mb-4">Ayarlar</h1>
<p class="text-secondary">Çeviri için NVIDIA API (integrate.api.nvidia.com) anahtarı ve modeli - buradan girilen değer, config.php'nin ÜSTÜNE geçer.</p>

<div class="card">
  <div class="card-body">
    <form method="post">
      <div class="mb-4">
        <label for="nvidia_api_key" class="form-label">NVIDIA API anahtarı</label>
        <input type="password" class="form-control" id="nvidia_api_key" name="nvidia_api_key" placeholder="nvapi-...">
        <div class="form-text">{$apiKeyStatus} Bu kutu her zaman boş görünür - doldurup kaydedince önceki değerin üzerine yazılır, boş bırakıp kaydedersen mevcut değer DEĞİŞMEZ.</div>
        {$clearKeyButton}
      </div>
      <div class="mb-4">
        <label for="nvidia_model" class="form-label">NVIDIA model kimliği</label>
        <input type="text" class="form-control" id="nvidia_model" name="nvidia_model" value="{$modelValue}">
        <div class="form-text">Kaynak: {$modelSourceLabel}.</div>
        {$clearModelButton}
      </div>
      <button type="submit" class="btn btn-primary">Ayarları Kaydet</button>
    </form>
  </div>
</div>
HTML;

echo admin_page('settings', 'Ayarlar', $body);
