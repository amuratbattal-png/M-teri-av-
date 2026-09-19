<?php
/**
 * Bu dosyayı `config.php` olarak kopyalayıp gerçek değerlerinizi girin.
 * `config.php` git'e eklenmez (.gitignore'da) - gerçek şifre/anahtar
 * asla depoya gitmesin diye.
 */
return [
    // Paylaşımlı (shared) hosting'de genelde cPanel'den oluşturduğunuz
    // MySQL veritabanı bilgileri buraya gelir:
    'db_dsn' => 'mysql:host=localhost;dbname=canli_ceviri;charset=utf8mb4',
    'db_user' => 'kullanici_adi',
    'db_pass' => 'sifre',

    // Kendi bilgisayarınızda (php -S ile) yerel test için MySQL yerine
    // SQLite kullanmak isterseniz db_dsn'i şuna çevirin, db_user/db_pass'a
    // gerek kalmaz:
    // 'db_dsn' => 'sqlite:' . __DIR__ . '/data/canli_ceviri.sqlite',

    // /admin panelindeki giriş ekranını (oturum tabanlı) koruyan bilgiler.
    'admin_username' => 'admin',
    'admin_password' => 'guclu-bir-sifre-belirleyin',

    // NVIDIA API (integrate.api.nvidia.com) - çeviri için kullanılıyor.
    // Burayı boş bırakıp /admin/settings.php panelinden de girebilirsiniz
    // (panelde bir değer varsa BURADAKİNİN üstüne geçer).
    'nvidia_api_key' => '',
    'nvidia_model' => 'nvidia/nemotron-3.5-lightning-30b-a3b',
];
