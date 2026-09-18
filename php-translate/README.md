# Canlı Çeviri Sistemi — PHP Sürümü

> Bu, aynı repodaki `apps/translate/` (Cloudflare Workers sürümü) ile
> AYNI ürünün PHP + MySQL üzerinde çalışan, Cloudflare'e hiç ihtiyaç
> duymayan yeniden yazımı ("cloudflare kullanmak istemiyorum" - sahibi).
> **Bu artık aktif/kullanılacak sürüm** - `apps/translate/` repoda
> duruyor (silinmedi, ileride tekrar istenirse diye) ama şu an
> kullanılmıyor.

## Ne yapıyor

Bir konuşmacı bir oturum açar, kendi cihazından (telefon/tablet/PC,
Chrome önerilir) konuşur. Katılımcılar bir QR kod okutarak - giriş/
şifre gerekmeden - katılır, kendi dillerini seçer, konuşmanın anlık
çevirisini hem yazılı (altyazı) hem sesli (kendi cihazlarının
seslendirmesiyle) takip eder. Geçmiş cümleler ekranda kalır, tekrar
okunabilir. Ayrı bir yönetim paneli (`/admin/`) konuşmacı ekler/siler,
oturum açar/kapatır, QR kodu/linkleri gösterir.

## Mimari - Cloudflare sürümünden FARKI

Cloudflare sürümü WebSocket (Durable Object + Hibernation API) ile
anlık yayın yapıyordu - PHP'de (özellikle ucuz/paylaşımlı hosting'de)
kalıcı bir WebSocket sunucusu çalıştırmak mümkün değil (Apache/PHP-FPM
her istekten sonra süreci kapatır, sürekli açık bir bağlantı tutamaz).
Bunun yerine **polling (anket)** kullanılıyor:

- Konuşmacının tarayıcısı, bitmiş her cümleyi `POST /api/speak_post.php`
  ile sunucuya gönderir (aynı Web Speech API, tarayıcıda ücretsiz STT).
- Katılımcının tarayıcısı **her 2 saniyede bir**
  `GET /api/participant_poll.php` ile "benden sonraki yeni cümleler var
  mı?" diye sorar - yeni cümle varsa alır, kendi cihazında seslendirir
  (`speechSynthesis`, yine ücretsiz).
- Çeviri, konuşmacı cümleyi gönderdiği ANDA değil, bir katılımcı O
  CÜMLEYİ O DİLDE İLK istediğinde yapılıp veritabanına önbelleğe
  alınıyor (`transcript_entries.translations` JSON sütunu) - aynı dili
  paylaşan sonraki katılımcılar/anketler için tekrar NVIDIA çağrısı
  yapılmıyor.
- Katılımcı sayısı, her anket isteğinin kendisi bir "nabız" (heartbeat)
  sayılarak hesaplanıyor (`participant_pings` tablosu, son 15 saniyede
  görülen benzersiz `client_id` sayısı) - ayrı bir WebSocket bağlantısı
  olmadığı için.

**Sonuç: gecikme WebSocket'e göre biraz daha yüksek (en fazla ~2
saniye, anket aralığı kadar) ama herhangi bir paylaşımlı PHP+MySQL
hosting'de (cPanel dahil) çalışır - özel bir süreç/daemon/SSH erişimi
gerekmez.**

## Dosya yapısı

```
php-translate/
  schema.sql              MySQL/SQLite uyumlu şema
  config.example.php      config.php'ye kopyalanıp doldurulacak örnek
  vendor/                 chillerlan/php-qrcode (QR SVG üretimi) - VENDORED,
                          composer çalıştırmaya GEREK YOK, FTP ile olduğu gibi
                          yüklenebilir
  includes/               Ortak fonksiyonlar (db, auth, çeviri, ayarlar, layout)
  admin/                  Yönetim paneli (speakers.php, sessions.php, session.php, settings.php)
  api/                    speak_post.php, participant_poll.php, status.php
  join.php                Katılımcı sayfası (?code=XXXXXX)
  speak.php               Konuşmacı ekranı (?session=...&token=...)
```

## Kurulum (paylaşımlı/cPanel hosting için)

1. **`php-translate/` klasörünün TÜM içeriğini** (vendor/ dahil) FTP ile
   hosting'inizdeki bir klasöre yükleyin (ör. `public_html/ceviri/` ya
   da kendi alt alan adınız `ceviri.ajansim.net` için ayrılmış klasör).
2. cPanel'den bir **MySQL veritabanı ve kullanıcı** oluşturun (cPanel
   "MySQL Databases" bölümü).
3. **phpMyAdmin**'den bu veritabanına `schema.sql` dosyasını içe
   aktarın (Import sekmesi) - 6 tablo oluşturacak.
4. `config.example.php` dosyasını **`config.php` olarak kopyalayın**
   (aynı klasörde) ve gerçek değerleri girin: MySQL bilgileri, panel
   şifresi, NVIDIA API anahtarı (isterseniz boş bırakıp panelden de
   girebilirsiniz - bkz. aşağıda).
5. `https://sizin-alan-adiniz/ceviri/admin/sessions.php` adresine gidin
   (Basic Auth ile giriş isteyecek - kullanıcı adı/şifre `config.php`de
   belirlediğiniz), bir konuşmacı ekleyin, bir oturum açın.

**ÖNEMLİ - HTTPS:** Basic Auth şifresi şifrelenmeden (düz metin)
gönderilir, bu yüzden hosting'inizde **mutlaka HTTPS/SSL aktif olmalı**
(çoğu cPanel hosting'de ücretsiz "AutoSSL" ile otomatik gelir). Ayrıca
tarayıcıların mikrofon (`getUserMedia`) ve konuşma tanıma API'sine izin
vermesi için de HTTPS ŞART - HTTP üzerinden konuşmacı ekranı mikrofona
erişemez.

## NVIDIA API anahtarını panelden ekleme

`apps/translate` (Cloudflare) sürümündeki AYNI karar - `/admin/settings.php`
sayfasından NVIDIA anahtarı/model girilebiliyor, `config.php`'nin
ÜSTÜNE geçiyor. `config.php`'yi hiç düzenlemeden de sadece bu panelden
anahtar girip çeviriyi çalışır hale getirebilirsiniz.

## Yerel test (kendi bilgisayarınızda, hosting'e yüklemeden önce)

```bash
cd php-translate
cp config.example.php config.php
# config.php içinde db_dsn'i şuna çevirin:
#   'db_dsn' => 'sqlite:' . __DIR__ . '/data/canli_ceviri.sqlite',
mkdir -p data
php -r '$pdo = new PDO("sqlite:" . __DIR__ . "/data/canli_ceviri.sqlite"); $pdo->exec(file_get_contents("schema.sql"));'
php -S 127.0.0.1:8099
# tarayıcıda http://127.0.0.1:8099/admin/sessions.php
```

## Bu oturumda GERÇEKTEN test edildi (Cloudflare sürümünden FARKLI olarak)

Cloudflare sürümü hiç çalıştırılamamıştı (sandbox'ın Cloudflare'e ağ
erişimi yok) - bu PHP sürümü ise `php -S` ile gerçekten çalıştırılıp
SQLite üzerinden uçtan uca test edildi:

- Admin Basic Auth (doğru/yanlış şifre).
- Konuşmacı ekleme/silme, oturum açma.
- QR kod üretimi (gerçek SVG data URI, tarayıcıda render edilebilir).
- Konuşmacı token doğrulama (doğru/yanlış token, 401).
- `speak_post.php` final cümle → `participant_poll.php` ile alma (kaynak
  dilde - çeviri gerekmeden).
- Farklı dilde katılım → çeviri denemesi → NVIDIA'ya bu sandbox'tan ağ
  erişimi olmadığı için **beklenen şekilde** başarısız oldu, katılımcıya
  `[çeviri yapılamadı] <orijinal metin>` + `translation_ok:false` olarak
  DÜRÜST bir şekilde yansıdı (sessizce yanlış bir şey göstermedi).
- Artımlı anket (`after_seq`) - sadece yeni cümleleri döndürdüğü
  doğrulandı.
- Oturum sonlandırma - hem admin'den hem sonrasında katılımcı/konuşmacı
  API çağrılarının doğru şekilde reddedildiği (410/`ended:true`)
  doğrulandı.
- Ayarlar panelinden NVIDIA anahtarı kaydetme/silme - veritabanına
  gerçekten yazıldığı/silindiği doğrulandı.
- **Gerçek bir hata bulundu ve düzeltildi:** "var ise güncelle" (upsert)
  mantığı ilk yazımda MySQL söz dizimini (`ON DUPLICATE KEY UPDATE`)
  SQLite'a `try/catch` ile "düşürmeye" çalışıyordu - ama SQLite,
  `PDO::prepare()` anında (execute'tan ÖNCE) hata fırlattığı için bu
  hata try bloğunun DIŞINDA kalıp siteyi çökertiyordu. Çözüm:
  `includes/db.php`'de tek, sürücüye göre doğru SQL üreten bir
  `upsert()` yardımcı fonksiyonu (bkz. içindeki yorum) - artık HİÇBİR
  yerde bu kırılgan try/catch deseni yok.
- **Gerçek bir XSS bulundu ve düzeltildi:** `admin/session.php`'de
  oturum başlığı/konuşmacı adı `esc()` olmadan doğrudan HTML'e
  yazılıyordu (`<script>` içeren bir başlıkla test edilip doğrulandı) -
  düzeltildi, ayrıca `includes/layout.php`'deki `admin_page()`/
  `public_page()` artık `$title` parametresini KENDİ İÇİNDE escape
  ediyor (tek merkezi yer - gelecekte yeni bir sayfa eklenirken aynı
  hatanın tekrarlanma riski azaltılıyor).

## Bilinen sınırlamalar (dürüst liste)

- **STT/TTS güvenilirliği tarayıcıya bağlı** - Cloudflare sürümüyle
  AYNI durum (Web Speech API resmi standart değil, Chrome/Edge önerilir,
  Safari/iOS kısmi, Firefox yok).
- **Anket (polling) gecikmesi** - katılımcı en kötü ihtimalle ~2 saniye
  sonra yeni cümleyi görür (WebSocket'teki "anlık" hissin yerini
  alıyor, ama konferans altyazısı için pratikte fark edilmez).
- **Katılımcı sayısı yaklaşık** - son 15 saniyede anket atan benzersiz
  `client_id` sayısı; bir katılımcı sekmeyi kapattıktan sonra 15 saniye
  boyunca hâlâ "bağlı" gösterilebilir.
- **Geçmiş sınırı 20 cümle** (`HISTORY_LIMIT`,
  `api/participant_poll.php`) - Cloudflare sürümüyle AYNI karar.
- **Çeviri kalitesi tek bir hızlı LLM çağrısı** - profesyonel simultane
  tercüme değil.
- **QR kod kütüphanesi (chillerlan/php-qrcode) `vendor/`'da commit
  edilmiş durumda** (composer'ın normalde önerdiği ".gitignore'a ekle,
  kurulumda `composer install` çalıştır" deseninin TERSİ) - bilinçli
  bir tercih: birçok ucuz paylaşımlı hosting'de SSH/composer erişimi
  olmuyor, sadece FTP var; bu yüzden bağımlılık kodu klasörün içinde,
  FTP ile olduğu gibi yüklenebilir hale getirildi. `.git` geçmişi ve
  test/örnek dosyaları çıkarılıp sadece çalışması gereken ~1.6 MB'lık
  `src/` + autoloader dosyaları bırakıldı.
- **HENÜZ gerçek bir MySQL sunucusunda test edilmedi** - bu sandbox'ta
  MySQL yok, sadece SQLite ile test edildi. `upsert()` fonksiyonu her
  iki sürücü için de doğru SQL ürettiği KODDA doğrulandı (sürücü adına
  göre dallanma) ama MySQL koluyla GERÇEK bir çalıştırma yapılmadı -
  sahibi kendi hosting'inde ilk denemede küçük bir MySQL söz dizimi
  sürprizi çıkarsa (örn. çok eski bir MySQL sürümü `ON DUPLICATE KEY
  UPDATE ... VALUES()` söz dizimini desteklemeyebilir - bu, MySQL 8.0.20
  öncesi sürümlerde "deprecated" ama hâlâ çalışıyor olmalı) bu bilinen
  bir risk olarak not edildi.
- **Hiçbir yerde CSRF token yok** (admin formları sadece Basic Auth'a
  güveniyor) - Cloudflare sürümünde de yoktu, aynı kapsam dışı bırakma
  kararı burada da geçerli sayıldı; istenirse eklenebilir.
