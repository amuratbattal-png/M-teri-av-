# Müşteri Avcısı Sistemi — Proje Hafızası

> Bu dosya, bu projeyle ilgili her Claude Code oturumunun **ilk okuması gereken**
> dosyadır. Proje sahibinin daha önce ayrıntılı olarak anlattığı kapsam, kararlar
> ve mimari burada tutuluyor — böylece "önceki konuşmayı hatırlamıyorum" sorunu
> bir daha yaşanmaz. Yeni kararlar alındıkça bu dosya güncellenmeli.

## Projenin özü

Otonom müşteri bulma ve SEO otomasyon sistemi. Google, LinkedIn, TikTok,
Instagram, ihale siteleri ve freelancer platformları üzerinden potansiyel
müşteri taraması yapan, onaydan geçen teklifleri otomatik gönderen ve
kendi WordPress sitelerine tam müdahale yetkisi olan, 7/24 çalışan bir
yapay zeka sistemi.

## Sahibinin verdiği kesin kararlar

- **7/24 kesintisiz** çalışacak, dışarıdan müşteri bulmaya odaklı bir sistem.
- **Google Maps + Google arama**: yeni şirket kuranlar, grafik tasarım/web
  sitesi yaptırmak isteyenler, siteси eski olup yenilemek isteyenler tespit
  edilip otomatik fiyat teklifi hazırlanacak.
- **LinkedIn, TikTok, Instagram**: hashtag/anahtar kelime takibi ile yeni
  firma kuranlar tespit edilip mesaj gönderilecek.
  - Bu otomasyonun platform kullanım şartlarına aykırı olabileceği ve hesap
    askıya alma riski taşıdığı kendisine söylendi; **riski kabul etti**.
  - LinkedIn'de yerel bilgisayardaki bir yapay zeka yerine, **kendi
    profiline gerçek erişimi olan** bir sistem tercih ediyor.
- **Yahoo dahil başka arama motorları** da taranacak, sadece Google değil.
- **Kendi 3 sitesi** için ayrı, 7/24 çalışan bir **SEO puanlama/yükseltme
  motoru** istiyor. Bu motor **müşteri avcısı sisteminin içine katılmayacak,
  ayrı bir sistem** olarak tutulacak (bkz. "Kapsam dışı" bölümü).
  SEO sistemi için `ajansimiz.net` alan adını düşünüyor.
- **WordPress'e tam müdahale yetkisi olan bir yapay zeka** istiyor; kendisi
  hiçbir manuel işlem yapmayacak, sadece yeni müşterileri ve sonuçları
  görecek.
- **Cloudflare üzerinde** kurulacak; gerekirse ileride **NVIDIA yapay
  zekası** eklenmesi düşünülüyor (opsiyonel, ileri faz).
- Proje **en baştan, sıfırdan** kuruluyor.
- **Faz 1: sadece Türkiye pazarı.** Faz 2'de Avrupa'ya genişleme.
- **Mimari**: merkezi bir kontrol sistemi + altında görev bazlı çalışan
  küçük "işçi" süreçler (tarama, değerlendirme, aksiyon). Hepsi **aynı
  merkezi veritabanını** paylaşır. Kanallar (Google, Maps, sosyal medya,
  ihale siteleri, freelancer galerileri vb.) baştan itibaren **ayrı modül**
  olacak şekilde esnek kurulacak, ama **başlangıçta yalnızca 1-2 modül
  aktif** edilecek.
- **Onay mekanizması zorunlu**: teklif/mesajlar **otomatik gönderilmeyecek**,
  gönderim kararını her seferinde sahibi kendisi onaylayacak.
- **Sektör tarama stratejisi**: belirli bir hedef sektör/bütçe aralığı
  seçmek yerine, sektörler **alfabetik sırayla (A→Z)** taranacak.
  - Bunun Z'ye kadar çok zaman alacağı fark edildi; bu yüzden **"yeni
    şirket kuranlar" ve "yeni iş arayışında olanlar"** kategoriden bağımsız,
    **paralel ilerleyen ayrı bir iş kolu** olarak eklendi (alfabetik
    taramayı beklemeden çalışır).
- **Aday veritabanı tek/merkezi**: ayrı bir "aday DB'si" yok — herkes aynı
  merkezi tabloda, her adaya bir **ihtiyaç türü etiketi** (need tag) eklenir
  (web sitesi, logo, kurumsal kimlik, SEO, vb.).
- **İletişim kanalları**: öncelik **WhatsApp ve e-posta**.
  - **Gönderim OTOMATİK DEĞİL, MANUEL** (karar güncellendi): sistem
    hiçbir mesajı kendi API/hesabıyla göndermiyor. Onaylanan bir aday
    için sistem teklif metnini hazırlıyor (ve sahibi düzenleyebiliyor),
    ardından bir **wa.me linki** (WhatsApp) veya **mailto: linki**
    (e-posta) üretiyor - sahibi bu linke tıklayıp **kendi WhatsApp/
    e-posta oturumundan** manuel gönderiyor. Bu yüzden WhatsApp
    Business API ya da otomatik e-posta gönderimi (Resend vb.) artık
    gerekli değil (bkz. "Şu anki durum" bölümü).
- **Sesli arama modülü**: mimariye baştan dahil edilecek ama **şimdilik
  pasif**; ileride yeniden yapılandırmaya gerek kalmadan aktif
  edilebilecek şekilde tasarlanacak (feature-flag ile kapalı, arayüzü
  hazır).
- **Freelancer platformları** (örnek: tasarlat.com) da tarama kaynağı.
  Bu platformlar ücretli olduğu için iletişim bilgisini gizliyor:
  - Gizli kullanıcı bilgisini çekme yöntemi **kullanılmayacak**.
  - Bunun yerine: platformların **herkese açık galeri sayfalarından firma
    adı** tespit edilir, ardından **Google üzerinden ayrıca iletişim
    bilgisine** ulaşılır. (Örnek senaryo: yeni logo yaptırmış ama henüz
    web sitesi olmayan firmaya web sitesi teklifi gönderme.)

### Hedeflenen hizmet kategorileri (need tags)

- Web sitesi (yeni / yenileme)
- Grafik tasarım, logo, kurumsal kimlik
- SEO
- E-ticaret ve stok yönetimi
- Sosyal medya yönetimi
- Marka yönetimi
- Afiş tasarımı, broşür tasarımı, görsel kimlik tasarımı
- Araç giydirme, otobüs giydirme
- Video kurgu

Kısacası: sahibinin yapabildiği **grafik tasarım ve web tasarımla ilgili
her şey**, artı video kurgu — sistemin hedefleyeceği hizmet yelpazesine
dahil.

### Kapsam dışı (bu repo'da DEĞİL)

- **SEO puanlama/yükseltme motoru** (kendi 3 site için) — ayrı proje,
  muhtemelen `ajansimiz.net` altında. Bu repo'da sadece arayüz/entegrasyon
  noktası bırakılır, motorun kendisi burada geliştirilmez.

## Mimari kararı (bu repo)

Cloudflare Workers tabanlı bir pnpm monorepo:

```
apps/control/          Merkezi kontrol sistemi (orchestrator, API, onay akışı)
apps/dashboard/         Onay paneli (adayları listeler, Onayla/Reddet)
packages/db/            Ortak D1 şeması + migration'lar (Drizzle ORM)
packages/shared/         Ortak tipler, need-tag enum'ları, sektör/anahtar kelime listesi
workers/google-search-scanner/       Kanal: Google arama/Maps tarama
workers/yahoo-search-scanner/         Kanal: Yahoo arama tarama
workers/linkedin-scanner/             Kanal: LinkedIn (PASİF - erişim yöntemi netleşmeli)
workers/tiktok-scanner/               Kanal: TikTok (PASİF)
workers/instagram-scanner/            Kanal: Instagram (PASİF)
workers/tender-site-scanner/          Kanal: ihale siteleri (PASİF)
workers/freelancer-gallery-scanner/   Kanal: freelancer galerileri (PASİF, iki adımlı)
workers/company-formation-tracker/    Paralel iş kolu: yeni şirket / iş arayan tespiti
workers/wordpress-agent/              WordPress'e müdahale ajanı (PASİF, kapsam netleşmedi)
workers/channels/whatsapp/            Gönderim kanalı: WhatsApp
workers/channels/email/               Gönderim kanalı: e-posta
workers/channels/voice-call/          Gönderim kanalı: sesli arama (PASİF, feature-flag)
```

Faz 1 başlangıcında aktif olan tek kanallar `google_search` ve
`google_maps` (bkz. `packages/shared/src/config.ts` `activeSourceChannels`).
Diğerleri worker olarak var ama gerçek kimlik bilgisi/API anahtarı
eklenene kadar boş sonuç döndürür - "her kanal ayrı modül, ama
başlangıçta sadece 1-2 aktif" kararının birebir karşılığı.

Neden bu yapı:
- Her tarama kaynağı (`workers/*-scanner`, ileride linkedin/tiktok/instagram/
  tender-site/freelancer-gallery eklenecek) **bağımsız bir Cloudflare
  Worker** — mimari "her kanal ayrı modül" isteğini birebir karşılıyor.
  Yeni bir kanal eklemek yeni bir worker eklemek demek, merkezi sistemi
  değiştirmeden.
- `apps/control` tek otorite: adayları merkezi D1 tablosunda tutar, onay
  akışını yönetir, hiçbir worker sahibinin onayı olmadan mesaj/teklif
  gönderemez.
- `packages/db` tüm worker'ların paylaştığı **tek merkezi veritabanı**
  şemasını tanımlar (aday veritabanı ayrı değil).
- Cloudflare Queues, worker'lar arası asenkron iletişim için kullanılacak
  (tarama → değerlendirme → onay kuyruğu → gönderim).

## Şu anki durum / sonraki adımlar

- [x] Proje notları toplandı, mimari onaylandı.
- [x] Repo iskeleti kuruldu.
- [x] Tüm tarama kanalları için worker iskeleti hazır: `google-search-scanner`,
      `yahoo-search-scanner`, `linkedin-scanner`, `tiktok-scanner`,
      `instagram-scanner`, `tender-site-scanner`,
      `freelancer-gallery-scanner`, `company-formation-tracker` (paralel
      iş kolu). Hepsi API anahtarı/kimlik bilgisi tanımlı olmadığında
      sahte veri üretmeden boş sonuç döner.
- [x] Onay paneli iskeleti (`apps/dashboard`) eklendi: onay bekleyen
      adayları ve genel sayaçları listeler, Onayla/Reddet formları
      control API'yi çağırır. Basic Auth ile korunuyor (üretimde
      Cloudflare Access önerilir).
- [x] `workers/wordpress-agent` iskeleti eklendi — PASİF, kapsam netleşince
      genişletilecek (bkz. aşağıdaki not).
- [x] **Cloudflare hesabında canlıya alındı ve uçtan uca doğrulandı**
      (hesap subdomain: `alimuratbattal`): D1 (`musteri-avcisi-db`), 5 KV
      namespace, `musteri-avcisi-outreach` kuyruğu, `SCAN_SHARED_SECRET`
      ve `DASHBOARD_PASSWORD` secret olarak ayarlandı. Deploy edilenler:
      `apps/control`, `apps/dashboard`, `workers/channels/whatsapp`,
      `workers/channels/email`, ve Faz 1 aktif iki tarayıcı
      (`google-search-scanner`, `company-formation-tracker`).
      `google-search-scanner` gerçek Google Places API ile test edildi:
      aday bulma → control'e kaydetme → dashboard'da görünme akışı
      çalışıyor. Diğer pasif tarayıcılar henüz deploy edilmedi ama
      service binding'leri (`CONTROL_WORKER`) güncel -
      `docs/deployment.md`'deki adımları tekrarlayarak istendiğinde
      deploy edilebilirler.
  - **Önemli mimari not (çözüldü):** worker'lar arası iletişimde artık
    `CONTROL_API_URL` + düz `fetch()` DEĞİL, `CONTROL_WORKER` service
    binding kullanılıyor - Cloudflare, aynı hesaptaki worker'ların
    birbirinin genel `*.workers.dev` adresine düz fetch ile istek atmasını
    "error 1042" ile engelliyor. Yeni bir worker eklerken bu deseni takip
    et (bkz. `docs/architecture.md`).
  - **Bilinen risk:** `wrangler secret put` ile interaktif yapıştırma
    sırasında değer bozulabiliyor (2 kez, farklı worker'larda, secret
    1 karaktere düştü). Güvenilir yöntem: `$deger = "..."; $deger |
    pnpm exec wrangler secret put AD` (PowerShell). Diğer 7 pasif
    worker'daki `SCAN_SHARED_SECRET` değerleri henüz bu yöntemle
    doğrulanmadı - aktifleştirilmeden önce kontrol edilmeli.
- [x] `google-search-scanner` gerçek Google Places API'sine (kanal:
      `google_maps`) bağlandı ve uçtan uca doğrulandı. `yahoo-search-scanner`
      hâlâ bekliyor.
- [ ] **Bilinen sorun (araştırma sürüyor):** düz Google web araması
      (kanal: `google_search`, Custom Search JSON API) kodu yazıldı ve
      deploy edildi (`GOOGLE_SEARCH_ENGINE_ID` ayarlı), ama Google
      tarafında sürekli `403: This project does not have the access to
      Custom Search JSON API` hatası alıyor. Denenip elenen nedenler:
      API anahtarı kısıtlaması (Custom Search API eklendi), API
      "Enabled" durumu (doğrulandı), Organization Policy
      (`gcp.restrictServiceUsage` = "Allowed: All"), proje/anahtar
      eşleşmesi (aynı proje doğrulandı), billing (aktif hesap bağlı,
      kota sayfası 10.000 sorgu/gün gösteriyor), secret bozulması
      (anahtar uzunluğu/prefix doğru: 39 karakter, "AIza"), API'yi
      kapatıp yeniden açma, tamamen yeni/kısıtlamasız bir anahtarla
      deneme, ve Cloudflare dışından doğrudan `curl` ile test - hepsinde
      AYNI hata. Bu, sorunun anahtarda/ağda değil, doğrudan bu projenin
      ("AMB Google Index Manager") Custom Search API'ye erişim
      yetkisinde, Google tarafında kalan çözülemeyen bir tutarsızlık
      olduğunu gösteriyor. Ara çözüm olarak Brave Search API'ye
      geçilip tam çalışır hale getirildi, ancak Brave'in artık aylık
      $5 ücretsiz kredi dışında ücretli olması nedeniyle sahibi bunu
      istemedi - kod tekrar Google Custom Search'e revert edildi
      (bkz. git log, "Revert" commit'leri). Sıfırdan yeni bir Google
      Cloud projesiyle deneme fikri de konuşuldu (100% ücretsiz, günde
      100 sorgu kotası yeterli olurdu) ama sahibi **bu konuyu şimdilik
      tamamen ertelemeyi** tercih etti - başka bir şeyle (örn. Ollama/
      yerel AI) çözmeyi düşündü, ama bu "7/24 kesintisiz, Cloudflare
      üzerinde" kararıyla çeliştiği için (yerel makine kapalıyken
      sistem durur) o da yapılmadı. Sistem bunu zarif karşılıyor - web
      arama hata verse/atlansa bile Maps sonuçları etkilenmeden
      kaydediliyor (`workers/google-search-scanner/src/scan.ts`).
      İstenirse ileride: (a) sıfırdan yeni Google Cloud projesi, veya
      (b) Brave Search API (kod hazır, `git revert` ile geri getirilebilir,
      bkz. commit 7c788b3) ile devam edilebilir.
- [x] **E-posta gönderimi canlı ve doğrulandı**: Resend + `ajansim.net`
      domaini (Cloudflare üzerinden "Auto configure" ile DKIM/SPF/DMARC
      DNS kayıtları otomatik eklendi, domain "Verified"). Gönderen adres:
      `info@ajansim.net`. `EMAIL_API_KEY` secret olarak ayarlandı,
      `workers/channels/email` deploy edildi, doğrudan `/send`
      endpoint'ine test isteği atılıp gerçek e-posta alındığı teyit
      edildi.
- [x] **Gönderim kanalları korumaya alındı**: `OUTREACH_SHARED_SECRET`
      eklendi - control, whatsapp/email/voice-call worker'larına
      `x-outreach-secret` header'ı ile istek atıyor, worker'lar kendi
      kopyalarıyla eşleşmiyorsa 401 dönüyor. Secret olmadan doğrudan
      `/send` çağrısı denenip reddedildiği doğrulandı.
- [x] **Google Maps taraması şehir bazlı hale getirildi.** Sorgular artık
      `"{sektör} Türkiye"` yerine `"{sektör} {şehir}"` şeklinde, Türkiye'nin
      tüm 81 ili üzerinden atılıyor (`packages/shared/src/cities.ts` -
      `CITIES`). `google-search-scanner/src/scan.ts` içindeki
      `scanNextSector`, sektör × şehir matrisinde (29 sektör × 81 il =
      2.349 kombinasyon) ilerliyor - cursor önce bir sektörün tüm
      şehirlerini, sonra sıradaki sektöre geçiyor. Tam bir tur uzun sürer
      (bilinen/kabul edilmiş durum, bkz. paralel iş kolu kararı), ama her
      sonucun `rawMetadata`'sında `citySlug`/`cityLabel` de tutuluyor.
      **Dashboard'a sektör filtresi eklendi:** "Tüm Adaylar" sayfasında
      (`/adaylar?sector=<slug>`) bir dropdown ile belirli bir sektördeki
      adayları listeleyebiliyorsun (`apps/dashboard`).
- [x] **"Gönderilenler" sayfası eklendi** (`/gonderilenler`): e-posta veya
      WhatsApp üzerinden gönderilen (veya gönderimi denenip başarısız
      olan) her mesaj, kanal + iletim durumu (Gönderildi/Başarısız) ile
      birlikte listeleniyor. Kanal ve durum bazında filtrelenebiliyor.
      `apps/control` tarafında yeni `GET /communications` endpoint'i
      (`communication_log` tablosunu `candidates` ile join eder) ve
      `queue()` handler'ı artık başarısız gönderim denemelerini de
      (`status: "failed"`) logluyor - önceden sadece başarılı gönderimler
      loglanıyordu.
- [x] **"Onaylananlar" sayfası eklendi** (`/onaylananlar`): `status:
      "approved"` olan adaylar (onaylanmış, gönderim kuyruğuna alınmış
      ama henüz `sent`e geçmemiş) artık kendi sayfasında listeleniyor.
      "Tüm Adaylar" sayfasından (`/adaylar`) onaylanmış adaylar
      çıkarıldı - orada artık sadece onaylanmamış durumlar görünüyor.
      Sidebar sırası: Onaylar → Onaylananlar → Gönderilenler → Tüm
      Adaylar.
- [x] **Dashboard'a isim arama kutusu eklendi**: Onaylar, Onaylananlar,
      Tüm Adaylar ve Gönderilenler sayfalarındaki filtre çubuğuna (`q`
      query param) bir arama kutusu eklendi - sektör/şehir/kanal/durum
      filtreleriyle birlikte kullanılabiliyor.
      **Onaylananlar sayfası artık tablo değil, Onaylar sayfasıyla aynı
      kart + tıklanınca açılan popup (native `<dialog>`) görünümünde**
      (onay/red butonu olmadan - zaten onaylı, ama kim/ne zaman
      onayladığı popup'ta gösteriliyor).
- [x] **Gönderim otomatikten manuele çevrildi** (mimari karar
      güncellendi - bkz. yukarıdaki "İletişim kanalları" notu). Sahibi
      "tüm gönderimleri ben yapacağım" dedi:
      - `apps/control`: `handleApprove` artık `OUTREACH_QUEUE`'ya hiçbir
        şey koymuyor - sadece `approved` durumuna geçiriyor. Yeni
        `POST /candidates/:id/proposal` (teklif metnini güncelle) ve
        `POST /candidates/:id/mark-sent` (sahibi manuel gönderdikten
        sonra `sent`e çekip `communication_log`'a kayıt düşer) endpoint'leri
        eklendi. Eski `queue()` handler'ı (otomatik WhatsApp/e-posta API
        çağrısı) koddan silinmedi ama artık hiç tetiklenmiyor -
        `wrangler.toml`'daki `[[queues.consumers]]` tanımının geçerli
        kalması için (queue handler'sız deploy edilemiyor) kasıtlı
        olarak bırakıldı.
      - `apps/dashboard`: Onaylananlar sayfasındaki detay popup'ına
        düzenlenebilir teklif metni kutusu ("Metni Kaydet"), bir
        **WhatsApp'ta Gönder** (`wa.me/90...?text=...`) linki ve bir
        **E-posta ile Gönder** (`mailto:...`) linki eklendi - ikisi de
        sahibinin kendi hesabını/istemcisini açıyor. Her linkin yanında
        "...olarak işaretle" butonu var (manuel gönderim sonrası durumu
        günceller).
      - `workers/channels/whatsapp` ve `workers/channels/email` (Resend)
        koddan silinmedi (ileride tekrar otomatik gönderime dönülmek
        istenirse hazır dursun diye) ama artık hiçbir yerden
        çağrılmıyor - **WhatsApp Business API kimlik bilgisi eklemeye
        gerek kalmadı**.
- [x] **Eski sitesi taranan adaylardan e-posta çıkarımı eklendi**
      (`workers/google-search-scanner/src/scan.ts`): Places API e-posta
      vermediği için, `website_redesign` etiketi alan adaylar için
      zaten yapılan "eski site mi?" (viewport meta) kontrolünün
      indirdiği HTML'den regex ile e-posta adresi de çıkarılıyor (ekstra
      istek yok - aynı fetch kullanılıyor). "info@", "iletisim@" gibi
      genel adresler varsa öncelikli seçiliyor. Sadece ana sayfa
      taranıyor (ilk basit sürüm) - `/iletisim`, `/contact` gibi alt
      sayfalar taranmıyor. Yeni şirket/web sitesi olmayan adaylarda
      (`website_new`) taranacak bir site olmadığı için e-posta
      çıkarılamıyor - bu adaylarda sadece WhatsApp/telefon linki
      mümkün.
- [x] **Dashboard'daki tüm aday popup'ları tek bir ortak bileşene
      (`candidateDetailDialog`) birleştirildi** - Onaylar, Onaylananlar
      ve Tüm Adaylar sayfalarının hepsinde artık AYNI popup içeriği
      var: düzenlenebilir teklif metni + WhatsApp (wa.me) / e-posta
      (mailto:) gönderim linkleri + durum rozeti, farkı sadece en
      alttaki aksiyon (onay bekliyorsa Onayla/Reddet, değilse yok).
      **Tüm Adaylar sayfası da tablodan kart+popup görünümüne
      çevrildi** (artık diğer sayfalarla aynı). Onay/red ve
      metin-kaydet/gönderildi-işaretle formları artık gizli bir
      `redirect` alanı taşıyor - hangi sayfadan geldiyse işlem sonrası
      oraya geri dönülüyor (`apps/dashboard/src/index.ts`
      `safeRedirect`, sadece bilinen sayfa yollarına izin veriyor).
      `apps/control`'deki `/candidates/:id/proposal` ve
      `/candidates/:id/mark-sent` endpoint'leri artık her sayfadan
      (sadece Onaylananlar'dan değil) çağrılabiliyor.
- [x] **Teklif metinleri NVIDIA API ile kişiselleştiriliyor**
      (`apps/control/src/lib/proposal.ts`, `integrate.api.nvidia.com`
      chat completions, varsayılan model `meta/llama-3.1-70b-instruct`,
      `NVIDIA_MODEL` var'ı ile değiştirilebilir). Firma adı, sektör,
      şehir ve tespit edilen ihtiyaca göre doğal bir ilk temas mesajı
      yazdırıyor. `NVIDIA_API_KEY` secret'ı tanımlı değilse ya da API
      çağrısı başarısız olursa sessizce basit şablon metne düşülüyor -
      hiçbir aday LLM hatası yüzünden teklifsiz kalmıyor. Dashboard'daki
      popup'a **"AI ile Yeniden Yaz"** butonu eklendi
      (`POST /candidates/:id/regenerate-proposal`) - mevcut metni
      NVIDIA ile sıfırdan yeniden yazdırıyor. NVIDIA_API_KEY henüz
      Cloudflare'e eklenmedi/doğrulanmadı.
- [x] **Toplu onay + not (mini-CRM) alanı eklendi.** Onaylar ve Tüm
      Adaylar sayfalarında onay bekleyen adayların kartında bir
      onay-kutusu var; birden fazlasını işaretleyip görünen çubuktan
      **"Seçilenleri Onayla"** ile tek seferde onaylayabiliyorsun
      (`apps/control`: `POST /candidates/bulk-approve`). Ayrıca her
      aday popup'ına **serbest metin not alanı** eklendi ("ilgilenmiyor",
      "ay sonu tekrar ara" gibi takip notları için) -
      `evaluation_notes` sütunu şemada zaten vardı ama hiç
      kullanılmıyordu, `POST /candidates/:id/notes` ile devreye alındı.
- [x] **Sessiz arıza bildirimleri eklendi.** `google-search-scanner`
      artık Google Places API art arda 3 kez (~1.5 saat, 30dk cron ile)
      hata verirse sahibine `info@ajansim.net` adresine bir uyarı
      e-postası gönderiyor (bir kez, spam yapmıyor), sorun düzelince de
      "tekrar normal" bildirimi atıyor (`SCAN_STATE` KV'de
      `consecutive-failures`/`alert-sent` ile takip ediliyor).
      `apps/control`'de yeni `POST /alerts` endpoint'i
      (`routes/alerts.ts`, `SCAN_SHARED_SECRET` ile korunuyor) bunu
      `EMAIL_WORKER` üzerinden gönderiyor - bu, "onay olmadan gönderim
      yok" kuralını ihlal etmiyor, müşteri teklifi değil sahibine giden
      bir sistem bildirimi. Hedef adres `ALERT_EMAIL` var'ı ile
      değiştirilebilir. `workers/channels/email`'e özel başlık
      (`subject`) alanı eklendi (önceden hep sabitti).
- [x] **"AI ile Yeniden Yaz" düzeltildi + NVIDIA hata teşhisi eklendi.**
      Önceden bu buton tam sayfa formu gönderip popup'ı kapatıyordu
      (diğer formlarla aynı desen) - artık `fetch()` ile arka planda
      çalışıyor, popup açık kalıyor, dönen metin doğrudan kutuya
      yazılıyor. `draftProposal()` artık sadece metin değil
      `{ text, usedAI, error }` döndürüyor - NVIDIA çağrısı başarısız
      olursa (yanlış anahtar türü, 401/403 vb.) sebep doğrudan
      dashboard'da bir uyarı olarak gösteriliyor, `wrangler tail`'e
      bakmaya gerek kalmıyor. **Kök sebep bulundu:** ilk ayarlanan
      `NVIDIA_API_KEY`, ngc.nvidia.com'daki "Generate Legacy Key" ile
      üretilmişti - bu, `nvcr.io` (Docker/NGC kayıt defteri) girişi
      için bir kimlik bilgisi, `integrate.api.nvidia.com` (build.nvidia.com
      NIM/chat completions) bunu kabul etmiyor. Doğru anahtar
      build.nvidia.com'dan alınan `nvapi-...` formatındaki anahtar -
      secret güncellendi (`wrangler secret put NVIDIA_API_KEY`).
      Buton artık teşhis logları da basıyor (`[regenerateProposal] ...`,
      Console'da görülebilir). AI çıktısının gerçekten kişiselleştiğini
      teyit etme adımı, aşağıdaki `follow_up_date` arızası araya
      girdiği için yarım kaldı - istendiğinde dashboard'da bir aday
      popup'ında "AI ile Yeniden Yaz"a basıp doğrulanabilir.
- [x] **Bilinmeyen sebepli D1 şema uyumsuzluğu (`follow_up_date`) -
      dashboard tamamen çöktü, çözüldü.** Sahibi dashboard'da Error
      1101 ("Worker threw exception") almaya başladı. `wrangler tail`
      ile gerçek hata görüldü: `D1_ERROR: no such column:
      candidates.follow_up_date`. Bu sütun bu repodaki
      `packages/db/schema.ts`'de HİÇBİR ZAMAN olmadı (git geçmişinde de
      yok) - yani o an Cloudflare'de çalışan `apps/control` worker'ı,
      bu repodaki koddan farklı (muhtemelen daha eski ya da başka bir
      yerel değişiklikle deploy edilmiş) bir sürümdü. `git status`
      temiz çıktı (yerel fark yoktu), bu yüzden düzeltme sadece
      `apps/control`'ü bu repodan (temiz `git pull` sonrası)
      **yeniden deploy etmekti** - bu sorunu çözdü, `wrangler tail`
      sonraki tüm isteklerin "Ok" döndüğünü doğruladı. Ders: bir worker
      "tuhaf" bir hata veriyorsa ve repo geçmişinde o hatanın izi
      yoksa, önce deploy edilen sürümün repoyla senkron olup
      olmadığından şüphelen.
- [x] **"Rapor" ve "Ayarlar" sayfaları eklendi.** Sahibi bu iki URL'i
      (`/rapor`, `/ayarlar`) doğrudan denemiş ve yokluklarını "sayfa
      çalışmıyor" olarak bildirmişti - önceden hiç yapılmamışlardı.
      `apps/control`'e iki salt-okunur endpoint eklendi:
      `GET /report` (`routes/candidates.ts` `handleReport` - sektör/
      kanal/durum/şehir kırılımı, D1'den tüm adaylar çekilip JS
      tarafında sayılıyor, veri hacmi küçük olduğu için SQL GROUP BY
      yerine bu tercih edildi) ve `GET /settings`
      (`routes/settings.ts` `handleGetSettings` - aktif tarama
      kanalları, NVIDIA model adı, NVIDIA anahtarının TANIMLI OLUP
      OLMADIĞI (değeri değil), uyarı e-postası - hiçbir gerçek secret
      değeri döndürmüyor). Dashboard'a bu verileri basit yatay çubuk
      grafiklerle (`renderReportPage`) ve salt-okunur bilgi kartlarıyla
      (`renderSettingsPage`) gösteren iki yeni sayfa + sidebar'a iki
      yeni nav öğesi eklendi.
- [x] **Ayarlar sayfası düzenlenebilir hale getirildi** (bir sonraki
      istekte "buradan düzenleyebilmeliyim" denildi). Yeni D1 tablosu
      `settings` (key/value, migration:
      `packages/db/migrations/0002_settings.sql` - **deploy'dan önce
      uygulanmalı**, bkz. `docs/deployment.md`) ve
      `apps/control/src/lib/settings.ts` (`getEffectiveSettings`/
      `updateSettings`) eklendi. Panelden artık şunlar değiştirilebiliyor:
      NVIDIA API anahtarı, NVIDIA model adı, sistem uyarı e-postası,
      teklif şablonu (AI kullanılamazsa düşülen metin -
      `{{isim}}`/`{{ihtiyac}}`/`{{sektor}}`/`{{sehir}}` placeholder'ları
      destekliyor) ve AI'a verilen sistem talimatı (system prompt).
      `POST /candidates/:id/*` akışlarındaki `draftProposal()` çağrıları
      artık `env` yerine `getEffectiveSettings(env)`'in döndürdüğü
      efektif ayarları kullanıyor (D1'de bir satır varsa o, yoksa
      Cloudflare secret/var, o da yoksa sabit varsayılan).
      **Güvenlik ödünleşimi (bilinçli, kullanıcıya açıklandı):** NVIDIA
      anahtarını panelden kaydetmek onu Cloudflare Secret korumasından
      çıkarıp D1'de düz metin olarak saklıyor - `wrangler secret put`
      kadar korumalı değil. Panelde "Panel anahtarını sil" butonu var,
      basılırsa D1'deki satır silinip Cloudflare secret'a geri dönülüyor.
      NVIDIA anahtarı alanı API GET yanıtında hiçbir zaman gerçek değeri
      döndürmüyor, sadece tanımlı olup olmadığını ve kaynağını
      (panel/secret) gösteriyor.
- [x] **Ayarlar sayfası sistemdeki TÜM API anahtarlarını kapsayacak
      şekilde genişletildi** ("sistemde olan ve düşünülen tüm apileri
      ekle" denildi). Yeni jenerik katalog:
      `apps/control/src/lib/settings-catalog.ts` (`SETTINGS_CATALOG`)
      - her tarama/gönderim worker'ının her API anahtarı/URL listesi
      için bir kayıt (Google Places, Google Custom Search + Engine ID,
      Yahoo, LinkedIn oturum çerezi, TikTok, Instagram, ihale sitesi
      URL'leri, freelancer galeri URL'leri + arama anahtarı, ticaret
      sicili API'si, Resend e-posta anahtarı + gönderen adres, WhatsApp
      Business token + telefon ID, sesli arama sağlayıcı anahtarı,
      WordPress siteleri JSON'ı - pasif kanallar dahil hepsi). **Yeni
      bir özellik yeni bir anahtar gerektirdiğinde artık buraya birkaç
      satır eklemek yeterli** - ayrı bir form/route yazmaya gerek yok,
      "düşünülen" (henüz yapılmamış) API'ler de bu şekilde eklenecek.
      `apps/control/src/lib/settings.ts`'e `getCatalogView`/
      `updateCatalogFields` eklendi; `routes/settings.ts`'e katalog
      GET/POST desteği ve yeni `GET /internal-settings` (worker'ların
      kendi override'larını okuması için, `SCAN_SHARED_SECRET` ile
      korunuyor). `packages/shared/src/settings-client.ts`
      (`fetchSettingsOverrides`) worker'lar için ortak istemci -
      control'e erişilemezse SESSİZCE boş döner, worker kendi env
      fallback'ine düşer, hiçbir tarama bu yüzden durmaz.
      **Worker tarafı gerçekten bağlandı** (sadece panelde göstermekle
      kalmadı): `google-search-scanner`, `company-formation-tracker`,
      `yahoo-search-scanner`, `linkedin-scanner`, `tiktok-scanner`,
      `instagram-scanner`, `tender-site-scanner`,
      `freelancer-gallery-scanner` artık her tarama döngüsünün
      başında `withSettingOverrides()` ile control'den override okuyup
      kendi env'ini onunla ezip taramaya öyle başlıyor.
      `workers/channels/email`'in `CONTROL_WORKER` binding'i olmadığı
      için (control -> worker yönünde çağrılıyor), o worker'a override
      control'ün `/alerts` çağrısının GÖVDESİNDE taşınıyor
      (`apiKeyOverride`/`fromAddressOverride`) - aynı desen
      `channels/whatsapp` ve `channels/voice-call`'a da eklendi
      (şu an hiçbir canlı çağrı yolu yok, ama hazır - eski `queue()`
      handler'ı bilerek DOKUNULMADI, zaten hiç tetiklenmiyor).
      Dashboard'daki Ayarlar sayfası artık bu katalogdaki her alanı
      `group`a göre gruplu kartlar halinde otomatik render ediyor
      (`renderSettingsPage` `catalogGroups`/`catalogFieldInput`) - yeni
      bir katalog kaydı otomatik olarak formda belirir, dashboard
      kodunda ayrıca bir şey değiştirmeye gerek yok. Form alanları
      `field__<key>` adıyla gidiyor, dashboard `index.ts` bunları
      `fields` objesine toplayıp control'e tek istekte gönderiyor.
      **Önemli sınır (panelde de belirtiliyor):** control, bu
      anahtarların hangisinin ilgili worker'ın KENDİ Cloudflare
      secret'ında tanımlı olduğunu bilemez (o worker'ın env'i, control'ün
      değil) - "Panelde tanımlı" sadece D1'de bir override olduğu
      anlamına gelir; olmayan alanlarda ilgili worker sessizce kendi
      secret'ına düşer.
- [x] **Ayarlar sayfasındaki anahtarların yanına "Doğrula" butonu
      eklendi** ("hepsini ekle, yanlarına doğrulama butonu koy"
      denildi). Yeni `apps/control/src/lib/verify.ts` - formda O AN
      yazılı olan değeri (kaydetmeden test edilebiliyor) gerçek
      sağlayıcıya karşı canlı bir istekle test eder: NVIDIA
      (`GET /v1/models`), Google Places (`places:searchText` ile 1
      sonuçluk deneme), Google Custom Search (anahtar+cx ile deneme
      sorgusu), Resend (`GET /domains`), WhatsApp Business
      (`GET /{phone_number_id}`). **Bilerek yapılmayan kısım:** Yahoo,
      LinkedIn, TikTok, Instagram, ticaret sicili, sesli arama
      sağlayıcısı için doğrulama YOK - bu kanalların gerçek
      entegrasyon kodu henüz yazılmadı (`scan.ts` dosyaları hâlâ
      iskelet), test edilecek gerçek bir endpoint yok; uydurma bir
      "doğru/yanlış" göstermek yanıltıcı olurdu. O worker'lar gerçek
      bir kaynağa bağlanınca doğrulaması da eklenecek
      (`lib/verify.ts`'e birkaç satır). Yeni `POST /settings/verify`
      endpoint'i (auth yok - `/ayarlar/verify` üzerinden sadece
      dashboard'dan, Basic Auth arkasından çağrılıyor). Panelde
      doğrulanabilir her `secret` alanın altında bir "Doğrula" butonu
      + sonuç metni var (`renderSettingsPage` `catalogFieldInput`,
      JS: `verifySetting()`); doğrulaması olmayanlarda "Doğrulama
      yok - bu kanalın gerçek entegrasyonu henüz yazılmadı" notu
      gösteriliyor.
- [ ] **`linkedin-scanner` gerçek entegrasyona bağlandı - HENÜZ CANLI
      TEST EDİLMEDİ, kırılgan/kesin değil.** Sahibi "bunu yapalım" dedi
      (LinkedIn oturum çerezi yöntemi, risk zaten kabul edilmişti).
      `workers/linkedin-scanner/src/scan.ts`'e gerçek kod yazıldı:
      LinkedIn'in RESMİ bir arama API'si yok, bu yüzden LinkedIn'in
      kendi web arayüzünün kullandığı, dokümante EDİLMEMİŞ "Voyager" iç
      API'sine (`li_at` oturum çerezi + `JSESSIONID`/csrf-token ile
      "giriş yapmış gibi") istek atıyor - açık kaynak "LinkedIn
      scraper" projelerinden bilinen bir desen, ama bu repo içinde
      canlı test edilmedi (sandbox'ın LinkedIn'e ağ erişimi yok).
      **Kesin çalışacağı garanti değil** - LinkedIn bu iç API'nin
      şeklini istediği an değiştirebilir. `ScanDebugInfo.rawSample`
      alanı, parser hiç sonuç bulamazsa ham yanıtı taşır - Google
      Custom Search entegrasyonunda olduğu gibi canlı test + iterasyon
      gerekecek (sahibi çerezi girip `/run-now`'ı deneyip sonucu/hatayı
      paylaşacak, ona göre `parseVoyagerResults` ayarlanacak).
      Anahtar kelimeye göre kaba bir need-tag tahmini var (`KEYWORD_NEED_TAGS`
      sözlüğü, sınıflandırma değil). Ayrıca eklenenler: yeni
      `linkedin_csrf_token` katalog alanı (Ayarlar sayfası - `li_at` ile
      birlikte gerekiyor); `google-search-scanner` ile aynı desende
      `/run-now` (manuel tetikleme) ve sessiz arıza bildirimi (3 art arda
      hata → uyarı e-postası). `packages/shared/src/config.ts`
      `activeSourceChannels` listesine "linkedin" HENÜZ eklenmedi -
      önce canlı doğrulama gerekiyor (google_maps ile aynı prensip).
- [x] **"Ayarları Kaydet" hatası düzeltildi (kök sebep: yakalanmamış
      exception'lar Cloudflare'in opak Error 1101'ine dönüşüyordu).**
      Sahibi LinkedIn çerezini/CSRF token'ını Ayarlar panelinden
      kaydetmeye çalışırken hata aldı. Kod incelemesinde `apps/control`
      (`index.ts` `fetch()`) ve `apps/dashboard` (`index.ts` `fetch()`)
      handler'larının HİÇBİRİNDE üst seviye bir try/catch olmadığı
      görüldü - `handlePostSettings`/`updateCatalogFields` (ya da
      herhangi bir route) içinde fırlayan HERHANGİ bir hata (D1 hatası,
      beklenmeyen veri şekli vb.) yakalanmadan Workers runtime'ına kadar
      çıkıyordu; control'ün bunu bir service binding hatası olarak
      fırlatması da dashboard'un KENDİSİNİ çökertiyordu - sahibinin
      gördüğü "hata" muhtemelen buydu, gerçek D1/route hatası hiçbir
      yerde görünür değildi (`wrangler tail`e bakmadan teşhis mümkün
      değildi). Düzeltme: her iki worker'ın `fetch()` handler'ı artık
      tüm route mantığını (`handleFetch`) bir try/catch içinde çalıştırıyor;
      control artık `{ error, message }` JSON'ı 500 ile dönüyor, dashboard
      bunu (ve control'den gelen HER `!res.ok` yanıtını, önceden hiç
      kontrol edilmiyordu) okuyup Ayarlar sayfasında kırmızı bir
      `banner--bad` mesajı olarak gösteriyor (`renderSettingsPage`
      `errorMessage` parametresi, `/ayarlar?error=...`) - beklenmedik
      diğer tüm hatalar için de dashboard artık opak 1101 yerine
      okunabilir bir hata sayfası (`renderFatalErrorPage`) gösteriyor.
      **Önemli:** bu, hatayı GÖRÜNÜR yapar ama altındaki gerçek sebebi
      garanti çözmez - sahibi tekrar denediğinde artık ekranda gerçek
      D1/route hata mesajını görecek; hâlâ hata alırsa o mesajı
      paylaşması yeterli, `wrangler tail`e gerek kalmadan kök sebep
      belirlenebilir.
- [x] **Gerçek kök sebep bulundu ve düzeltildi: `settings.updated_at`
      şema uyumsuzluğu - `follow_up_date` olayıyla AYNI SINIF sorun.**
      Yukarıdaki görünürlük düzeltmesi sayesinde sahibi gerçek hatayı
      gördü: `D1_ERROR: NOT NULL constraint failed: settings.updated_at:
      SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_NOTNULL)`. Canlı
      D1'deki `settings` tablosunda `updated_at` diye NOT NULL (ve
      varsayılan değeri olmayan) bir sütun zaten varmış - muhtemelen
      `0002_settings.sql`'deki `CREATE TABLE IF NOT EXISTS`
      çalıştığında tablo (başka bir sebeple/denemeyle) zaten bu sütunla
      mevcuttu, bu yüzden migration hiçbir şey değiştirmedi ve kod bu
      sütundan habersiz kaldı - her `INSERT` NOT NULL ihlaliyle
      patlıyordu. Düzeltme (tabloyu BOZMADAN, sadece koda gerçekliği
      tanıtarak): `packages/db/schema.ts` `settings` tablosuna
      `updatedAt: text("updated_at").notNull()` eklendi;
      `apps/control/src/lib/settings.ts` `upsertSetting()` artık her
      `insert`/`onConflictDoUpdate`'te `updatedAt: new Date().toISOString()`
      gönderiyor. `packages/db/migrations/0002_settings.sql` da (ileride
      sıfırdan bir D1 kurulacaksa aynı hataya düşülmesin diye)
      `updated_at TEXT NOT NULL DEFAULT (datetime('now'))` ile
      güncellendi - `IF NOT EXISTS` olduğu için canlıdaki mevcut tabloyu
      etkilemiyor. **Henüz sahibi tarafından deploy edilip canlıda
      doğrulanmadı** - `apps/control`'ün yeniden deploy edilmesi
      gerekiyor, sonra Ayarlar sayfasında tekrar "Ayarları Kaydet"
      denenip gerçekten kaydettiği teyit edilmeli.
- [x] **`settings.updated_at` düzeltmesi canlıda doğrulandı** - deploy
      sonrası Ayarlar sayfasından `li_at`/`JSESSIONID` kaydedildi,
      "Panelde tanımlı" göründü.
- [x] **`linkedin-scanner` CANLI DOĞRULANDI - uçtan uca çalışıyor
      (bulundu → parse edildi → control'e kaydedildi).** Yukarıdaki
      şüpheli noktalar sırayla gerçek hatalarla doğrulandı ve düzeltildi:
      1) `SCAN_SHARED_SECRET` - sahibi ilk denemede benim örnek/placeholder
         metnimi ("control'deki-ile-ayni-secret-degeri") olduğu gibi
         secret olarak girmişti; orijinal değer kaybolmuştu, bu yüzden
         yeni bir secret üretilip `apps/control` + `google-search-scanner`
         + `company-formation-tracker` + `linkedin-scanner`'a aynı değer
         girildi. 2) `LINKEDIN_CSRF_TOKEN` eksikliği - `scanNextKeyword`
         önceden çerez/token eksikken debug hiç döndürmüyordu
         (`/run-now` yanıtında `scan` alanı sessizce yoktu), bu yüzden
         `li_at` girilmiş olmasına rağmen JSESSIONID unutulduğu
         görünmüyordu - artık hangisinin eksik olduğu (değer değil,
         sadece hangi env adı) `debug.apiError`'da geliyor. 3) HTTP 400 -
         `accept: application/json` yerine Voyager'ın beklediği
         `application/vnd.linkedin.normalized+json+2.1` yapıldı,
         şüpheli `resultType:List(CONTENT)` filtresi kaldırıldı. 4) HTTP
         400 (asıl sebep) - **çift URL-encode hatası**: `keyword` önce
         kendimiz `encodeURIComponent` ile encode edilmiş, sonra
         `URLSearchParams.toString()` bunu TEKRAR encode etmiş
         (`%20` → `%2520`, sunucuya literal "%20" metni gitmiş, gerçek
         boşluk değil); ayrıca `URLSearchParams` RESTli sorgu söz
         diziminin parçası olan `(`, `)`, `:`, `,` karakterlerini de
         yanlışlıkla encode ediyordu - URL artık `URLSearchParams`
         KULLANILMADAN elle, tek seferlik encode ile kuruluyor (bilinen
         `linkedin-api` istemcilerinin de yaptığı gibi). Bu 4 düzeltmeden
         sonra canlı test: `200 OK`, `found: 6`, `parsedCount: 6`,
         `posted: true`, `postStatus: 200` - `parseVoyagerResults`
         ("iş arıyorum" anahtar kelimesi için) hiç değiştirilmeden
         gerçek sonuç üretti. **Kalan adım:** bulunan 6 adayın
         isim/verisinin gerçekten anlamlı olup olmadığı (LinkedIn arayüz
         metni değil, gerçek kişi/firma adı) dashboard'dan kontrol
         edilmeli - onaylandıktan sonra `activeSourceChannels`'e
         "linkedin" eklenecek (google_maps ile aynı prensip, henüz
         eklenmedi).
- [x] **Kaynak (tarama kanalı) filtresi tüm aday listesi sayfalarına
      eklendi** ("filtre yok sistemde her sayfaya ekle, yahoo, google
      map, google search, linkedin, instagram vs hepsi için filtre yap"
      denildi). Onaylar (`/`), Onaylananlar (`/onaylananlar`) ve Tüm
      Adaylar (`/adaylar`) sayfalarındaki ortak `filterBar()`'a mevcut
      Sektör/Şehir dropdown'larının yanına üçüncü bir **"Kaynak"**
      dropdown'u eklendi - `packages/shared` `SOURCE_CHANNELS` listesindeki
      TÜM kanalları (google_search, google_maps, yahoo_search, linkedin,
      tiktok, instagram, tender_site, freelancer_gallery) otomatik
      listeler, yeni bir kanal eklendiğinde ayrıca dokunmaya gerek yok.
      Query param: `?source=<slug>`. **Gönderilenler** (`/gonderilenler`)
      sayfasına da ayrı bir "Kaynak" filtresi eklendi - oradaki mevcut
      "Kanal" filtresiyle (WhatsApp/E-posta/Sesli Arama - gönderim
      kanalı) KARIŞTIRILMASIN diye bilinçli olarak farklı bir kavram
      (`source` query param, "Kaynak" etiketi); bunun için
      `apps/control/src/routes/communications.ts`'teki join'e
      `sourceChannel` eklendi ve tabloya yeni bir "Kaynak" sütunu
      kondu. Tüm filtreleme (sektör/şehir/kaynak/isim gibi) mevcut
      desende client-side (control'den TÜM sonuçlar çekilip
      `render.ts`'te JS ile filtreleniyor) - veri hacmi küçük olduğu
      için SQL tarafında ayrıca bir WHERE eklenmedi.
- [x] **AI ile alaka (relevance) filtresi eklendi** - sahibi "Linkedin'de
      aramalar hep iş ilanı oluyor, benimle alakalı değil... bu
      aramaların hepsini bir yapay zekaya bağlayıp alakalı olup
      olmadığını bulabilir" dedi. Kök sebep: LinkedIn'in genel (`q=all`)
      anahtar kelime araması, "kurumsal kimlik", "logo tasarımı" gibi
      ifadeler için LinkedIn'de en çok İŞ İLANLARINI (ör. "... Grafik
      Tasarımcı Aranıyor") öne çıkarıyor - arama API'sinin kendisi bunu
      ayıklamıyor. Yeni `apps/control/src/lib/relevance.ts`
      (`assessRelevance`) - NVIDIA'ya (aynı `draftProposal`'ın kullandığı
      `integrate.api.nvidia.com` chat completions, aynı API anahtarı/model)
      adayın adını + tahmini ihtiyaç etiketlerini + kaynak kanalı +
      rawMetadata'sını (LinkedIn için `keyword`/`rawType`) verip "bu
      gerçekten bir potansiyel müşteri mi, yoksa bir iş ilanı/CV/rakip/
      alakasız bir şey mi" diye soruyor, `{relevant: bool, reason: string}`
      JSON'ı bekliyor. `apps/control/src/routes/candidates.ts`
      `handleScanResults` artık her yeni adayı kaydetmeden ÖNCE bunu
      çağırıyor - **TÜM kaynak kanalları için** (sadece LinkedIn değil;
      Google Maps gibi zaten temiz kaynaklarda AI genelde "alakalı"
      diyecek, maliyeti kabul edilebilir görüldü). Alakasız bulunursa
      aday yine de KAYDEDİLİYOR (kaybolmuyor, "Tüm Adaylar"da görülebilir)
      ama doğrudan `rejected` durumuna geçiyor, `evaluationNotes` alanına
      `"AI: alakasız görünüyor - <gerekçe>"` yazılıyor, teklif metni hiç
      üretilmiyor (gereksiz NVIDIA çağrısı yapılmıyor) - onay bekleyenler
      listesi kirlenmiyor. **FAIL-OPEN tasarım (bilinçli):** NVIDIA anahtarı
      tanımlı değilse, çağrı başarısız olursa, ya da yanıt beklenen JSON
      şeklinde değilse `relevant: true` dönüyor - yani sistem ŞÜPHEDE
      KALDIĞINDA adayı ASLA elemiyor, sadece AI net bir şekilde "alakasız"
      dediğinde eliyor (gerekçe: kaçırılan bir gürültü sahibi tarafından
      tek tıkla reddedilebilir, ama yanlışlıkla elenen gerçek bir müşteri
      asla görülmez - bu çok daha maliyetli bir hata). Sahibi NVIDIA
      anahtarını Ayarlar panelinden zaten girmişti - bu özellik onu hem
      teklif kişiselleştirmede HEM DE artık bu alaka filtresinde
      kullanıyor, ek bir anahtar gerekmedi. **Henüz canlıda doğrulanmadı**
      - `apps/control` deploy edilip LinkedIn taraması tekrar denendiğinde,
      iş ilanı sonuçlarının artık "Reddedildi" durumunda (Onay
      bekleyenlerde DEĞİL) çıkması beklenir.
- [x] **Yukarıdaki alaka filtresi, binary (alakalı/alakasız) yerine 1-5
      YILDIZ bir "lead kalite puanı"na çevrildi + ayrı bir "Askıda"
      paneli eklendi.** Sahibi "linkedinde aramalar hep iş ilanı oluyor...
      askıda diye bir panel oluştur, oraya atsın... 5 yıldız kesin
      müşteri 1 yıldız zaman kaybetmeye değmez olsun" dedi - hem
      alakasız adayların "Reddedildi" (manuel reddedilenlerle aynı
      kovaya) gitmesini istemedi, hem de basit evet/hayır yerine
      dereceli bir puan istedi. Değişenler:
      - `apps/control/src/lib/relevance.ts`: `assessRelevance` (bool)
        yerine `assessLeadQuality` (1-5 `score` + `reason`) - aynı
        NVIDIA çağrısı, sadece prompt/şema değişti. `ON_HOLD_MAX_SCORE = 2`
        sabiti - bu ve altındaki puanlar "Askıda"ya gider. FAIL-OPEN
        aynı kaldı: AI puanlayamazsa `score: undefined` döner (bu "1
        yıldız" DEMEK DEĞİL) - `handleScanResults` puansız bir adayı
        asla Askıda'ya atmaz, normal akışa bırakır.
      - Yeni D1 sütunu: `candidates.ai_score` (nullable INTEGER,
        migration `packages/db/migrations/0003_ai_score.sql` -
        **deploy'dan önce uygulanmalı**, bkz. `docs/deployment.md`).
        `packages/shared/src/types.ts` `Candidate.aiScore` +
        `CANDIDATE_STATUSES`'a yeni `"on_hold"` durumu eklendi.
      - `apps/control/src/routes/candidates.ts` `handleScanResults`:
        puan ≤2 ise aday `on_hold` durumunda kaydedilir (teklif metni
        ÜRETİLMEZ, gereksiz AI çağrısından kaçınılır),
        `evaluationNotes`'a `"AI: düşük puan (N/5) - <gerekçe>"`
        yazılır; puan 3+ (ya da puansız) ise eskisi gibi
        `pending_approval`'a gider, `aiScore` her durumda saklanır
        (onay bekleyenlerde de yıldız görünsün diye - sadece eşik altı
        değil, HER adayda gösteriliyor).
      - Yeni `apps/control/src/routes/approvals.ts` `handleUnhold`
        (`POST /candidates/:id/unhold`) - Askıda'daki bir adayı sahibi
        "bu aslında ilgili" deyip geri gönderdiğinde çağrılır: BURADA
        ilk kez teklif metni üretilir, durum `pending_approval`'a
        döner. Kalıcı reddetmek için ayrı bir endpoint YOK - mevcut
        `handleReject` (`/candidates/:id/reject`) her durumdan
        çalıştığı için Askıda'dan da doğrudan kullanılıyor.
      - `apps/dashboard`: yeni **Askıda** sayfası (`/askida`,
        `renderOnHoldPage` - Onaylananlar ile aynı desen: kart+popup,
        sektör/şehir/kaynak/isim filtresi) + sidebar'a yeni nav öğesi
        (onay bekleyenler gibi bir sayaç rozetiyle). "Tüm Adaylar"
        sayfasından (onaylananlar gibi) Askıda'dakiler de çıkarıldı -
        artık kendi sayfaları var. Her aday kartında/popup'ında AI
        puanı varsa küçük bir ★★★★★ rozeti gösteriliyor
        (`scoreStars()`) - kırmızı (≤2), sarı (3), yeşil (≥4). Askıda
        kartlarında iki aksiyon: **"Onaya Gönder"** (`/candidates/:id/unhold`)
        ve **"Kalıcı Reddet"** (mevcut `/reject/:id` formu yeniden
        kullanıldı).
      - **Henüz canlıda doğrulanmadı** - migration uygulanıp
        `apps/control` + `apps/dashboard` deploy edildikten sonra
        LinkedIn taraması tekrar denenip iş ilanlarının bu sefer
        "Askıda" sayfasında (Onay bekleyenlerde DEĞİL) çıkıp çıkmadığı
        kontrol edilmeli.
      - **Yapılmayan kısım (sahibiyle netleşmeli):** sahibi ayrıca
        "Google Maps'te yorumları da incelesin, yıldız versin" istedi -
        bu, Google Places API'den gerçek müşteri YORUMLARINI çekmeyi
        gerektiriyor (`places.reviews` alanı) ki bu, şu an kullanılan
        Text Search çağrısının ücretsiz/düşük maliyetli SKU'sunun
        DIŞINDA, Google'ın "Pro"/daha üst bir ücretlendirme katmanına
        giriyor - sahibi Brave Search'ün aylık $5'ini bile reddetmişti
        (bkz. Google Custom Search notu), bu yüzden ek maliyeti
        onaylamadan bu kısım YAPILMADI. Şu anki puanlama Google Maps
        adayları için de çalışıyor (isim/sektör/ihtiyaç etiketine göre)
        ama yorumları GÖRMÜYOR.
- [x] **Dashboard'a "Canlı Log" (Terminal) sayfası eklendi.** Sahibi
      "yapay zekanın çalıştığını nereden anlıyoruz, dashboard'a terminal
      ekleyelim, orada ne yaptığını görelim" dedi. Yeni D1 tablosu
      `activity_log` (migration `packages/db/migrations/0004_activity_log.sql`
      - **deploy'dan önce uygulanmalı**, bkz. `docs/deployment.md`) ve
      `apps/control/src/lib/activity-log.ts` (`logActivity`,
      `readRecentActivity`, `handleGetActivity` - yeni `GET /activity`
      endpoint'i) eklendi. `handleScanResults` (`routes/candidates.ts`)
      artık şu olayları kısa Türkçe cümlelerle logluyor: her adayın AI
      lead puanlama sonucu (`"<isim> (<kanal>): 4/5 yıldız - <gerekçe>"`
      ya da AI atlandıysa/başarısızsa sebebi), Askıda'ya alınma kararı,
      teklif metninin AI ile yazılıp yazılamadığı, ve her tarama
      batch'inin özeti (`"<kanal>: N sonuç alındı, M yeni kayıt"`).
      `logActivity` kendi başına ASLA ana akışı bozmaz (insert
      başarısız olursa - ör. migration henüz uygulanmadıysa - sessizce
      `console.error`'a düşer, hatayı yutar) ve satır sayısı sınırsız
      büyümesin diye her yazımda ~%5 ihtimalle en yeni 2000 satır
      dışındakileri buduyor (ekstra bir DELETE sorgusunu HER yazımda
      çalıştırıp gecikme eklemek istemedik).
      `apps/dashboard`: yeni **Canlı Log** sayfası (`/terminal`,
      `renderTerminalPage`) - koyu, monospace bir "terminal" görünümünde
      (`renderActivityLines`, seviyeye göre renkli: info/warn/error),
      en yeni satır en altta (gerçek bir terminal gibi). Sayfa **5
      saniyede bir kendini tazeliyor** - `GET /terminal/data` (sadece
      log satırlarının HTML fragment'ını döner, tam sayfa değil) + basit
      bir `setInterval`/`fetch` JS'i (`pollActivityLog`, `shell()`
      script'inde) ile; kullanıcı yukarı kaydırıp geçmişi okuyorsa
      otomatik aşağı kaydırma yapılmıyor. Sidebar'a "Tüm Adaylar" ile
      "Rapor" arasına yeni bir nav öğesi eklendi. **Önemli sınırlama
      (panelde de belirtiliyor):** bu, `wrangler tail`'in YERİNE
      geçmiyor - `wrangler tail` HER ham isteği/yanıtı gösterir, bu
      sadece yukarıdaki birkaç önemli olayın kısa özeti; daha derin bir
      teşhis gerekirse (ör. LinkedIn Voyager entegrasyonunda olduğu gibi
      tam bir API yanıtı) hâlâ `wrangler tail` ya da `/run-now` gerekir.
      **Henüz canlıda doğrulanmadı** - migration uygulanıp
      `apps/control` + `apps/dashboard` deploy edildikten sonra bir
      tarama tetiklenip Canlı Log sayfasında satırların gerçekten
      biriktiği ve sayfanın kendini tazelediği kontrol edilmeli.
- [x] **Canlı Log CANLIDA DOĞRULANDI ve ilk gününde büyük, aylarca fark
      edilmemiş bir arıza buldu: NVIDIA modeli kullanımdan kaldırılmış
      (`model end-of-life`).** Migration uygulandı, sahibi LinkedIn
      taramasını tekrar tetikledi, Canlı Log sayfası gerçekten çalıştı
      (satırlar biriktirdi, kendini tazeledi) - AMA her satırda aynı
      hata vardı: `status=410 ... "The model
      'meta/llama-3.1-70b-instruct' has reached its end of life on
      2026-08-26T09:00:00Z and is no longer available."`. Yani NVIDIA bu
      modeli **26 Ağustos 2026'da** kaldırmış, sistem o tarihten beri
      (haftalarca) hem lead puanlamayı hem teklif yazımını AYLARCA
      sessizce başarısız kılıyormuş - FAIL-OPEN tasarımı sayesinde hiçbir
      şey çökmedi (adaylar hep normal akışa girdi, teklifler şablona
      düştü) ama AI'ın hiçbir katkısı olmuyordu ve bu Canlı Log
      eklenene kadar GÖRÜNMÜYORDU. **Kök sebep + düzeltme:**
      1. `apps/control/wrangler.toml`'daki `[vars]` `NVIDIA_MODEL =
         "meta/llama-3.1-70b-instruct"` - bu, koddaki
         `apps/control/src/lib/settings.ts` `DEFAULT_MODEL`'i EZİYORDU
         (öncelik: D1 override > env var > kod varsayılanı), yani sadece
         kod varsayılanını güncellemek yetmezdi. İkisi de
         `meta/llama-3.3-70b-instruct`'a (3.1-70b'nin doğrudan halefi)
         güncellendi - **ama bu da GARANTİ DEĞİL**, NVIDIA modelleri
         istediği an kaldırabiliyor, bu yüzden 2. madde asıl kalıcı
         çözüm.
      2. `apps/control/src/lib/verify.ts` `verifyNvidia` artık SADECE
         anahtarın geçerliliğini değil, formda yazılı `nvidia_model`
         değerinin NVIDIA'nın döndüğü GÜNCEL model listesinde gerçekten
         var olup olmadığını da kontrol ediyor - yoksa "model artık
         mevcut değil" diyip listeden birkaç geçerli model önerisi
         gösteriyor. Önceden "Doğrula" sadece anahtarı test ediyordu,
         anahtar geçerliyken bile model ölü olabiliyordu ve bu hiç
         yakalanmıyordu - bu sınıf arıza artık Ayarlar'dan tek tıkla
         (periyodik "Doğrula" alışkanlığıyla) yakalanabilir.
      **Ders (CLAUDE.md'ye tam da bunun için eklendi):** FAIL-OPEN
      tasarımlar (burada, `settings.ts`'te NVIDIA_API_KEY yokken/proposal
      hatasında) sistemi ayakta tutar ama AYNI ZAMANDA sessiz
      bozulmaları saatlerce/haftalarca görünmez kılabilir - Canlı Log
      gibi bir gözlemlenebilirlik katmanı olmadan bu tür arızalar
      "her şey normal görünüyor ama AI aslında hiç çalışmıyor" şeklinde
      fark edilmeden sürebilir. **Henüz yeni model canlıda doğrulanmadı**
      - `apps/control` deploy edilip tekrar bir tarama tetiklendiğinde
      Canlı Log'da artık `410` hatası yerine gerçek yıldız puanları
      görünmesi beklenir.
- [x] **ÇOK ÖNEMLİ, UZUN SÜREDİR VAR OLAN BİR HATA BULUNDU VE DÜZELTİLDİ:
      dashboard'daki TEK büyük paylaşılan `<script>` bloğu, tarayıcıda
      HİÇ ÇALIŞMIYORDU (JS syntax hatası) - Canlı Log'un "5 saniyede bir
      kendini yenilemiyor" şikayeti araştırılırken ortaya çıktı.**
      Tarayıcı konsolunda `Uncaught SyntaxError: Invalid or unexpected
      token` görüldü. Kök sebep: `render.ts`'teki TÜM `<script>` içeriği,
      TEK BİR büyük TypeScript template literal'ı (backtick string)
      içinde yazılıyor - bu yüzden o string'in içindeki HERHANGİ bir
      `\n` (satır sonu kaçışı), tarayıcıya gitmeden ÖNCE TypeScript
      derleyicisi tarafından GERÇEK bir satır sonu karakterine
      çevriliyor. `regenerateProposal()` fonksiyonundaki
      `alert('...\n\nSebep: ...')` satırındaki `\n\n` tam olarak buydu -
      tarayıcıya giden JS'de tek tırnaklı bir string'in ORTASINDA gerçek
      bir satır sonu vardı, bu geçersiz JS. **Bir JS parser, bir script
      bloğunu çalıştırmadan önce TAMAMINI parse eder - script'in
      HERHANGİ bir yerinde tek bir syntax hatası, o script'teki TÜM
      fonksiyonların (yalnızca `regenerateProposal` değil,
      `updateBulkBar`, `clearBulkSelection`, `verifySetting`, ve şimdi
      `pollActivityLog`) HİÇ tanımlanmamasına yol açıyordu.** Yani bu
      satır eklendiği günden beri (CLAUDE.md'deki "AI ile Yeniden Yaz
      düzeltildi" notu) muhtemelen toplu onay kutucukları, "Doğrula"
      butonları ve "AI ile Yeniden Yaz" da tarayıcıda gerçek anlamda hiç
      çalışmamış olabilir - sadece hiç kimse (ben dahil) tarayıcı
      konsoluna bakmamıştı, bu yüzden fark edilmemişti. **Düzeltme:**
      `\n\n` → `\\n\\n` (çift ters eğik çizgi) - bu şekilde dış template
      literal bunu ÖNCE `\n\n`'ye (gerçek satır sonuna değil, iki
      karakterlik kaçış dizisine) çeviriyor, tarayıcıdaki JS motoru da
      BUNU normal şekilde satır sonu olarak yorumluyor. Node'un kendi
      JS ayrıştırıcısıyla (`node --check`) hem hatayı ("Invalid or
      unexpected token", tam olarak sahibinin gördüğü hata) hem de
      düzeltmeden sonra HER İKİ `<script>` bloğunun da geçerli
      olduğunu doğruladım - bu repoda `tsc` bu tür client-side JS
      hatalarını YAKALAMAZ (JS, bir TS template literal'ının içinde
      düz metin olarak görünüyor), bu yüzden gelecekte benzer bir
      `<script>` değişikliği yapılırsa aynı şekilde `node --check` ile
      (ya da bir tarayıcıda gerçekten açıp konsola bakarak) doğrulanmalı.
      **Ders:** render.ts'teki `<script>` bloğu içine yazılan JS'e asla
      çıplak `\n`/`\t` gibi kaçış dizileri YAZILMAMALI - ya çift ters
      eğik çizgi (`\\n`) kullanılmalı ya da string birleştirme/gerçek
      satır sonlarıyla yazılmalı. **Henüz canlıda doğrulanmadı** -
      `apps/dashboard` deploy edilip tarayıcı konsolunda artık hata
      görünmediği, Canlı Log'un gerçekten 5 saniyede bir tazelendiği VE
      "Doğrula"/"AI ile Yeniden Yaz"/toplu onay gibi diğer JS
      özelliklerinin de (belki de ilk kez) gerçekten çalıştığı
      doğrulanmalı.
- [ ] **Sahibinin verdiği büyük özellik listesi (~20 fikir) - HİÇBİRİ
      henüz yapılmadı**, sadece not edildi, önceliklendirme bekliyor:
      aday zaman çizelgesi/geçmiş sekmesi popup'ta; serbest
      etiketleme ("sıcak lead" vb., need tag'lerden bağımsız); toplu
      red + toplu not; `yahoo-search-scanner`'ı gerçek API'ye bağlamak
      (düşük efor, sahibi de belirtti); tarama ilerleme göstergesi
      (2.349 sektör×şehir kombinasyonunun neresinde olduğu,
      dashboard'da); "yakında bitecek domain" taraması (yeni kanal
      fikri); günlük/haftalık özet e-postası (düşük efor, mevcut
      EMAIL_WORKER/ALERT_EMAIL altyapısı üzerine); Slack/Discord anlık
      bildirim; PDF/görsel teklif şablonu; çoklu kullanıcı girişi;
      harita görünümü (Rapor sayfasındaki şehir kırılımının görsel
      hali); basit müşteri portalı (converted adaylar için durum
      sayfası); referans/vaka galerisi linki; Calendly benzeri randevu
      linki entegrasyonu; PWA (ana ekrana eklenebilir dashboard); KVKK/
      veri saklama politikası (otomatik silme + "bir daha iletişime
      geçme" kara listesi); mobilde tek dokunuşlu hızlı aksiyon
      etiketleri; sosyal dinleme - forum/yorum sitelerinde birebir
      ihtiyaç cümlesi taraması (yeni kanal fikri); Google yorumlarından
      kanıta dayalı teklif referansı ("yorumlarınızda ... belirtilmiş");
      sesli arama modülünü gerçek bir AI ön-eleme botuna çevirmek (en
      büyük teknik sıçrama). Bir sonraki oturumda sahibiyle birlikte
      önceliklendirilmeli - hepsini aynı anda yapmaya çalışmak yerine.
- [ ] `linkedin-scanner`, `tiktok-scanner`, `instagram-scanner`,
      `tender-site-scanner`, `freelancer-gallery-scanner` için gerçek
      kaynak entegrasyonları yazılacak (iskelet hazır, `scan.ts`
      içindeki TODO'lar).
- [ ] `packages/shared/src/config.ts` içindeki `activeSourceChannels`
      listesi, her kanal gerçek entegrasyonla test edildikçe genişletilecek.
- [ ] `wordpress-agent` kapsamı netleştirilecek: hangi siteler, hangi
      işlemler (içerik güncelleme, SEO meta, eklenti yönetimi vb.).
- [ ] Dashboard için Cloudflare Access (Zero Trust) ile gerçek erişim
      kontrolü kurulacak — Basic Auth sadece geçici bir önlem.
- [ ] SEO motoru için ayrı repo/proje (`ajansimiz.net`) — bu repo'nun
      kapsamı dışında, sadece entegrasyon noktası bırakılacak.

## Geliştirme notları

- Paket yöneticisi: `pnpm` (workspace).
- Dil: TypeScript, tüm Cloudflare Workers için.
- ORM: Drizzle (D1 uyumlu).
- Hiçbir worker, `apps/control` üzerinden onay almadan dış dünyaya mesaj/
  teklif göndermemeli — bu kural kod incelemelerinde önceliklidir.
