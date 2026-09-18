<?php
declare(strict_types=1);

/**
 * Web tabanlı kurulum sihirbazı - phpMyAdmin'den şema import etmek/elle
 * config.php doldurmak yerine, tarayıcıdan tek bir formla:
 *  1) Girilen MySQL (ya da yerel test için SQLite) bilgileriyle bağlantıyı
 *     test eder,
 *  2) schema.sql'i o veritabanına uygular (CREATE TABLE IF NOT EXISTS -
 *     tekrar çalıştırmak güvenli, var olan tabloları BOZMAZ),
 *  3) config.php'yi (var_export ile, şifre/anahtar içinde tırnak/ters
 *     eğik çizgi olsa bile GÜVENLİ şekilde) kendisi yazar.
 *
 * GÜVENLİK: config.php zaten varsa bu betik HİÇBİR ŞEY yapmaz - aksi
 * halde siteyi bulan herkes admin şifresini sıfırlayıp paneli ele
 * geçirebilirdi. Kurulum bittikten sonra bu dosyayı (setup.php) SUNUCUDAN
 * SİLMENİZ önerilir (WordPress'in install.php'sini silmenizle aynı
 * gerekçe) - sayfanın kendisi de bunu görünür şekilde hatırlatıyor.
 */

require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/layout.php';

const DEFAULT_NVIDIA_MODEL_SETUP = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const CONFIG_PATH = __DIR__ . '/config.php';

function render_setup_page(string $bodyHtml): string
{
    $style = SHARED_STYLE;
    return <<<HTML
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kurulum - Canlı Çeviri</title>
<style>{$style}
main { max-width: 640px; }
</style>
</head>
<body>
<main>
<h1>Canlı Çeviri &middot; Kurulum</h1>
{$bodyHtml}
</main>
</body>
</html>
HTML;
}

if (file_exists(CONFIG_PATH)) {
    echo render_setup_page(
        '<div class="banner banner--good">Kurulum zaten tamamlanmış görünüyor - <code>config.php</code> mevcut.</div>' .
        '<p>Yeniden kurmak isterseniz önce sunucudaki <code>config.php</code> dosyasını silin, sonra bu sayfayı tekrar açın.</p>' .
        '<p><strong>Güvenlik için bu dosyayı (setup.php) şimdi sunucudan silmenizi öneririz</strong> - açık kalırsa, siteyi bulan biri config.php\'yi silip paneli yeniden kurarak ele geçirebilir.</p>' .
        '<p><a class="btn primary" href="/admin/sessions.php">Yönetim paneline git &rarr;</a></p>',
    );
    exit;
}

$errors = [];
$values = [
    'db_type' => 'mysql',
    'db_host' => 'localhost',
    'db_name' => '',
    'db_user' => '',
    'db_pass' => '',
    'admin_username' => 'admin',
    'admin_password' => '',
    'nvidia_api_key' => '',
    'nvidia_model' => DEFAULT_NVIDIA_MODEL_SETUP,
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($values as $key => $default) {
        if ($key !== 'db_type') {
            $values[$key] = trim((string) ($_POST[$key] ?? ''));
        }
    }
    $values['db_type'] = ($_POST['db_type'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
    if ($values['nvidia_model'] === '') {
        $values['nvidia_model'] = DEFAULT_NVIDIA_MODEL_SETUP;
    }

    if ($values['admin_username'] === '') {
        $errors[] = 'Yönetim paneli kullanıcı adı boş olamaz.';
    }
    if ($values['admin_password'] === '') {
        $errors[] = 'Yönetim paneli şifresi boş olamaz.';
    } elseif (strlen($values['admin_password']) < 6) {
        $errors[] = 'Yönetim paneli şifresi en az 6 karakter olmalı.';
    }

    $dsn = null;
    $dbUser = null;
    $dbPass = null;

    if ($values['db_type'] === 'mysql') {
        if ($values['db_host'] === '' || $values['db_name'] === '' || $values['db_user'] === '') {
            $errors[] = 'MySQL sunucu adresi, veritabanı adı ve kullanıcı adı gerekli.';
        } else {
            $dsn = 'mysql:host=' . $values['db_host'] . ';dbname=' . $values['db_name'] . ';charset=utf8mb4';
            $dbUser = $values['db_user'];
            $dbPass = $values['db_pass'];
        }
    } else {
        $dataDir = __DIR__ . '/data';
        if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true) && !is_dir($dataDir)) {
            $errors[] = "'data' klasörü oluşturulamadı - dosya izinlerini kontrol edin.";
        } else {
            $dsn = 'sqlite:' . $dataDir . '/canli_ceviri.sqlite';
        }
    }

    $pdo = null;
    if (!$errors && $dsn !== null) {
        try {
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
        } catch (PDOException $e) {
            $errors[] = 'Veritabanına bağlanılamadı: ' . $e->getMessage();
        }
    }

    if (!$errors && $pdo !== null) {
        try {
            $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
            if ($schemaSql === false) {
                throw new RuntimeException('schema.sql okunamadı.');
            }
            $statements = array_filter(array_map('trim', explode(';', $schemaSql)));
            foreach ($statements as $statement) {
                $withoutComments = trim((string) preg_replace('/^--.*$/m', '', $statement));
                if ($withoutComments === '') {
                    continue;
                }
                $pdo->exec($statement);
            }
        } catch (Throwable $e) {
            $errors[] = 'Veritabanı şeması uygulanamadı: ' . $e->getMessage();
        }
    }

    if (!$errors) {
        $config = [
            'db_dsn' => $dsn,
            'db_user' => $dbUser,
            'db_pass' => $dbPass,
            'admin_username' => $values['admin_username'],
            'admin_password' => $values['admin_password'],
            'nvidia_api_key' => $values['nvidia_api_key'],
            'nvidia_model' => $values['nvidia_model'],
        ];
        $exported = var_export($config, true);
        $written = @file_put_contents(CONFIG_PATH, "<?php\nreturn {$exported};\n");
        if ($written === false) {
            $errors[] = "config.php yazılamadı - bu klasörün web sunucusu tarafından yazılabilir (writable) olduğundan emin olun.";
        }
    }

    if (!$errors) {
        echo render_setup_page(
            '<div class="banner banner--good">Kurulum tamamlandı! Veritabanı hazır, <code>config.php</code> oluşturuldu.</div>' .
            '<p><strong>Şimdi güvenlik için bu dosyayı (setup.php) sunucudan silin</strong> - açık kalırsa, siteyi bulan biri config.php\'yi silip kurulumu tekrar çalıştırarak paneli ele geçirebilir.</p>' .
            '<p><a class="btn primary" href="/admin/sessions.php">Yönetim paneline git &rarr;</a></p>',
        );
        exit;
    }
}

$errorBanner = $errors
    ? '<div class="banner banner--bad">' . implode('<br>', array_map('esc', $errors)) . '</div>'
    : '';

$mysqlChecked = $values['db_type'] === 'mysql' ? ' checked' : '';
$sqliteChecked = $values['db_type'] === 'sqlite' ? ' checked' : '';
$mysqlDisplay = $values['db_type'] === 'mysql' ? 'block' : 'none';

$dbHostEsc = esc($values['db_host']);
$dbNameEsc = esc($values['db_name']);
$dbUserEsc = esc($values['db_user']);
$dbPassEsc = esc($values['db_pass']);
$adminUserEsc = esc($values['admin_username']);
$nvidiaKeyEsc = esc($values['nvidia_api_key']);
$nvidiaModelEsc = esc($values['nvidia_model']);

$body = <<<HTML
{$errorBanner}
<p class="muted">Bu sihirbaz veritabanı bağlantınızı test eder, tabloları oluşturur ve <code>config.php</code>'yi sizin için yazar - phpMyAdmin'e girmenize gerek kalmaz.</p>

<form method="post">
  <div class="card">
    <h2 style="margin-top:0">Veritabanı</h2>
    <div class="row" style="margin-bottom:0.75rem">
      <label style="display:inline-flex;align-items:center;gap:0.4rem;width:auto;margin:0">
        <input type="radio" name="db_type" value="mysql" style="width:auto"{$mysqlChecked} onchange="toggleDbFields()"> MySQL (hosting'inizdeki normal seçenek)
      </label>
      <label style="display:inline-flex;align-items:center;gap:0.4rem;width:auto;margin:0 0 0 1.25rem">
        <input type="radio" name="db_type" value="sqlite" style="width:auto"{$sqliteChecked} onchange="toggleDbFields()"> SQLite (sadece yerel/deneme kurulumu için)
      </label>
    </div>
    <div id="mysql-fields" style="display:{$mysqlDisplay}">
      <div class="field">
        <label for="db_host">Sunucu adresi</label>
        <input type="text" id="db_host" name="db_host" value="{$dbHostEsc}" placeholder="localhost">
      </div>
      <div class="field">
        <label for="db_name">Veritabanı adı</label>
        <input type="text" id="db_name" name="db_name" value="{$dbNameEsc}">
      </div>
      <div class="field">
        <label for="db_user">Kullanıcı adı</label>
        <input type="text" id="db_user" name="db_user" value="{$dbUserEsc}">
      </div>
      <div class="field">
        <label for="db_pass">Şifre</label>
        <input type="password" id="db_pass" name="db_pass" value="{$dbPassEsc}">
      </div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Yönetim paneli girişi</h2>
    <div class="field">
      <label for="admin_username">Kullanıcı adı</label>
      <input type="text" id="admin_username" name="admin_username" value="{$adminUserEsc}" required>
    </div>
    <div class="field">
      <label for="admin_password">Şifre</label>
      <input type="password" id="admin_password" name="admin_password" required>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">NVIDIA API (çeviri için, isteğe bağlı)</h2>
    <p class="muted">Boş bırakabilirsiniz - daha sonra panelin Ayarlar sayfasından da girilebilir.</p>
    <div class="field">
      <label for="nvidia_api_key">API anahtarı</label>
      <input type="password" id="nvidia_api_key" name="nvidia_api_key" value="{$nvidiaKeyEsc}" placeholder="nvapi-...">
    </div>
    <div class="field">
      <label for="nvidia_model">Model kimliği</label>
      <input type="text" id="nvidia_model" name="nvidia_model" value="{$nvidiaModelEsc}">
    </div>
  </div>

  <button type="submit" class="primary">Kurulumu Tamamla</button>
</form>

<script>
function toggleDbFields() {
  var mysqlSelected = document.querySelector('input[name="db_type"]:checked').value === 'mysql';
  document.getElementById('mysql-fields').style.display = mysqlSelected ? 'block' : 'none';
}
</script>
HTML;

echo render_setup_page($body);
