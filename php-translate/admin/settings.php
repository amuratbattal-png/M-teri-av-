<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
require_admin_auth();

const BRAND_UPLOAD_DIR = __DIR__ . '/../uploads/branding';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? 'save_nvidia');

    if ($action === 'save_branding') {
        $brandName = trim((string) ($_POST['brand_name'] ?? ''));
        if ($brandName === '') {
            delete_setting('brand_name');
        } else {
            upsert_setting('brand_name', $brandName);
        }
        header('Location: /admin/settings.php?saved=1');
        exit;
    }

    if ($action === 'upload_logo') {
        $validated = validate_uploaded_image($_FILES['logo'] ?? null);
        if (!$validated['ok']) {
            header('Location: /admin/settings.php?error=' . rawurlencode($validated['error']));
            exit;
        }
        if (!is_dir(BRAND_UPLOAD_DIR)) {
            mkdir(BRAND_UPLOAD_DIR, 0775, true);
        }
        // Eski logoyu (hangi uzantıyla kaydedilmiş olursa olsun) temizle -
        // aksi halde ör. önce .png sonra .jpg yüklenirse ikisi de kalır.
        foreach (glob(BRAND_UPLOAD_DIR . '/logo.*') ?: [] as $old) {
            @unlink($old);
        }
        $relativePath = 'uploads/branding/logo.' . $validated['ext'];
        if (!move_uploaded_file($_FILES['logo']['tmp_name'], __DIR__ . '/../' . $relativePath)) {
            header('Location: /admin/settings.php?error=' . rawurlencode('Logo kaydedilemedi - klasör yazma izinlerini kontrol edin.'));
            exit;
        }
        upsert_setting('brand_logo', $relativePath);
        header('Location: /admin/settings.php?saved=1');
        exit;
    }

    if ($action === 'remove_logo') {
        $current = read_setting('brand_logo');
        if ($current) {
            @unlink(__DIR__ . '/../' . $current);
        }
        delete_setting('brand_logo');
        header('Location: /admin/settings.php?saved=1');
        exit;
    }

    // action === 'save_nvidia' (varsayılan)
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
$branding = get_effective_branding();
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
    ? '<form method="post" class="mt-2"><input type="hidden" name="action" value="save_nvidia"><input type="hidden" name="clear_api_key" value="1"><button type="submit" class="btn btn-sm btn-outline-danger">Panel anahtarını sil</button></form>'
    : '';

$clearModelButton = $settings['modelSource'] === 'panel'
    ? '<form method="post" class="mt-2"><input type="hidden" name="action" value="save_nvidia"><input type="hidden" name="clear_model" value="1"><button type="submit" class="btn btn-sm btn-outline-danger">Panel model ayarını sil</button></form>'
    : '';

$modelValue = esc($settings['model']);
$modelSourceLabel = esc(source_label($settings['modelSource']));

$brandNameValue = esc($branding['name']);
$logoPreview = !empty($branding['logo'])
    ? '<div class="mb-3"><img src="' . esc('/' . $branding['logo'] . '?t=' . time()) . '" alt="" style="max-height:60px" class="d-block mb-2"><form method="post" onsubmit="return confirm(\'Logoyu kaldırmak istediğinize emin misiniz?\');"><input type="hidden" name="action" value="remove_logo"><button type="submit" class="btn btn-sm btn-outline-danger">Logoyu Kaldır</button></form></div>'
    : '<p class="text-secondary small">Henüz logo yüklenmedi - marka adı düz metin olarak gösteriliyor.</p>';

$body = <<<HTML
{$banner}
<h1 class="h3 mb-4">Ayarlar</h1>

<div class="card mb-4">
  <div class="card-body">
    <h2 class="h5 card-title">Marka</h2>
    <p class="text-secondary small">Yönetim panelinin üst menüsünde ve giriş ekranında görünen ad/logo - katılımcı ekranları bundan etkilenmez (onlar etkinliğe özel).</p>
    <form method="post" class="mb-4">
      <input type="hidden" name="action" value="save_branding">
      <label for="brand_name" class="form-label">Marka adı</label>
      <div class="input-group">
        <input type="text" class="form-control" id="brand_name" name="brand_name" value="{$brandNameValue}" placeholder="Canlı Çeviri">
        <button type="submit" class="btn btn-outline-primary">Kaydet</button>
      </div>
    </form>
    <label class="form-label">Logo</label>
    {$logoPreview}
    <form method="post" enctype="multipart/form-data" class="d-flex gap-2">
      <input type="hidden" name="action" value="upload_logo">
      <input type="file" class="form-control form-control-sm" name="logo" accept="image/png,image/jpeg,image/gif,image/webp" required>
      <button type="submit" class="btn btn-sm btn-outline-primary text-nowrap">Yükle</button>
    </form>
  </div>
</div>

<div class="card">
  <div class="card-body">
    <h2 class="h5 card-title">Çeviri (NVIDIA API)</h2>
    <p class="text-secondary">Çeviri için NVIDIA API (integrate.api.nvidia.com) anahtarı ve modeli - buradan girilen değer, config.php'nin ÜSTÜNE geçer.</p>
    <form method="post">
      <input type="hidden" name="action" value="save_nvidia">
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
