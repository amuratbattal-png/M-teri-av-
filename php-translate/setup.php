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
    $bsCss = BOOTSTRAP_CSS;
    $bsJs = BOOTSTRAP_JS;
    $designStyle = DESIGN_STYLE;
    return <<<HTML
<!doctype html>
<html lang="tr" data-bs-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kurulum - Canlı Çeviri</title>
<link href="{$bsCss}" rel="stylesheet">
<style>{$designStyle}
main { max-width: 640px; margin: 0 auto; padding: 2rem 1rem; }</style>
</head>
<body>
<main>
<h1 class="h3 mb-4">Canlı Çeviri &middot; Kurulum</h1>
{$bodyHtml}
</main>
<script src="{$bsJs}"></script>
</body>
</html>
HTML;
}

/**
 * Bu kurulum sayfası, karanlık mod zorlayan tarayıcı eklentileri
 * (Dark Reader vb.) yüzünden sayfanın KENDİ koyu temasıyla çakışıp
 * hata metninin görünmez hâle geldiği (sahibinin canlıda yaşadığı
 * gerçek bir olay) bir durumla karşılaşıldı - CSS sınıfına güvenmek
 * yerine, buradaki bildirimler her zaman AÇIK renkli, satır-içi
 * (inline) stille basılıyor; bu tür eklentiler genelde zaten açık
 * renkli kutulara dokunmuyor/ters çevirmiyor, en kötü ihtimalle
 * ters çevirseler bile okunabilir kalıyor (siyah-beyaz yerine
 * beyaz-siyah).
 */
function render_notice(string $kind, string $html): string
{
    $styles = [
        'bad' => 'background:#fee2e2;color:#7f1d1d;border:2px solid #dc2626;',
        'good' => 'background:#dcfce7;color:#14532d;border:2px solid #16a34a;',
        'info' => 'background:#fef9c3;color:#713f12;border:2px solid #ca8a04;',
    ];
    $style = $styles[$kind] ?? $styles['info'];
    return '<div style="' . $style . 'padding:0.85rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:0.92rem;font-weight:600;line-height:1.5">' . $html . '</div>';
}

if (file_exists(CONFIG_PATH)) {
    echo render_setup_page(
        render_notice('good', 'Kurulum zaten tamamlanmış görünüyor - <code>config.php</code> mevcut.') .
        '<p>Yeniden kurmak isterseniz önce sunucudaki <code>config.php</code> dosyasını silin, sonra bu sayfayı tekrar açın.</p>' .
        '<p><strong>Güvenlik için bu dosyayı (setup.php) şimdi sunucudan silmenizi öneririz</strong> - açık kalırsa, siteyi bulan biri config.php\'yi silip paneli yeniden kurarak ele geçirebilir.</p>' .
        '<p><a class="btn btn-primary" href="/admin/events.php">Yönetim paneline git &rarr;</a></p>',
    );
    exit;
}

$errors = [];
$hostNotes = [];
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

    // Doğrulama zaten başarısızsa (ör. şifre boş) burada hiçbir yan etki
    // (klasör oluşturma, bağlantı denemesi) YAPILMAMALI - önceki sürümde
    // SQLite dalı $errors'a bakmadan 'data' klasörünü oluşturuyordu,
    // geçersiz bir form gönderiminde bile boş bir klasör kalıyordu.
    // Sık yapılan bir hata: "Sunucu adresi" kutusuna localhost yerine
    // sitenin klasör yolu (ör. "localhost/site2", tarayıcı adres
    // çubuğundan kopyalanmış) ya da "http://" öneki yazılması - MySQL
    // host'u bunların hiçbirini kabul etmez, "getaddrinfo" hatasıyla
    // anlaşılması güç bir şekilde patlar. Burada otomatik temizleniyor.
    if ($values['db_type'] === 'mysql' && $values['db_host'] !== '') {
        $cleanedHost = preg_replace('#^https?://#i', '', $values['db_host']);
        $slashPos = strpos($cleanedHost, '/');
        if ($slashPos !== false) {
            $cleanedHost = substr($cleanedHost, 0, $slashPos);
        }
        if ($cleanedHost !== $values['db_host']) {
            $hostNotes[] = 'Not: "Sunucu adresi" alanına yazdığınız "' . $values['db_host'] .
                '" bir web sitesi adresine benziyor (klasör yolu ve/veya "http://" içeriyor) - ' .
                'MySQL sunucu adresleri bunları içermez, "' . $cleanedHost . '" olarak otomatik düzeltildi.';
            $values['db_host'] = $cleanedHost;
        }
    }

    if (!$errors && $values['db_type'] === 'mysql') {
        if ($values['db_host'] === '' || $values['db_name'] === '' || $values['db_user'] === '') {
            $errors[] = 'MySQL sunucu adresi, veritabanı adı ve kullanıcı adı gerekli.';
        } else {
            $dsn = 'mysql:host=' . $values['db_host'] . ';dbname=' . $values['db_name'] . ';charset=utf8mb4';
            $dbUser = $values['db_user'];
            $dbPass = $values['db_pass'];
        }
    } elseif (!$errors) {
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
                try {
                    $pdo->exec($statement);
                } catch (PDOException $e) {
                    // "CREATE TABLE IF NOT EXISTS" tekrar çalıştırmaya
                    // dayanıklı ama "CREATE INDEX"in ve "ALTER TABLE ...
                    // ADD COLUMN"ın bir "IF NOT EXISTS"i yok (eski MySQL
                    // sürümleriyle uyumluluk için bilerek kullanılmadı,
                    // bkz. schema.sql yorumu) - sihirbaz daha önce (belki
                    // config.php yazılamadan) kısmen çalıştıysa ya da
                    // schema.sql sonradan yeni bir sütun eklediyse (ör.
                    // event_speakers.photo) tablolar/indeksler/sütunlar
                    // zaten var olabilir. MySQL 1050 (tablo zaten var) /
                    // 1061 (indeks adı zaten var) / 1060 (sütun zaten var)
                    // burada GERÇEK bir hata değil, "şema zaten hazır"
                    // demek - atlanıp devam ediliyor.
                    $driverCode = (int) ($e->errorInfo[1] ?? 0);
                    $alreadyExists = in_array($driverCode, [1050, 1060, 1061], true)
                        || stripos($e->getMessage(), 'already exists') !== false
                        || stripos($e->getMessage(), 'duplicate column') !== false;
                    if (!$alreadyExists) {
                        throw $e;
                    }
                }
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
            render_notice('good', 'Kurulum tamamlandı! Veritabanı hazır, <code>config.php</code> oluşturuldu.') .
            '<p><strong>Şimdi güvenlik için bu dosyayı (setup.php) sunucudan silin</strong> - açık kalırsa, siteyi bulan biri config.php\'yi silip kurulumu tekrar çalıştırarak paneli ele geçirebilir.</p>' .
            '<p><a class="btn btn-primary" href="/admin/events.php">Yönetim paneline git &rarr;</a></p>',
        );
        exit;
    }
}

$errorBanner = $errors
    ? render_notice('bad', '&#9888; ' . implode('<br>&#9888; ', array_map('esc', $errors)))
    : '';
$hostNoteBanner = $hostNotes
    ? render_notice('info', implode('<br>', array_map('esc', $hostNotes)))
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
{$hostNoteBanner}
<p class="text-secondary">Bu sihirbaz veritabanı bağlantınızı test eder, tabloları oluşturur ve <code>config.php</code>'yi sizin için yazar - phpMyAdmin'e girmenize gerek kalmaz.</p>

<form method="post">
  <div class="card mb-4">
    <div class="card-body">
      <h2 class="h5 card-title">Veritabanı</h2>
      <div class="mb-3 d-flex flex-wrap gap-3">
        <div class="form-check">
          <input class="form-check-input" type="radio" name="db_type" value="mysql" id="db_type_mysql"{$mysqlChecked} onchange="toggleDbFields()">
          <label class="form-check-label" for="db_type_mysql">MySQL (hosting'inizdeki normal seçenek)</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" name="db_type" value="sqlite" id="db_type_sqlite"{$sqliteChecked} onchange="toggleDbFields()">
          <label class="form-check-label" for="db_type_sqlite">SQLite (sadece yerel/deneme kurulumu için)</label>
        </div>
      </div>
      <div id="mysql-fields" style="display:{$mysqlDisplay}">
        <div class="mb-3">
          <label for="db_host" class="form-label">Sunucu adresi</label>
          <input type="text" class="form-control" id="db_host" name="db_host" value="{$dbHostEsc}" placeholder="localhost">
          <div class="form-text">Genelde sadece <code>localhost</code>. Tarayıcı adres çubuğundaki site klasör adını (ör. <code>/site2</code>) veya <code>http://</code> önekini BURAYA yazmayın.</div>
        </div>
        <div class="mb-3">
          <label for="db_name" class="form-label">Veritabanı adı</label>
          <input type="text" class="form-control" id="db_name" name="db_name" value="{$dbNameEsc}">
        </div>
        <div class="mb-3">
          <label for="db_user" class="form-label">Kullanıcı adı</label>
          <input type="text" class="form-control" id="db_user" name="db_user" value="{$dbUserEsc}">
        </div>
        <div class="mb-3">
          <label for="db_pass" class="form-label">Şifre</label>
          <input type="password" class="form-control" id="db_pass" name="db_pass" value="{$dbPassEsc}">
        </div>
      </div>
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-body">
      <h2 class="h5 card-title">Yönetim paneli girişi</h2>
      <div class="mb-3">
        <label for="admin_username" class="form-label">Kullanıcı adı</label>
        <input type="text" class="form-control" id="admin_username" name="admin_username" value="{$adminUserEsc}" required>
      </div>
      <div class="mb-3">
        <label for="admin_password" class="form-label">Şifre</label>
        <input type="password" class="form-control" id="admin_password" name="admin_password" required>
      </div>
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-body">
      <h2 class="h5 card-title">NVIDIA API (çeviri için, isteğe bağlı)</h2>
      <p class="text-secondary">Boş bırakabilirsiniz - daha sonra panelin Ayarlar sayfasından da girilebilir.</p>
      <div class="mb-3">
        <label for="nvidia_api_key" class="form-label">API anahtarı</label>
        <input type="password" class="form-control" id="nvidia_api_key" name="nvidia_api_key" value="{$nvidiaKeyEsc}" placeholder="nvapi-...">
      </div>
      <div class="mb-3">
        <label for="nvidia_model" class="form-label">Model kimliği</label>
        <input type="text" class="form-control" id="nvidia_model" name="nvidia_model" value="{$nvidiaModelEsc}">
      </div>
    </div>
  </div>

  <button type="submit" class="btn btn-primary">Kurulumu Tamamla</button>
</form>

<script>
function toggleDbFields() {
  var mysqlSelected = document.querySelector('input[name="db_type"]:checked').value === 'mysql';
  document.getElementById('mysql-fields').style.display = mysqlSelected ? 'block' : 'none';
}
</script>
HTML;

echo render_setup_page($body);
