# Canlı Çeviri Sistemi — Proje Notları

> Bu, aynı repodaki **"Müşteri Avcısı Sistemi"yle (kök `CLAUDE.md`) hiçbir
> ilgisi olmayan, tamamen bağımsız bir ürün**. Ortak D1 veritabanı yok,
> ortak worker yok, hiçbir tablo/kod paylaşılmıyor - sadece aynı pnpm
> monorepo içinde, aynı Cloudflare hesabında yaşıyor.

## Ne yapıyor

Bir konuşmacı bir oturum açar, kendi cihazından (telefon/tablet/PC,
Chrome önerilir) konuşur. Katılımcılar bir QR kod okutarak (veya linke
giderek) - **giriş/şifre gerekmeden** - katılır, kendi dillerini seçer,
konuşmanın anlık çevirisini hem **yazılı (altyazı)** hem **sesli**
(kendi cihazlarının seslendirmesiyle) takip eder. Konuşma bitmiş
cümleler ekranda kalır, katılımcı yukarı kaydırıp tekrar okuyabilir. Ayrı
bir yönetim paneli (`/admin`) konuşmacıları ekler/siler, oturum açar/
kapatır, QR kodu ve linkleri gösterir.

## Mimari kararı

Tek bir Cloudflare Worker (`canli-ceviri`), oturum başına bir
**Durable Object** (`SessionRoom`, WebSocket Hibernation API ile) ve
kendi D1 veritabanı.

```
apps/translate/
  src/
    durable-object.ts   Oturum başına 1 örnek - WebSocket yayını + çeviri tetikleme
    db/                  Kendi (küçük) D1 şeması: speakers, sessions, transcript_entries
    lib/
      translate.ts       NVIDIA LLM ile çeviri (apps/control'ün kullandığı AYNI ücretsiz yöntem)
      qrcode.ts           Katılım linkini SUNUCU TARAFINDA SVG QR koda çevirir
      languages.ts        Desteklenen ~20 dil listesi
      auth.ts             /admin için Basic Auth
    render/               Sunucu tarafı HTML (admin panel, konuşmacı ekranı, katılımcı ekranı)
    routes/               HTTP handler'lar
```

### Neden bu mimari

- **Ücretsiz motor (sahibinin onayladığı seçenek):** Ses-metin (STT)
  konuşmacının TARAYICISINDA (Web Speech API, `webkitSpeechRecognition`)
  çalışır - sunucuya ses akışı YOK. Bitmiş (final) cümle metin olarak
  WebSocket ile Durable Object'e gider, orada NVIDIA'nın ücretsiz LLM
  API'sine (`integrate.api.nvidia.com` - bu repodaki `apps/control`'ün
  teklif/puanlama için kullandığı AYNI yöntem) çevrilir, sonuç ilgili
  dildeki katılımcılara yayınlanır. Seslendirme (TTS) her katılımcının
  KENDİ tarayıcısında (`speechSynthesis`) yapılır - sunucudan ses
  akışı YOK. Sonuç: hiçbir ses dosyası sunucudan geçmiyor, sadece kısa
  metinler - maliyet sıfıra yakın, katılımcı sayısı arttıkça sunucu
  maliyeti artmıyor (TTS her cihazda yerel).
- **Her benzersiz hedef dil için TEK çeviri:** 100 katılımcı aynı dili
  seçse bile NVIDIA'ya tek çağrı yapılır (bkz. `durable-object.ts`
  `handleFinalTranscript` - `distinctLangs` kümesi), sonuç hem D1'e
  (geç katılanlar için önbellek) hem o an bağlı tüm o-dildeki
  katılımcılara aynı anda yayınlanır.
- **WebSocket Hibernation API (`state.acceptWebSocket`):** "katılımcı
  sınırı olmayacak" isteğine karşılık - bağlantı meta verisi
  (`serializeAttachment`) bağlantıyla birlikte kalıcı olduğu için
  Durable Object'in kendi hafızasında büyük bir Map tutmasına gerek
  yok, Cloudflare bağlantıları gerektiğinde hazırda bekletebiliyor.
  **Yine de "sınırsız" bir GARANTİ değil** - pratik bir üst sınır
  Cloudflare hesap/plan kotasına bağlıdır, sadece klasik (hibernation'sız)
  bir Durable Object'e göre ÇOK daha yükseğe ölçeklenmesi beklenir.
- **Sunucu tarafında SVG QR kod:** `qrcode` npm paketinin ana giriş
  noktası (`lib/index.js` → `server.js`) Node'a özgü `pngjs`/`fs`
  kullanıyor - bunun yerine paketin TARAYICI giriş noktası
  (`qrcode/lib/browser.js`) doğrudan import edildi; bu yol sadece
  `Uint8Array` kullanıyor (Buffer/fs YOK - node ile teker teker
  doğrulandı), Cloudflare Workers'ta ek bir `nodejs_compat` bayrağına
  gerek kalmadan çalışıyor. QR, katılım linkini (`/join/:joinCode`)
  kodluyor - istemci tarafında hiçbir kütüphane/CDN'e bağımlılık yok.

## Kimlik doğrulama (3 farklı seviye, bilerek)

- **`/admin/*`** - Basic Auth (`ADMIN_USERNAME`/`ADMIN_PASSWORD`,
  dashboard'daki AYNI basit desen - üretimde Cloudflare Access
  önerilir, bkz. kök `CLAUDE.md`'deki aynı not).
- **`/join/:joinCode` ve `/ws/...&role=participant`** - KİMLİK
  DOĞRULAMA YOK, bilerek. Katılımcı sınırsız ve anonim olacak
  şekilde isteniyordu ("katılımcı sınırı olmayacak", "kullanıcılar
  eklenecek" cümlesi konuşmacılar için, katılımcılar için değil).
  `joinCode` (6 karakter, karıştırılabilir harfler çıkarılmış) tahmin
  edilmesi zor ama KRİPTOGRAFİK olarak güvenli değil - hassas/gizli
  toplantılar için yeterli olmayabilir, ileride istenirse oturum
  başına bir PIN eklenebilir (henüz istenmedi).
- **`/speak/:sessionId?token=...` ve `/ws/...&role=speaker`** - oturum
  oluşturulurken üretilen rastgele bir `speakerToken` (bkz.
  `lib/ids.ts` `newSpeakerToken`) URL'de taşınıyor - bu link SADECE
  admin panelinden görülüyor, konuşmacıya admin tarafından
  verilmeli/gönderilmeli. Panel şifresi kadar korumalı değil (bir link
  ele geçirilirse o oturumda "konuşmacı" gibi davranılabilir) - kabul
  edilen bir ödünleşim, bu link'in gizliliği admin'in sorumluluğunda.

## Bilinen sınırlamalar (dürüst liste)

- **STT güvenilirliği tarayıcıya bağlı.** Web Speech API resmi bir
  standart DEĞİL - Chrome/Edge'de iyi çalışır (sürekli dinleme,
  `onend` sonrası otomatik yeniden başlatma `src/render/speaker.ts`
  içinde var), Safari/iOS'ta kısmi/tutarsız destek, Firefox'ta hiç
  yok. **Konuşmacı cihazı için Chrome veya Edge önerilir** - sayfa
  bunu algılayıp desteklenmiyorsa uyarı gösteriyor
  (`#support-warning`).
- **TTS sesi/kalitesi katılımcının cihazına bağlı.** `speechSynthesis`
  her tarayıcıda farklı ses motorları kullanır (bazı Android/Linux
  tarayıcılarda bazı diller hiç yüklü olmayabilir) - bu durumda
  katılımcı sadece yazılı altyazıyı görür, ses çıkmaz (sessiz
  başarısızlık, hata vermiyor ama de sesli okumuyor).
  `window.speechSynthesis` yoksa TTS otomatik devre dışı kalıyor.
- **Çeviri kalitesi tek bir hızlı LLM çağrısı** - profesyonel simultane
  tercüme değil, "yeterince iyi, anlık" bir çeviri. NVIDIA modeli
  değişirse/kullanımdan kalkarsa (bkz. kök `CLAUDE.md`'deki NVIDIA
  model "end-of-life" olayı - AYNI risk burada da geçerli) çeviri
  başarısız olur - bu sistemde FAIL-OPEN DEĞİL (bkz. `lib/translate.ts`
  yorumu): katılımcı sessizce yanlış bir şey görmez, `[çeviri
  yapılamadı] <orijinal metin>` notuyla açıkça uyarılır.
- **Geçmiş (history) sınırı 20 cümle** (`HISTORY_LIMIT`,
  `durable-object.ts`) - yeni katılan biri sadece son 20 cümleyi görür,
  daha eskisini değil. D1'de tüm geçmiş duruyor (silinmiyor), sadece
  ekrana gönderilen miktar sınırlı - istenirse artırılabilir/
  "daha fazla yükle" eklenebilir (henüz istenmedi).
- **Durable Object hibernasyonunda sıra numarası (seq) ve çeviri
  önbelleği hafızada DEĞİL, `state.storage`/D1'de** - bu yüzden
  hibernasyon/yeniden başlatma veri kaybına yol AÇMAZ. Tek bilinen
  küçük yarış durumu: iki farklı katılımcı AYNI ANDA aynı dile YENİ
  katılıp aynı geçmiş cümleyi eş zamanlı çeviriyorsa, D1'e yazımları
  çakışabilir (kaybolan veri yok, sadece gereksiz bir tekrar çeviri) -
  düşük ihtimal, düşük etki, bilerek çözülmedi.
- **HENÜZ GERÇEK Cloudflare hesabında test edilmedi.** Bu oturumda
  sandbox'ın Cloudflare/NVIDIA'ya canlı ağ erişimi yoktu - doğrulanan:
  `tsc` typecheck (hatasız), `wrangler deploy --dry-run` (bundle
  başarılı, 288 KiB), ve TÜM `<script>` bloklarının `node --check` ile
  gerçekten geçerli JS olduğu (kök `CLAUDE.md`'deki "bare escape/
  backtick" hata sınıfına karşı - bkz. o dosyadaki tekrar eden ders).
  Doğrulanamayan (gerçek tarayıcı/cihazlarla canlı test gerektiren):
  WebSocket Hibernation API'nin gerçek davranışı, Web Speech API'nin
  gerçek tarayıcı/cihaz kombinasyonlarındaki tutarlılığı, NVIDIA
  çevirisinin gerçek gecikmesi/kalitesi, QR kodun gerçek telefon
  kameralarıyla okunabilirliği.

## Deploy adımları (sahibi için, `docs/deployment.md`deki desenle aynı)

1. `wrangler d1 create canli-ceviri-db` - dönen `database_id`'yi
   `apps/translate/wrangler.toml`'daki `PLACEHOLDER-...` yerine yaz.
2. `wrangler d1 execute canli-ceviri-db --remote --file=migrations/0001_init.sql`
   VE `wrangler d1 execute canli-ceviri-db --remote --file=migrations/0002_settings.sql`
   (ikisi de - `0002` olmadan /admin/settings sayfası D1 hatası verir).
3. `wrangler secret put ADMIN_PASSWORD` (yönetim paneli şifresi - bu,
   panelin KENDİSİNİ koruduğu için panelden ayarlanamıyor, tek istisna).
4. NVIDIA anahtarı için İKİ yol var, biri yeterli:
   - **(a) Panelden** (`AskUserQuestion` sonrası sahibinin seçtiği yol -
     "herşeyi yap, ben sadece apileri panelden eklerim"): deploy'dan
     sonra `/admin/settings` sayfasını aç, anahtarı yapıştır, kaydet.
     `wrangler secret put` hiç çalıştırmaya gerek YOK.
   - **(b) `wrangler secret put NVIDIA_API_KEY`** ile Cloudflare
     secret olarak (bu repodaki `apps/control` için zaten alınmış olan
     AYNI anahtar kullanılabilir) - panelde bir değer yoksa buna düşülür.
5. `pnpm --filter @musteri-avcisi/translate deploy` (ya da
   `apps/translate` içinde `wrangler deploy`).
6. `https://<worker-domenin>/admin` adresine git, bir konuşmacı ekle,
   bir oturum aç, QR kodu/linkleri test et.

### Panelden API anahtarı ekleme (`/admin/settings`)

"Herşeyi yap ben sadece apileri panelden eklicem" isteğiyle eklendi -
`apps/control`'deki Ayarlar sayfasının AYNI deseni (öncelik: panel (D1)
> Cloudflare secret/değişken > sabit varsayılan, bkz.
`src/lib/settings.ts` `getEffectiveNvidiaSettings`). Şu an sadece
NVIDIA API anahtarı/modeli kapsıyor - bu sistemde başka bir dış API
YOK (STT/TTS tarayıcıda, QR sunucuda üretiliyor - bkz. yukarıdaki
mimari bölümü), yani panelden eklenebilecek "API" tek bu.
**Bilinen ödünleşim (apps/control'de de aynı, bilerek tekrarlandı):**
Model alanı normal bir metin kutusu olduğu için (API anahtarı gibi hep
boş render edilmiyor) her "Ayarları Kaydet" o anki model değerini de
D1'e yazar ("pinler") - zararsız çünkü kutu hep GEÇERLİ bir değerle
doluyor (panel > secret/var > varsayılan), ama NVIDIA ileride bu modeli
kullanımdan kaldırırsa `wrangler.toml`'daki güncellemeyi D1'deki eski
pinlenmiş değer ezer; "Panel model ayarını sil" butonuyla geri
dönülebilir (bkz. kök `CLAUDE.md`'deki "model D1'de PİNLENMİŞ" olayı -
aynı sınıf davranış, orada da aynı şekilde ele alınmıştı).
**Henüz canlıda doğrulanmadı.**

## Sonraki adımlar (henüz yapılmadı, sahibiyle netleşmeli)

- Gerçek cihazlarla canlı test (yukarıdaki "bilinen sınırlamalar"
  bölümü).
- İstenirse: oturum başına PIN/şifre (şu an tamamen açık katılım).
- İstenirse: geçmiş sınırının artırılması / sayfalama.
- İstenirse: konuşmacı tarafında birden fazla mikrofon/dil desteği
  (şu an tek konuşmacı, tek kaynak dil per oturum).
- Cloudflare Access ile `/admin` için gerçek erişim kontrolü (Basic
  Auth yerine) - kök `CLAUDE.md`'deki aynı, henüz yapılmamış karar.
