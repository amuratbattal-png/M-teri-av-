# Canlı Çeviri Sistemi — PHP Sürümü

> Bu, aynı repodaki `apps/translate/` (Cloudflare Workers sürümü) ile
> AYNI ürünün PHP + MySQL üzerinde çalışan, Cloudflare'e hiç ihtiyaç
> duymayan yeniden yazımı ("cloudflare kullanmak istemiyorum" - sahibi).
> **Bu artık aktif/kullanılacak sürüm** - `apps/translate/` repoda
> duruyor (silinmedi, ileride tekrar istenirse diye) ama şu an
> kullanılmıyor.

## Ne yapıyor

Admin (PC'den ya da telefondan) bir **Etkinlik** (Event) açar - tüm
katılımcılara verilecek TEK bir QR kod/link buradan üretilir. Etkinlik
içine **birden çok konuşmacı** (Ad Soyad + Konu + fotoğraf) eklenebilir;
admin panelinden aynı anda sadece BİR konuşmacı **Aktif** yapılır (bir
konuşmacıyı aktif yapmak diğerlerini otomatik pasif yapar - iki adımlı
bir işlem gerekmez). **Hiçbir konuşmacı aktif değilken katılımcı
ekranında SADECE admin'in yüklediği görsel gösterilir** - dil seçimi/
katılım/altyazı panelleri tamamen gizlenir, bir konuşmacı aktif olur
olmaz geri gelir.

Katılımcı, QR kodu okutup - giriş/şifre gerekmeden - katılır:
- Önce (bir kere) **arayüz dili** (TR/EN) seçer - bu, sadece buton/
  etiket metinlerini ve konuşmacı konusunun hangi dilde (`topic_tr`/
  `topic_en`) gösterileceğini belirler, ekranın üstündeki bir düğmeyle
  istediği zaman değiştirebilir.
- Sonra **takip etmek istediği dili** (yaklaşık 20 dilden biri) seçip
  katılır - konuşmanın çevrileceği dil budur. Konuşma hem yazılı
  (altyazı, geçmişiyle birlikte) hem sesli (kendi cihazının
  seslendirmesiyle) takip edilir. Aktif konuşmacının **fotoğrafı**
  (yüklendiyse) adı/konusuyla birlikte üstte gösterilir.
- Admin "soru sormayı" açtıysa katılımcı bir buton üzerinden **ad soyad
  + mesaj** ile soru gönderebilir (ikisi de zorunlu - sunucu tarafında
  da doğrulanır). Soru, o an aktif olan konuşmacıya bağlı kaydedilir.

Konuşmacının kendisi ayrı bir link/**QR kod** (`speak.php?event=...&token=...`)
üzerinden mikrofonunu açık tutar - bu link etkinlik boyunca tek bir
cihazda (ör. podyumdaki laptop ya da konuşmacının kendi telefonu) açık
kalır, hangi konuşmacının aktif olduğu admin panelinden değiştirilir.
**Kendisi aktifken sorulan sorular kendi ekranında canlı olarak
görünür** - admin panelinde ise TÜM sorular hangi konuşmacıya
sorulduğuna göre gruplanmış halde listelenir ("Ahmet Yılmaz", "Ayşe
Kaya" gibi başlıklar altında), admin istediği soruyu istediği dile tek
tıkla çevirebilir.

Tüm arayüz (admin girişi dahil) **Bootstrap 5** ile responsive - telefon/
tablet/PC'de sorunsuz çalışır.

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
  mı, aktif konuşmacı/görsel değişti mi?" diye sorar - bu anket sayfa
  açılır açılmaz (dil seçilmeden/katılmadan ÖNCE) başlar ki başlık
  (konuşmacı/görsel) her zaman canlı kalsın.
- Çeviri, konuşmacı cümleyi gönderdiği ANDA değil, bir katılımcı O
  CÜMLEYİ O DİLDE İLK istediğinde yapılıp veritabanına önbelleğe
  alınıyor (`transcript_entries.translations` JSON sütunu) - aynı dili
  paylaşan sonraki katılımcılar/anketler için tekrar NVIDIA çağrısı
  yapılmıyor. Sorular için de aynı önbellekleme (`questions.translations`)
  kullanılıyor.
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
  setup.php               Web tabanlı kurulum sihirbazı - TEK adımda DB
                          bağlantısını test eder, şemayı uygular, config.php'yi
                          kendisi yazar (phpMyAdmin'e girmeye GEREK YOK)
  schema.sql              MySQL/SQLite uyumlu şema, Event tabanlı model
                          (events, event_speakers, transcript_entries,
                          event_interim, participant_pings, questions, settings)
  config.example.php      setup.php kullanmak istemezseniz elle doldurulacak örnek
  vendor/                 chillerlan/php-qrcode (QR SVG üretimi) - VENDORED,
                          composer çalıştırmaya GEREK YOK, FTP ile olduğu gibi
                          yüklenebilir
  includes/               Ortak fonksiyonlar:
                            auth.php      oturum tabanlı admin girişi (session)
                            layout.php    Bootstrap 5 sayfa kabukları (admin/katılımcı)
                                          + konuşmacıya göre gruplu soru listesi HTML'i
                            i18n.php      katılımcı arayüz dili (TR/EN) metinleri
                            languages.php çeviri hedef dili listesi (~20 dil)
                            repo.php      events/event_speakers/questions sorguları
                            uploads.php   görsel yükleme doğrulaması (etkinlik
                                          görseli VE konuşmacı fotoğrafı ORTAK)
                            db.php, settings.php, translate.php, qrcode.php
  admin/                  Yönetim paneli:
                            login.php / logout.php   Bootstrap giriş formu (oturum)
                            events.php                etkinlik listesi + oluşturma
                            event.php                 tek etkinlik: roster (+ fotoğraf
                                                       yükle/kaldır), aktif/pasif, boş
                                                       ekran görseli, konuşmacı QR'ı,
                                                       QA, konuşmacıya göre gruplu sorular
                            questions_feed.php         canlı soru listesi (JS poller)
                            translate_question.php     tek bir soruyu çevir (JSON)
                            settings.php                NVIDIA API anahtarı/model
  api/                    speak_post.php, participant_poll.php, status.php,
                          ask_question.php, speaker_questions.php (konuşmacının
                          kendi ekranı için, token ile korunan, aktifken sorulan
                          soruları döner)
  join.php                Katılımcı sayfası (?code=XXXXXX)
  speak.php               Konuşmacı mikrofon ekranı + gelen sorular (?event=...&token=...)
```

## Kurulum (paylaşımlı/cPanel hosting için)

1. **`php-translate/` klasörünün TÜM içeriğini** (vendor/ dahil) FTP ile
   hosting'inizdeki bir klasöre yükleyin (ör. `public_html/ceviri/` ya
   da kendi alt alan adınız `ceviri.ajansim.net` için ayrılmış klasör).
2. cPanel'den bir **MySQL veritabanı ve kullanıcı** oluşturun (cPanel
   "MySQL Databases" bölümü) - veritabanı adını/kullanıcı adını/şifresini
   not edin, bir sonraki adımda gerekecek.
3. `https://sizin-alan-adiniz/ceviri/setup.php` adresine gidin. Açılan
   formda MySQL bilgilerinizi, yönetim paneli için istediğiniz kullanıcı
   adı/şifreyi (isteğe bağlı olarak NVIDIA API anahtarınızı da) girip
   **"Kurulumu Tamamla"**ya basın - sihirbaz bağlantıyı test eder,
   tabloları oluşturur ve `config.php`'yi kendisi yazar.
4. **Kurulum bittiğinde `setup.php` dosyasını FTP ile sunucudan silin**
   (sayfanın kendisi de bunu hatırlatıyor) - açık kalırsa, siteyi bulan
   biri `config.php`'yi silip kurulumu yeniden çalıştırarak paneli ele
   geçirebilir. `setup.php`, `config.php` zaten varsa kendini otomatik
   olarak devre dışı bırakıyor (yeniden çalıştırılamıyor) ama silmek yine
   de en güvenlisi.
5. `https://sizin-alan-adiniz/ceviri/admin/events.php` adresine gidin -
   3. adımda belirlediğiniz kullanıcı adı/şifre ile bir Bootstrap giriş
   ekranı karşılayacak. Giriş yaptıktan sonra bir Etkinlik oluşturun,
   içine konuşmacı(lar) ekleyin, birini Aktif yapın ve QR kodu/mikrofon
   linkini paylaşın.

`setup.php` kullanmak istemezseniz (ör. sunucunuzda dosya yazma izni
kısıtlıysa) eski yöntem hâlâ geçerli: `config.example.php`'yi elle
`config.php` olarak kopyalayıp doldurun, `schema.sql`'i phpMyAdmin'den
içe aktarın.

**ÖNEMLİ - HTTPS:** Admin şifresi (giriş formunda) şifrelenmeden (düz
metin) gönderilir, bu yüzden hosting'inizde **mutlaka HTTPS/SSL aktif
olmalı** (çoğu cPanel hosting'de ücretsiz "AutoSSL" ile otomatik gelir).
Ayrıca tarayıcıların mikrofon (`getUserMedia`) ve konuşma tanıma
API'sine izin vermesi için de HTTPS ŞART - HTTP üzerinden konuşmacı
ekranı mikrofona erişemez.

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
# tarayıcıda http://127.0.0.1:8099/admin/events.php
```

## Bu oturumda GERÇEKTEN test edildi (Cloudflare sürümünden FARKLI olarak)

Cloudflare sürümü hiç çalıştırılamamıştı (sandbox'ın Cloudflare'e ağ
erişimi yok) - bu PHP sürümü ise `php -S` ile gerçekten çalıştırılıp
SQLite üzerinden uçtan uca test edildi (v1'de olduğu gibi, v2'nin
Event/çok-konuşmacı/Q&A modeliyle GÜNCELLENEREK tekrarlandı):

- Admin oturum girişi (Bootstrap form): yanlış şifre → hata mesajı,
  doğru şifre → oturum açılır ve sonraki isteklerde kalıcı kalır,
  `require_admin_auth()` girişsizken `/admin/login.php`'ye yönlendirir.
- Etkinlik oluşturma (boş isim reddedilir), etkinlik adı/konuşmacı adı/
  soru metninde XSS payload'ları (`<script>`, `<b>`) test edilip her
  yerde (etkinlik listesi, etkinlik sayfası, soru listesi) escape
  edildiği doğrulandı.
- Konuşmacı ekleme/silme; **tek-aktif kuralı**: bir konuşmacıyı Aktif
  yapmak, aynı etkinlikteki diğer TÜM konuşmacıları otomatik Pasif
  yapıyor (veritabanı satırlarıyla doğrulandı).
- Hiçbir konuşmacı aktif değilken `api/status.php`/`api/participant_poll.php`
  `activeSpeaker`/`active_speaker: null` döndürüyor.
- Boş-ekran görseli yükleme (gerçek bir PNG ile), veritabanına doğru
  yolun yazıldığı ve `participant_poll.php`'nin `placeholder_image`
  alanında döndürdüğü doğrulandı; görsel kaldırma (dosya silinip DB
  temizleniyor) ayrıca test edildi.
- `join.php`: UI dili TR/EN başlık değiştirme (query param + doğru
  buton `active` sınıfı + doğru dilde metinler), geçersiz katılım kodu
  için 404 + lokalize "bulunamadı" mesajı.
- **Q&A akışı**: soru sorma kapalıyken `api/ask_question.php` 403
  (`qa_disabled`) döndürüyor; admin panelinden açıldıktan sonra boş isim
  VEYA boş mesajla gönderim sunucu tarafında 422 (`validation_error`)
  ile reddediliyor (istemci tarafı doğrulamanın atlanabileceği
  senaryoyu kapsıyor); geçerli bir soru kabul edilip admin'in canlı
  soru listesinde (`admin/questions_feed.php`) XSS'siz göründüğü
  doğrulandı.
- Admin soru çevirisi (`admin/translate_question.php`): sorunun kendi
  dilinde istenirse orijinal metni döndürüyor; farklı bir dilde
  istenip NVIDIA'ya bu sandbox'tan ağ erişimi olmadığı için **beklenen
  şekilde** başarısız oluyor, `ok:false` + `[çeviri yapılamadı] ...`
  ile DÜRÜST bir şekilde yansıyor (sessizce yanlış bir şey göstermedi);
  endpoint girişsiz erişime 302 ile kapalı.
- `speak_post.php` final cümle → `participant_poll.php` ile alma
  (kaynak dilde - çeviri gerekmeden) ve farklı dilde katılım → çeviri
  denemesi → aynı "dürüst başarısızlık" davranışı; interim (henüz
  bitmemiş) altyazının SADECE kaynak dildeki katılımcıya gösterildiği,
  diğer dillerde boş döndüğü doğrulandı.
- Konuşmacı token doğrulama (doğru/yanlış token, 401) hem `speak.php`
  sayfası hem `speak_post.php` için.
- Artımlı anket (`after_seq`) - sadece yeni cümleleri döndürdüğü
  doğrulandı.
- Etkinlik sonlandırma - hem admin'den ("Etkinliği Sonlandır" butonu
  sonrasında disabled olduğu) hem konuşmacı ekranından
  (`type:end_event`), sonrasında katılımcı anketinin `ended:true`
  döndürdüğü ve `join.php`'nin "Oturum sona erdi" mesajını gösterdiği
  doğrulandı.
- Ayarlar panelinden NVIDIA anahtarı kaydetme/silme - veritabanına
  gerçekten yazıldığı/silindiği doğrulandı.
- **Gerçek bir hata bulundu ve düzeltildi (v1'den kalma, hâlâ geçerli):**
  "var ise güncelle" (upsert) mantığı ilk yazımda MySQL söz dizimini
  (`ON DUPLICATE KEY UPDATE`) SQLite'a `try/catch` ile "düşürmeye"
  çalışıyordu - ama SQLite, `PDO::prepare()` anında (execute'tan ÖNCE)
  hata fırlattığı için bu hata try bloğunun DIŞINDA kalıp siteyi
  çökertiyordu. Çözüm: `includes/db.php`'de tek, sürücüye göre doğru
  SQL üreten bir `upsert()` yardımcı fonksiyonu (bkz. içindeki yorum) -
  artık HİÇBİR yerde bu kırılgan try/catch deseni yok.
- **v2 redesign sırasında bulunup düzeltilen bir hata:** `setup.php`,
  Bootstrap'a geçilen yeni `includes/layout.php`'nin artık üretmediği
  eski bir `SHARED_STYLE` sabitini kullanıyordu - her açılışta "Undefined
  constant" fatal hatası verirdi. `setup.php` Bootstrap'a taşındı, ayrıca
  başarı sayfalarındaki eski `/admin/sessions.php` linkleri (v1'den kalma,
  artık silinmiş bir dosya) `/admin/events.php`'ye düzeltildi.
- **`setup.php` (web kurulum sihirbazı) da aynı şekilde uçtan uca
  çalıştırıldı:** SQLite ile tam bir kurulum (form doldur → DB
  bağlantısı test edilir → şema uygulanır → `config.php` yazılır →
  panel girişi hemen çalışır) doğrulandı; ardından `config.php` varken
  sihirbazın kendini otomatik kapattığı, zorunlu alanlar boş
  bırakıldığında `config.php` YAZILMADAN hata gösterdiği doğrulandı.
  Form yeniden gösterilirken kullanıcı girdisinin escape edildiği ayrıca
  doğrulandı.

### İkinci tur: konuşmacı fotoğrafı, konuşmacı bazlı sorular, konuşmacı QR'ı, "sadece görsel" ekranı

Canlı ortamda `events` tablosunun eksik olduğu (MySQL şeması hiç
uygulanmamış) bir kurulum hatası çözüldükten sonra sahibi dört yeni
istek iletti - hepsi aynı şekilde `php -S` + SQLite ile uçtan uca test
edildi:

- **Konuşmacı fotoğrafı** - `event_speakers.photo` sütunu eklendi.
  ÖNEMLİ: `CREATE TABLE IF NOT EXISTS` var olan bir tabloya yeni sütun
  eklemediği için (aynı sınıf sorun bu projede daha önce de yaşanmıştı,
  bkz. yukarıdaki `follow_up_date`/`settings.updated_at` tarzı notlar -
  o örnekler başka bir projeden ama ders aynı), `schema.sql`'e ayrıca
  bir `ALTER TABLE event_speakers ADD COLUMN photo ...` eklendi ve
  `setup.php`'nin "zaten var" toleransına MySQL 1060/SQLite "duplicate
  column" hatası da eklendi - hem sıfırdan kurulumda (ALTER zararsızca
  "zaten var" der) hem var olan bir kurulumu yükseltirken (ALTER gerçekten
  sütunu ekler) aynı `schema.sql` çalışıyor. Bu iki senaryo da (temiz
  kurulum VE eski tablo üzerine yükseltme) ayrı ayrı SQLite ile simüle
  edilip doğrulandı. Admin panelinde her konuşmacı satırına küçük bir
  fotoğraf yükleme/kaldırma formu eklendi (event görseliyle aynı
  doğrulama mantığını paylaşan yeni `includes/uploads.php`), gerçek bir
  PNG ile yükleme/kaldırma/silinen konuşmacının fotoğraf dosyasının da
  silinmesi test edildi. Katılımcı tarafında aktif konuşmacının fotoğrafı
  (varsa) adı/konusunun üstünde gösteriliyor - hem `join.php`'nin ilk
  render'ında hem `participant_poll.php`'nin döndürdüğü veriyle canlı
  güncellenen JS'te doğrulandı.
- **Sorular artık konuşmacıya bağlı** - "sorular konuşmacının
  oturumunda olduğu için konuşmacının ekranına düşecek, adminde hangi
  konuşmacıya hangi sorular gelmiş görecek" isteği. Yeni
  `list_questions_grouped()` (repo.php) sorguları roster sırasına göre
  gruplu döndürüyor; `render_question_list_html()` artık önceden
  hazırlanmış bir dizi değil doğrudan `eventId` alıp bu grupları HTML'e
  döküyor - admin ekranında her konuşmacının adı bir başlık, altında
  SADECE o konuşmacı aktifken sorulmuş sorular listeleniyor. Roster'dan
  silinmiş bir konuşmacıya ait sorular "Silinmiş konuşmacı", hiçbir
  konuşmacı aktif değilken sorulmuş (teorik olarak artık imkânsız ama
  eski kayıtlar için) sorular "Konuşmacı aktif değilken soruldu" ayrı
  gruplarında kaybolmadan gösteriliyor - ikisi de gerçek verilerle
  test edildi. Konuşmacının kendi mikrofon ekranı (`speak.php`) için
  YENİ, token ile korunan (admin girişi DEĞİL) bir `api/speaker_questions.php`
  eklendi - sadece O AN aktif olan konuşmacıya sorulmuş soruları döner;
  iki konuşmacı arasında aktif/pasif geçiş yapılıp her birinin kendi
  ekranının SADECE kendine sorulan soruyu gösterdiği (diğerininkini
  değil) doğrulandı. Yanlış token'la 401 döndüğü ayrıca test edildi.
- **Konuşmacı mikrofon linkine QR kod eklendi** - "konuşmacının qr kodu
  yok" - `admin/event.php`'deki "Konuşmacı Mikrofon Ekranı" kartına,
  katılım QR'ıyla aynı şekilde `render_qr_data_uri()` ile üretilen bir
  QR görseli eklendi (artık konuşmacı da kendi telefonuyla bu kodu
  okutup mikrofon ekranını doğrudan açabiliyor).
- **Hiçbir konuşmacı aktif değilken SADECE görsel** - önceden katılım
  paneli (dil seçimi + Katıl butonu) konuşmacı aktif olsun olmasın her
  zaman görünüyordu, görselin yanında fazladan bir form duruyordu.
  `join.php`'de hem ilk PHP render'ında (`$joinPanelInitialDisplay`) hem
  her anket (`poll()`) sonrasında çalışan JS'teki `updateHeader()`'da bir
  kural eklendi: aktif konuşmacı yoksa katılım VE oturum (transkript)
  panellerinin İKİSİ DE gizleniyor, sadece üstteki görsel/metin kalıyor;
  bir konuşmacı aktif olur olmaz (2 saniye içinde) ilgili panel (daha
  katılmadıysa katılım formu, katılmışsa oturum ekranı) geri geliyor.
  Bir katılımcı oturumdayken konuşmacı pasif olursa oturum ekranının da
  gizlenip sadece görsele döndüğü test edildi ("Ayrıl" butonunun bu
  durumda katılım formunu YANLIŞLIKLA tekrar göstermemesi için ayrı bir
  `lastHasActiveSpeaker` bayrağı eklendi). Görsel yokken (admin henüz
  yüklemediyse) eski "Şu anda aktif bir konuşmacı yok" metni yedek
  olarak kalıyor - tamamen boş bir ekran yerine.

Bu turda da render.ts/heredoc-escape dersinin PHP karşılığı tekrar
uygulandı: her değişen `<script>` bloğu (`join.php`, `speak.php`,
`admin/event.php`) `node --check` ile ayrıca doğrulandı, tüm yeni/
değişen `{$degisken}` heredoc interpolasyonları elle karşı kontrol
edildi (hepsi tanımlı).

### Üçüncü tur: modern konuşmacı kartı, TTS güvenilirliği, konuşmacı ekranında çeviri

Sahibi canlı ortamdan bir ekran görüntüsü paylaştı - aktif konuşmacının
fotoğrafı SOLDA, adı/konusu SAĞINDA, tek satırda sıkışık görünüyordu
(mobilde kötü bir görüntü) - ve "başka dillerde sesli çeviri
yapılmıyor" bildirdi. Aynı oturum içinde ayrıca "konuşmacı ekranında
soruyu başka dillere çevirebilmeli" isteği geldi.

- **Kök sebep bulundu: `.placeholder-screen` CSS kuralı `display:flex`
  idi ama `flex-direction` HİÇ belirtilmemişti** - flex'in varsayılanı
  `row`, yani fotoğraf + isim + konu (üç ayrı kardeş eleman) yan yana
  diziliyordu, ekran görüntüsündeki tam olarak o sıkışık görünüm
  buydu. Tek satırlık düzeltme: `flex-direction:column` eklendi
  (`includes/layout.php`) - bu, hem tek elemanlı durumları (sadece
  etkinlik görseli VEYA sadece "aktif konuşmacı yok" metni) ETKİLEMEDEN
  (tek öğe zaten ortalanıyordu) hem çok elemanlı konuşmacı kartını
  (fotoğraf → isim → konu) doğru şekilde DİKEY sıralıyor. Görsel de
  "daha modern" olması istendiği için büyütüldü ve stilize edildi:
  132px dairesel fotoğraf, ince kenarlık + gölge (`.speaker-photo`),
  daha büyük/kalın isim (`.speaker-name`), ayrı bir konu stili
  (`.speaker-topic`) - hem `join.php`'nin ilk PHP render'ında hem
  `updateHeader()` JS fonksiyonunda AYNI class'lar kullanılarak
  tutarlılık sağlandı. Gerçek bir fotoğraf yüklenip üretilen HTML'in
  DOM sırasının (img → isim div'i → konu div'i, hepsi flex-column
  kapsayıcının doğrudan kardeşi) doğru olduğu test edildi.
- **TTS güvenilirliği artırıldı (kod tarafında yapılabilecek her şey
  yapıldı) - ama muhtemel asıl sebep NVIDIA anahtarının php-translate'in
  KENDİ Ayarlar sayfasında tanımlı olmaması.** Önce dürüstçe test
  edildi: NVIDIA anahtarı olmadan farklı bir dile geçildiğinde
  transkript metni zaten `[çeviri yapılamadı] <orijinal metin>` OLARAK
  görünüyor (`translation_ok:false`) - yani "sesli çeviri yapılmıyor"
  şikayetinin en olası açıklaması, sesli okumanın kendisinin bozuk
  olması değil, henüz ÇEVRİLMEMİŞ (hâlâ Türkçe) bir metnin hedef dilin
  sesiyle okunmaya çalışılması (ya bozuk/anlaşılmaz çıkıyor ya da
  tarayıcı o dil+metin uyumsuzluğunda hiç ses çıkarmıyor). **Bu
  sistemin (`php-translate`) NVIDIA anahtarı, "Müşteri Avcısı"
  sisteminden TAMAMEN AYRI** - kendi `/admin/settings.php` sayfasından
  girilmesi gerekiyor; bu oturumda anahtarın orada tanımlı olup
  olmadığı doğrulanamadı (sahibinin kontrol etmesi gerekiyor). Yine de
  koddaki TTS çağrısı daha sağlam hale getirildi (gerçek bir çeviri
  gelse bile faydalı, sorunun bir kısmı da tarayıcı/cihaz kaynaklı
  olabilir diye):
  - Tarayıcının ses (voice) listesi çoğu tarayıcıda ASENKRON yükleniyor -
    sayfa açılır açılmaz `getVoices()` boş dönebiliyordu. Artık hem
    erken bir deneme yapılıyor hem `voiceschanged` olayı dinlenip liste
    tazeleniyor.
  - `utter.lang` string'ine körü körüne güvenmek yerine artık
    `speechSynthesis.getVoices()` listesinden hedef dile TAM eşleşen
    (yoksa aynı ana dil - ör. `en-GB` yerine `en-US`) bir ses SEÇİLİP
    `utter.voice`'a atanıyor - bazı tarayıcılar `lang` alanı eşleşen
    bir ses yoksa sessizce varsayılan sese düşüyor (yanlış telaffuz),
    bazıları hiç ses çıkarmıyor; açık seçim bu belirsizliği azaltıyor.
  - Ses listesi kesin olarak yüklenmiş VE hedef dil için gerçekten HİÇ
    ses yoksa artık SESSİZCE hiçbir şey olmuyormuş gibi davranmak
    yerine katılımcıya görünür bir uyarı gösteriliyor ("Bu dil için
    cihazınızda/tarayıcınızda sesli okuma bulunamadı.") - `join.php`'ye
    yeni `#tts-note` alanı ve `includes/i18n.php`'ye yeni
    `tts_unsupported` TR/EN metni eklendi.
  - Mobil Safari gibi tarayıcılarda `speechSynthesis`'in bir kullanıcı
    etkileşimi İÇİNDE en az bir kez tetiklenmeden sonraki otomatik
    (anket döngüsünden gelen) çağrıları sessizce engellediği biliniyor -
    "Katıl" butonunun click handler'ına sessiz (volume:0) bir "ısınma"
    çağrısı eklendi (yaygın bir workaround).
- **Konuşmacı ekranında soru çevirisi eklendi** - "konuşmacı ekranında
  soruyu başka dillere çevirebilmeli" isteği. Yeni, token ile korunan
  (admin oturumu GEREKTİRMEYEN) `api/speaker_translate_question.php` -
  `admin/translate_question.php` ile AYNI mantık ve AYNI önbellek
  sütunu (`questions.translations`) paylaşılıyor (admin ya da
  konuşmacı hangisi ÖNCE bir soruyu çevirirse, diğeri de aynı
  önbellekten anında yararlanıyor) - ama admin girişi yerine
  `event.speaker_token` ile doğrulanıyor, ayrıca soru sorgusu
  `event_id` ile de sınırlandırılıyor (bir token'ın SADECE kendi
  etkinliğindeki sorulara erişebilmesi için). `speak.php`'nin "Gelen
  Sorular" listesindeki her soru satırına artık admin'dekiyle aynı
  desende bir dil seçici + "Çevir" butonu + sonuç alanı ekleniyor
  (`language_options_html()` çıktısı JSON olarak JS'e taşınıp
  `innerHTML`'e yazılıyor - LANGUAGES sabitinden geldiği için güvenli).
  Canlı testte: NVIDIA anahtarı yokken `ok:false` + `[çeviri
  yapılamadı]` ile dürüstçe başarısız olduğu, aynı dile çeviri
  istendiğinde orijinal metnin döndüğü, yanlış token'la 401 ve başka
  bir etkinliğin ID'siyle 404 döndüğü doğrulandı.

### Dördüncü tur: etkinlik silme, "kusursuz sistem" tam incelemesi, profesyonel tema, tekrarlanan çeviri hatası

Sahibi bir ekran görüntüsüyle "etkinliği silebilmeliyim, tema çok kötü
daha profesyonel bir görüntü olsun, bazen sistem devamlı aynı şeyleri
çevirip duruyor, tüm hataları kontrol et, kusursuz bir sistem olsun"
dedi - dördü de ele alındı:

- **Etkinlik silme.** Önceden sadece "sonlandırma" (soft, `status='ended'`,
  veri kalır) vardı, KALICI silme yoktu. Yeni `delete_event()`
  (`includes/repo.php`) - etkinliğe ait `questions`, `transcript_entries`,
  `event_interim`, `participant_pings`, `event_speakers` satırlarının
  TAMAMINI VE yüklenen boş-ekran görselini VE her konuşmacının
  fotoğrafını (dosya sisteminden) siliyor, en son `events` satırını
  kaldırıyor. Hem `/admin/events.php` listesindeki her satıra (Sil
  butonu + `confirm()` onayı) hem `/admin/event.php`'nin "Etkinlik
  Yönetimi" kartına ("Etkinliği Kalıcı Olarak Sil", ayrı/daha güçlü bir
  uyarı metniyle) eklendi. Canlı testte: bir etkinlik + konuşmacı +
  fotoğraf + boş-ekran görseli + bir transkript cümlesi oluşturulup
  silindi - hem VERİTABANI satırlarının (events, event_speakers) hem
  YÜKLENEN DOSYALARIN (`uploads/events/*`, `uploads/speakers/*`)
  gerçekten kalktığı, silinen etkinliğe tekrar gidildiğinde 404
  döndüğü, ve listeye "Etkinlik silindi." banner'ının düştüğü
  doğrulandı. **Kod incelemesi sırasında AYRI bir gerçek güvenlik
  hatası bulunup düzeltildi:** silme onay diyaloğuna ilk yazımda
  etkinlik adını `confirm('... "İsim" ...')` şeklinde göstermeye
  çalıştım - `esc()` bunu HTML özniteliği (attribute) bağlamında
  güvenli hale getiriyor ama tarayıcı bu özniteliği JS'e vermeden ÖNCE
  HTML entity'lerini ÇÖZÜYOR; isimde bir tek tırnak (`'`) varsa (esc()
  ENT_QUOTES ile bunu `&#039;`'e çevirse bile, tarayıcı özniteliği
  parse ederken bunu tekrar `'`'e çözüyor) bu, `confirm('...')`
  JS string'ini ERKEN kapatıp geçersiz/enjekte edilebilir JS
  üretebilirdi. Düzeltme: onaydaki metin, bu projedeki TÜM diğer
  `confirm()` diyaloglarıyla AYNI desene çekilip SABİT/statik tutuldu
  (dinamik etkinlik adı hiç gömülmüyor) - `esc()`'in HTML-özniteliği
  güvenliği ile JS-string güvenliğinin AYNI ŞEY OLMADIĞI, dinamik
  içerik bir `onsubmit="...confirm('...')..."` gibi iç içe bir JS
  bağlamına gömülürken ekstra dikkat gerektiği bu oturumun net dersi.
- **Kök sebep bulunup düzeltildi: "sistem devamlı aynı şeyleri çevirip
  duruyor".** `api/participant_poll.php`'de bir çeviri BAŞARISIZ
  olduğunda (ör. NVIDIA anahtarı tanımsız/hatalı/hız sınırına takılmış)
  sonuç ÖNBELLEĞE ALINMIYORDU (sadece BAŞARILI çeviriler
  `transcript_entries.translations`'a yazılıyordu) - yani NVIDIA
  çalışmıyorsa, HER katılımcı anketinde (2 saniyede bir, o dili izleyen
  HER katılımcı için, geçmişteki HER cümle için) AYNI eski cümle tekrar
  tekrar NVIDIA'ya gönderiliyordu - hem "sürekli aynı şeyi çeviriyor"
  şikayetinin birebir açıklaması hem (`fetch_nvidia_chat()`'in kendi
  429-yeniden-deneme mantığıyla birleşince) bir isteğin ~75 saniyeye
  kadar uzayabilmesine yol açan gizli bir performans sorunu. Düzeltme:
  artık BAŞARISIZ bir çeviri de (aynı `translations` JSON sütununda,
  `"[çeviri yapılamadı] ..."` metniyle) önbelleğe alınıyor - bir cümle
  bir dil için SADECE BİR KEZ denenir. Sonraki okumaların hâlâ doğru
  `translation_ok:false` döndürebilmesi için yeni bir
  `TRANSLATION_FAILURE_PREFIX` sabiti (`includes/translate.php`)
  eklendi - önbellekten okunan bir metin bu ön ekle başlıyorsa
  `ok:false` olarak tanınıyor. Canlı testte: NVIDIA anahtarı yokken
  bir cümlenin İLK pollda önbelleğe alındığı, sonraki pollarda AYNI
  metnin (yeniden NVIDIA'ya gitmeden) döndüğü ve `translation_ok`'un
  tutarlı kaldığı doğrulandı. **Bilinen ödünleşim (bilinçli):** bu, bir
  cümlenin NVIDIA sonradan düzelse bile o ana kadar zaten denenmiş
  eski cümleler için OTOMATİK olarak "iyileşmeyeceği" anlamına geliyor -
  buna karşılık YENİ söylenen her cümle her zaman taze bir ilk deneme
  alıyor, ve sistemin kendini tekrar tekrar döven bir istek fırtınasına
  girmesi engellenmiş oluyor (basitlik/öngörülebilirlik, karmaşık bir
  yeniden-deneme-zamanlaması makinesine tercih edildi).
- **Profesyonel tema.** `includes/layout.php`'ye paylaşılan bir
  `DESIGN_STYLE` sabiti eklendi - Bootstrap'ın kendi `--bs-*` CSS
  değişkenlerini (birincil renk artık indigo/mor `#6366f1`, daha koyu/
  katmanlı bir arkaplan, ince kart kenarlıkları + yumuşak gölgeler,
  daha yuvarlak köşeler, daha belirgin başlık tipografisi, rafine
  form/navbar stilleri) Bootstrap'ın KENDİ dosyasından SONRA aynı
  seçicilerle (`:root`) yeniden tanımlayarak - Bootstrap'ın hiçbir
  satırını değiştirmeden, sadece EKLEYEREK - uyguluyor. `admin_page()`/
  `public_page()` (yani TÜM admin + katılımcı + konuşmacı ekranları),
  `admin/login.php` (giriş formu) ve `setup.php` (kurulum sihirbazı)
  HEPSİ bu paylaşılan temayı kullanıyor - "sistem" artık tek/tutarlı
  bir görünüme sahip. Navbar'ın eski `bg-dark border-bottom
  border-secondary-subtle` Bootstrap yardımcı sınıfları kaldırıldı
  (bunlar `!important` taşıdığı için yeni temanın navbar arkaplan/
  kenarlık rengini ezip geçersiz kılıyordu) - artık SADECE yeni
  `DESIGN_STYLE`'daki `.navbar` kuralı geçerli. Giriş sayfasındaki
  Bootstrap'ın kendi `shadow-lg` yardımcı sınıfı da (aynı `!important`
  çakışma riski yüzünden) kaldırıldı ki kart, sitedeki HER YERDEKİ AYNI
  özel gölgeyi kullansın. `php -S` ile hem giriş hem admin sayfalarında
  yeni renklerin/kuralların gerçekten HTML'e yansıdığı doğrulandı.
- **"Tüm hataları kontrol et" - tam bir kod incelemesi yapıldı.** Her
  dosyada (özellikle bu oturumda değişen `admin/event.php`,
  `admin/events.php`, `includes/repo.php`, `includes/layout.php`)
  XSS/`esc()` kullanımı, SQL parametrelerinin hep `PDO::prepare()` ile
  bağlandığı (asla ham string birleştirme olmadığı), her admin
  sayfasının `require_admin_auth()` çağırdığı, her token-korumalı API
  uç noktasının `hash_equals()` kullandığı, ve `render_question_list_html()`
  imzası değiştiğinde geride kalmış eski bir çağıran olmadığı tek tek
  doğrulandı - yukarıdaki `confirm()`/JS-string enjeksiyonu dışında
  başka bir gerçek hata bulunmadı.

## Bilinen sınırlamalar (dürüst liste)

- **STT/TTS güvenilirliği tarayıcıya bağlı** - Cloudflare sürümüyle
  AYNI durum (Web Speech API resmi standart değil, Chrome/Edge önerilir,
  Safari/iOS kısmi, Firefox yok).
- **Anket (polling) gecikmesi** - katılımcı en kötü ihtimalle ~2 saniye
  sonra yeni cümleyi/aktif konuşmacı değişikliğini görür (WebSocket'teki
  "anlık" hissin yerini alıyor, ama konferans altyazısı için pratikte
  fark edilmez).
- **Katılımcı sayısı yaklaşık** - son 15 saniyede anket atan benzersiz
  `client_id` sayısı; bir katılımcı sekmeyi kapattıktan sonra 15 saniye
  boyunca hâlâ "bağlı" gösterilebilir.
- **Geçmiş sınırı 20 cümle** (`HISTORY_LIMIT`,
  `api/participant_poll.php`) - Cloudflare sürümüyle AYNI karar.
- **Çeviri kalitesi tek bir hızlı LLM çağrısı** - profesyonel simultane
  tercüme değil.
- **Soru sorma dilinin tahmini** - `asker_lang`, katılımcının o an
  SEÇTİĞİ çeviri dilinden alınıyor (soruyu muhtemelen o dilde/kendi
  dilinde yazdığının makul bir işareti) - kesin bir garanti değil.
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
- **Hiçbir yerde CSRF token yok** (admin formları sadece oturum girişine
  güveniyor) - Cloudflare sürümünde de yoktu, aynı kapsam dışı bırakma
  kararı burada da geçerli sayıldı; istenirse eklenebilir.
