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
      **Teşhis iyileştirmesi (bu oturumda yapıldı, canlıda henüz test
      edilmedi):** `webApiError` artık 300 karakterde kesilmiyor - ham
      gövde tam haliyle korunuyor ve Google'ın hata JSON'ı ayrıştırılıp
      `status`/`reason`/`message`/`extendedHelp` alanları ayrı ayrı
      çıkarılıyor. `extendedHelp` linki genelde
      `.../customsearch.googleapis.com/overview?project=<PROJE_NUMARASI>`
      şeklinde - anahtarın Google tarafında GERÇEKTE hangi proje
      numarasına bağlı olduğunu gösteriyor, "proje/anahtar eşleşmesi"
      şüphesini kesin doğrulamak için en güvenilir sinyal bu. Ayrıca
      sektör × şehir turunu (ve Places API anahtarını) beklemeden Custom
      Search API'yi tek başına test eden yeni bir uç nokta eklendi:
      `GET /diagnose-search?secret=<SCAN_SHARED_SECRET>`
      (`workers/google-search-scanner/src/index.ts`,
      `diagnoseCustomSearch()` → `scan.ts`). Sonraki adım: bu endpoint'i
      canlıda çağırıp `extendedHelp` linkindeki proje numarasını GCP
      Console'daki hedef projenin numarasıyla karşılaştırmak.
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
      bakmaya gerek kalmıyor. NGC "Legacy Key" ile
      `integrate.api.nvidia.com`'un çalışıp çalışmadığı henüz
      doğrulanmadı - bu hata mesajı doğrulamak için kullanılacak.
- [x] **Güvenlik denetimi yapıldı, 3 gerçek açık bulunup düzeltildi
      (kod tarafı hazır, CANLIYA REDEPLOY + yeni secret gerekiyor,
      aşağıya bkz.):**
      1. **`apps/control` kimlik doğrulaması olmadan herkese açıktı.**
         `apps/control`'ün kendi `*.workers.dev` adresi (hiçbir
         worker'da `workers_dev = false` yoktu) üzerinden, dashboard'daki
         Basic Auth'u tamamen atlayarak `GET /candidates` (tüm müşteri
         PII'si: isim/e-posta/telefon), `GET /stats`,
         `GET /communications` okunabiliyor; `approve`/`reject`/
         `bulk-approve`/`proposal`/`mark-sent` gibi yazma uçları
         çağrılabiliyordu - "onay mekanizması zorunlu" kuralını fiilen
         geçersiz kılıyordu. **Düzeltme:** diğer worker'lardaki
         `SCAN_SHARED_SECRET`/`OUTREACH_SHARED_SECRET` deseniyle aynı
         şekilde yeni bir `CONTROL_SHARED_SECRET` eklendi - `apps/control`
         artık `/health`, `/scan-results`, `/alerts` DIŞINDAKİ her isteği
         `x-control-secret` header'ı eşleşmeden 401 ile reddediyor
         (`apps/control/src/index.ts` `requireControlSecret`,
         `apps/dashboard/src/index.ts` `callControl`). Ayrıca
         `apps/control/wrangler.toml`'a `workers_dev = false` eklendi
         (ikinci savunma katmanı - control zaten sadece service binding
         ile çağrılıyor, genel adrese hiç ihtiyacı yok).
      2. **"Secret set edilmemiş = herkese açık" mantık hatası, 5
         yerde.** `workers/channels/{whatsapp,email,voice-call}/src/index.ts`
         ve `workers/google-search-scanner/src/index.ts` (`/run-now` VE
         bu oturumda eklenen `/diagnose-search`) içindeki secret
         kontrolleri `sağlanan !== beklenen` şeklindeydi - ama secret
         henüz `wrangler secret put` ile ayarlanmamışsa `env.X_SECRET`
         `undefined` olur, ve istekte header/param hiç yoksa `sağlanan`
         da `undefined`/`""` olur - `undefined !== undefined` ya da
         `"" !== ""` YANLIŞ (false) döner, yani istek YETKİLİYMİŞ GİBİ
         kabul edilirdi. Yedi pasif worker'ın `SCAN_SHARED_SECRET`'ının
         "bu yöntemle doğrulanmadığı" zaten biliniyordu (bkz. yukarıdaki
         "Bilinen risk") - bu, o riski "muhtemelen sorun olur" seviyesinden
         "secret unutulursa/bozulursa endpoint sessizce herkese açılır"
         seviyesine taşıyordu. **Düzeltme:** her 5 yerde de "beklenen
         DOLU mu" kontrolü eklendi (`!expected || sağlanan !== expected`) -
         secret set edilmemişse istek her zaman reddedilir, asla
         sessizce izin verilmez.
      3. **Aday tekrar-kontrolü (dedup) şehri hesaba katmıyordu.**
         `apps/control/src/routes/candidates.ts` `handleScanResults`,
         aynı adayı tekrar eklememek için sadece isim + sektör + kaynak
         kanalına bakıyordu - şehir YOK. Maps taraması artık 81 il
         üzerinden yapıldığından ("Merkez Kuaför" gibi yaygın isimler
         onlarca ilde farklı gerçek işletme olabilir), bu YANLIŞLIKLA
         farklı şehirlerdeki gerçek adayları "zaten var" sanıp sessizce
         atıyordu - sistemin asıl amacını (müşteri bulma) doğrudan
         zayıflatan, sessiz bir veri kaybıydı. **Düzeltme:** Places
         API'nin verdiği `placeId` varsa (kanal: `google_maps`) ONUNLA
         eşleştiriliyor (en güvenilir - Google'ın kendi işletme kimliği);
         yoksa isim + sektör + kaynak + (varsa) `citySlug` ile
         eşleştiriliyor (`json_extract(raw_metadata, ...)` ile).
      **Redeploy/secret notu:** (1) ve (2) için canlıda hiçbir kod
      çalışmıyor olsa da yeni secret set edilip worker'lar redeploy
      edilene kadar düzeltme etkisiz - `docs/deployment.md` adım 5
      güncellendi (`CONTROL_SHARED_SECRET` üretme/set etme adımları
      eklendi). (3) sadece `apps/control`'ün redeploy edilmesini
      gerektiriyor, yeni secret gerekmiyor.
- [x] **Website alanı, e-posta çıkarımı, ihtiyaç filtresi, WhatsApp
      gönderim hatası ve Ayarlar sayfası** (kod hazır, **CANLIYA ALMADAN
      ÖNCE D1 MIGRATION UYGULANMALI**, aşağıya bkz.):
      1. **`websiteUrl` ayrı bir alan oldu.** Önceden işletmenin web
         sitesi sadece `sourceUrl`'e (bazen bir Maps arama linkine
         düşebilen, "nereden bulundu" alanı) karışıktı. Şimdi
         `candidates.website_url` ayrı bir sütun (`packages/db/schema.ts`,
         migration `0002_website_and_settings.sql`) - dashboard'daki aday
         popup'ında net bir "Web sitesi: ..." satırı olarak gösteriliyor
         (`apps/dashboard/src/render.ts` `websiteLine()`), site yoksa
         "yok (yeni site teklifi için aday)" yazıyor.
      2. **E-posta çıkarımı ana sayfayla sınırlı kalmıyor artık.**
         `workers/google-search-scanner/src/scan.ts` `findContactEmail()`
         - önce ana sayfada arar (ekstra istek yok), bulamazsa `/iletisim`
         ve `/contact` yollarını dener (en fazla 2 ek istek, bulunca
         durur). Sahibinin "e-posta WhatsApp kadar önemli" geri
         bildirimine karşılık.
      3. **Dashboard'a ihtiyaç türü (need tag) filtresi eklendi.**
         Onaylar, Onaylananlar ve Tüm Adaylar sayfalarındaki filtre
         çubuğuna sektör/şehir/isim aramasının yanına "İhtiyaç" dropdown'ı
         eklendi (`NEED_TAGS`'teki 14 seçenek, "Yeni web sitesi" ve
         "Web sitesi yenileme" dahil) - `?need=<tag>` query param'ı ile
         (`apps/dashboard/src/render.ts` `filterBar`, `apps/dashboard/src/index.ts`).
      4. **WhatsApp'tan güncel olmayan mesaj gitme hatası düzeltildi.**
         Kök neden: `wa.me`/`mailto:` linklerinin `href`'i SADECE sayfa
         ilk render edilirken (DB'deki kayıtlı `proposalDraft`'tan)
         hesaplanıyordu - kullanıcı kutuda metni değiştirip "Metni
         Kaydet"e basmadan (ya da basıp popup'ın yeniden render
         edilmesini beklemeden) doğrudan "Gönder"e basarsa link hâlâ ESKİ
         metni taşıyordu. **Düzeltme:** gönder linklerine `onclick`
         (`prepareSendLink`, `apps/dashboard/src/render.ts` shell script'i)
         eklendi - tıklama anında textarea'daki GÜNCEL metni okuyup
         linkin `text`/`body` parametresini onunla değiştiriyor VE aynı
         metni arka planda `/candidates/:id/proposal`'a kaydediyor -
         "Metni Kaydet"e ayrıca basmaya gerek kalmadı, gönderilen ile
         kaydedilen her zaman aynı.
      5. **Yeni Ayarlar sayfası (`/ayarlar`).** Otomatik teklif
         metinlerinin şablonu ve AI davranışı artık kod deploy etmeden
         değiştirilebiliyor:
         - **Şablon teklif metni** (AI kapalıyken/başarısızken
           kullanılır) - `{{isim}}`/`{{ihtiyac}}` yer tutucularını
           destekliyor, önceden `apps/control/src/lib/proposal.ts`
           içinde sabit kodluydu.
         - **AI sistem promptu** - NVIDIA'ya gönderilen üslup talimatı,
           önceden sabit kodluydu.
         - **AI aç/kapat anahtarı** - kapatılırsa `NVIDIA_API_KEY`
           tanımlı olsa bile hiç çağrılmaz.
         - **AI model kimliği override'ı** (boşsa `NVIDIA_MODEL` env
           var'ına/varsayılana düşer).
         Yeni `settings` tablosu (key/value, migration
         `0002_website_and_settings.sql`) - `apps/control/src/lib/settings.ts`
         (`loadSettings`/`updateSettings`), yeni `GET/POST /settings`
         uç noktaları (`routes/settings.ts`, diğerleri gibi
         `CONTROL_SHARED_SECRET` gerektiriyor). **Kasıtlı olarak BURADA
         OLMAYAN:** API anahtarları/secret'lar (`NVIDIA_API_KEY`,
         `SCAN_SHARED_SECRET` vb.) - güvenlik nedeniyle Cloudflare secret
         olarak kalmaya devam ediyor, D1'de düz metin tutulmuyor.
      **KRİTİK - deploy sırası:** `websiteUrl` sütunu ve `settings`
      tablosu olmadan `apps/control` deploy edilirse, onlara
      yazan/okuyan HER istek ("no such column"/"no such table") hata
      verir - bu, YENİ ADAY KAYDININ TAMAMEN DURMASI demek (her tarama
      sonucu `draftProposal` için `loadSettings`'i çağırıyor). Migration
      MUTLAKA `apps/control` redeploy'undan ÖNCE canlı D1'e uygulanmalı
      - adımlar `docs/deployment.md`'nin "Mevcut (canlı) kuruluma yeni
      migration uygulama" bölümünde.
      **Güncelleme:** migration 2026-09-11'de canlı D1'e uygulandı
      (`wrangler` 3.x'te D1 remote execute `Authentication error [code:
      10000]` verdi - `npx wrangler@4` ile çözüldü, bilinen bir 3.x D1
      import hatası; projenin kendi wrangler sürümü hâlâ `^3.90.0`,
      sadece bu tek komut için `wrangler@4` kullanıldı). `apps/control`
      + `CONTROL_SHARED_SECRET` de aynı gün deploy edildi ve doğrulandı.
- [x] **Onay mekanizmasında gerçek bir boşluk bulundu ve kapatıldı:
      onay bekleyen/reddedilmiş adaylarda gönderim linkleri
      görünüyordu.** Tüm aday popup'ları tek bileşende birleştirilirken
      (`candidateDetailDialog`) WhatsApp/e-posta gönderim linkleri ve
      "...olarak işaretle" butonları `c.status`'a hiç bakmadan
      gösteriliyordu - yani Onaylar sayfasındaki (henüz onaylanmamış)
      ya da reddedilmiş bir adayın popup'ında da bu linkler görünüyor,
      sahibi hiç onaylamadan/onay adımını atlayarak gönderebiliyordu.
      Bu, "onay mekanizması zorunlu" kuralının fiilen delinmesiydi.
      **Düzeltme, iki katmanda:**
      1. `apps/dashboard/src/render.ts`: yeni `canSend` kontrolü
         (`c.status !== "pending_approval" && c.status !== "rejected"`)
         - gönderim linkleri artık SADECE onaylanmış (veya
         sent/responded/converted) adaylarda gösteriliyor; onay
         bekleyen/reddedilmiş adayda bunun yerine açıklayıcı bir not
         var.
      2. `apps/control/src/routes/approvals.ts` `handleMarkSent`: arayüz
         atlanıp doğrudan API'ye istek atılsa bile, aday
         `pending_approval`/`rejected` durumundaysa artık 409 ile
         reddediyor - server tarafında ikinci savunma katmanı.
      `docs/architecture.md` da bu iki katmanı ve GÜNCEL veri akışını
      (manuel wa.me/mailto gönderimi, `CONTROL_SHARED_SECRET`,
      `settings` tablosu) yansıtacak şekilde baştan yazıldı - önceden
      hâlâ eski otomatik kuyruk tabanlı gönderim akışını "canlı mimari"
      olarak anlatıyordu.
- [x] **Ayarlar sayfasına ihtiyaç türü bazlı ayrı şablonlar eklendi.**
      Sahibi "yeni web sitesi için metin düzeltmesi var ama web sitesi
      yenileme kısmında düzelmiyor" diye bildirdi - sebebi, Ayarlar
      sayfasında TEK bir genel şablon olması, "yeni site" ve "site
      yenileme" için ayrı düzenlenebilir bir yer hiç olmamasıydı.
      **Düzeltme:** `AppSettings`'e `proposalTemplateWebsiteNew` ve
      `proposalTemplateWebsiteRedesign` eklendi (`apps/control/src/lib/settings.ts`)
      - `templateProposal()` artık adayın ihtiyaç etiketine göre önce
      bu ikisinden uygun olanı arıyor, boşsa genel `proposalTemplate`'e
      düşüyor (`apps/control/src/lib/proposal.ts`). Ayarlar sayfasında
      artık 3 ayrı şablon kutusu var: Genel, "Yeni web sitesi", "Web
      sitesi yenileme". `settings` tablosu zaten key/value olduğu için
      YENİ MİGRATION GEREKMİYOR - sadece kod deploy'u yeterli.
- [x] **Takip hatırlatıcısı + CSV dışa aktarma + Rapor sayfası eklendi
      (kod hazır, CANLIYA ALMADAN ÖNCE D1 MIGRATION UYGULANMALI - yeni
      `follow_up_date` sütunu, `migrations/0003_followup.sql`):**
      1. **Takip hatırlatıcısı.** Aday popup'ındaki not alanının yanına
         bir "tekrar arama/takip tarihi" (`<input type="date">`) eklendi
         - `candidates.follow_up_date` (`YYYY-MM-DD`) sütunu,
         `POST /candidates/:id/notes` artık `followUpDate`'i de kabul
         ediyor (boş string gönderilirse temizlenir). Yeni **"Takip"**
         sayfası (`/takip`) takip tarihi eklenmiş TÜM adayları
         (durumdan bağımsız) tarihe göre sıralı listeliyor -
         gecikmiş/bugünkü kırmızı/sarı rozetle öne çıkıyor. Sol menüdeki
         "Takip" rozeti, bugüne kadar (dahil) tarihi gelmiş aday
         sayısını gösteriyor (`apps/control` `handleStats` artık
         `counts.follow_up_due` de döndürüyor - ekstra round-trip
         gerekmesin diye `/stats`'a eklendi, ayrı endpoint değil).
      2. **CSV dışa aktarma.** "Tüm Adaylar" sayfasına, o an uygulanan
         filtrelerle (sektör/şehir/ihtiyaç/isim) birebir eşleşen bir
         "Bu listeyi CSV indir" linki eklendi
         (`GET /adaylar/export.csv?...`, `apps/dashboard/src/index.ts`).
         UTF-8 BOM ekleniyor (Excel/Windows'ta Türkçe karakterler
         BOM'suz bozulabiliyor). Sütunlar: Ad, Sektör, Şehir, Kaynak,
         Durum, İhtiyaçlar, Web Sitesi, Telefon, WhatsApp, E-posta,
         Keşfedilme Tarihi, Not, Takip Tarihi.
      3. **Rapor sayfası (`/rapor`).** Yeni `apps/control`
         `GET /report` endpoint'i (`routes/reports.ts`), D1'de
         `GROUP BY` ile sektör/şehir/durum kırılımlarını hesaplıyor
         (tüm `candidates` tablosunu worker'a çekmiyor). Dashboard'da:
         - **Dönüşüm hunisi**: Toplam bulunan → Onaylanan → Gönderilen →
           Yanıtlayan → Müşteriye dönüşen, her aşama toplamın yüzdesiyle.
         - **Sektöre/şehre göre dağılım**: basit CSS çubuk grafikler
           (harici kütüphane yok, mevcut renk sistemiyle tutarlı).
      **Deploy sırası:** `follow_up_date` sütunu olmadan `apps/control`
      deploy edilirse `handleStats`'taki yeni sorgu ("no such column")
      hata verir - `/stats` her sayfada çağrıldığı için TÜM SAYFALAR
      etkilenir. Migration `apps/control` redeploy'undan ÖNCE
      uygulanmalı (bkz. `docs/deployment.md`).
- [x] **"Sistemi daha büyük bir sisteme dönüştürelim" turu - sahibi 20
      fikirlik bir liste verdi, dış hesap/karar gerektirmeyen 8'i bu
      oturumda kodlandı (kod hazır, CANLIYA ALMADAN ÖNCE D1 MIGRATION
      UYGULANMALI - `migrations/0004_activity_tags_blacklist.sql`):**
      1. **Aday zaman çizelgesi.** Yeni `activity_log` tablosu -
         onay/red/toplu onay/toplu red/not-takip-etiket güncelleme/teklif
         düzenleme/AI ile yeniden yazma/gönderildi işaretleme HER
         AKSİYONDA otomatik satır ekliyor (`apps/control/src/lib/activity.ts`
         `logActivity`, tüm `routes/approvals.ts`+`routes/candidates.ts`
         mutasyon noktalarına eklendi). Dashboard'da popup'a **"Geçmişi
         Göster"** butonu eklendi - her popup açılışında otomatik
         çekilmiyor (gereksiz yük olmasın diye), butona basınca `fetch()`
         ile lazy-load ediliyor (`GET /candidates/:id/activity`).
      2. **Serbest etiketleme.** `candidates.tags` (string[] JSON) -
         need tag'lerden bağımsız, sahibinin kendi etiketleri ("sıcak
         lead" vb.). Popup'taki not formuna virgülle ayrılmış bir
         "Etiketler" kutusu eklendi, kartlarda mor pill olarak
         gösteriliyor.
      3. **Toplu red.** `handleBulkApprove`'un aynısı (`handleBulkReject`,
         `POST /candidates/bulk-reject`) - dashboard'daki toplu onay
         çubuğunda AYNI form, `formaction="/bulk-reject"` olan ikinci bir
         buton (`data-bulk-reject`) - JS `confirm()` ile onay istiyor
         (red geri alması onaydan daha maliyetli bir hata olduğu için).
      4. **Tek dokunuşlu hızlı aksiyonlar.** Not kutusunun üstüne
         "İlgilenmiyor" / "Meşgul, sonra ara" / "Ulaşılamadı" butonları -
         tıklanınca kutuyu doldurup formu doğrudan gönderiyor (tek
         tıkla kaydediliyor).
      5. **Tarama ilerleme göstergesi.** `scan_progress` tablosu
         önceden şemada vardı ama HİÇ KULLANILMIYORDU - artık
         `google-search-scanner` her taramadan sonra "nerede kaldım"
         bilgisini `POST /scan-progress`'e (yeni,
         `apps/control/src/routes/scan-progress.ts`,
         `x-scan-secret` ile korunuyor) bildiriyor. Rapor sayfasında
         "sektör × şehir turunun %kaçı tarandı" çubuğu olarak gösteriliyor.
      6. **Günlük özet e-postası.** `apps/control`'e YENİ BİR
         `scheduled()` handler'ı + cron tetikleyicisi eklendi
         (`wrangler.toml` `[triggers] crons = ["0 6 * * *"]` - 09:00
         İstanbul, Türkiye UTC+3 sabit/yaz saati yok). Her gün "Onay
         bekleyen X, son 24 saatte bulunan Y, bugüne kadar takip
         tarihi gelen Z" özetini `EMAIL_WORKER`/`ALERT_EMAIL` üzerinden
         gönderiyor (`apps/control/src/lib/digest.ts`) - sessiz arıza
         bildirimleriyle AYNI altyapı, ek kimlik bilgisi gerekmedi.
      7. **Randevu linki ayarı.** Ayarlar sayfasına `meetingLink` alanı
         eklendi - şablonlarda `{{randevu}}` yer tutucusu, AI'a da
         context olarak veriliyor ("uygunsa mesaja doğal dahil et").
         Calendly hesabı YOK - sahibi isterse kendi linkini buraya
         yapıştırır, sistem sadece yer tutucuyu destekliyor.
      8. **"Bir daha iletişime geçme" (kara liste).** `candidates.do_not_contact`
         boolean - popup'ta bir onay kutusu. `true` ise dashboard
         gönderim linklerini/aksiyonlarını kalıcı olarak gizliyor
         (`canSend` kontrolüne eklendi), `handleMarkSent` de server
         tarafında bunu reddediyor (409). **KVKK NOTU:** bu SADECE
         "bir daha arama" işaretidir - otomatik veri silme/saklama
         süresi mekanizması BİLİNÇLİ OLARAK yapılmadı (gerçek iş
         verisini geri dönüşü olmayan şekilde silmek, sahibinin açık
         onayı olmadan alınacak bir karar değil) - istenirse ayrı bir
         adım olarak eklenebilir.
      **Deploy sırası:** `activity_log` tablosu, `candidates.tags`,
      `candidates.do_not_contact` sütunları olmadan `apps/control`
      deploy edilirse aday oluşturma/onaylama/not güncelleme gibi HER
      mutasyon ("no such table"/"no such column") hata verir. Migration
      MUTLAKA `apps/control` redeploy'undan ÖNCE canlı D1'e uygulanmalı.
      **KOD GEREKTİRMEYEN AMA DIŞ HESAP/SAHİBİN KARARI GEREKTİREN**
      (bu oturumda yapılmadı, sırayla): `yahoo-search-scanner`'ı gerçek
      API'ye bağlamak (API anahtarı/yöntem kararı), "yakında bitecek
      domain" taraması (WHOIS/domain veri kaynağı seçimi), sosyal
      dinleme/forum taraması (kaynak seçimi + kazıma yöntemi), AI
      "neden şimdi" sinyal motoru (Places API review alanı + NVIDIA -
      teknik olarak mevcut altyapıyla mümkün, ayrı bir oturumda
      yapılabilir), PDF/görsel teklif (mailto: linkleri DOSYA EKİ
      DESTEKLEMİYOR - bunun yerine hosted bir "teklif sayfası" linki
      daha gerçekçi bir yaklaşım), çoklu kullanıcı (Basic Auth'tan
      gerçek bir auth sistemine geçiş - mimari değişiklik), harita
      görünümü (TR coğrafi veri seti gerekiyor), basit müşteri
      portalı (yeni bir public erişim/kimlik modeli), referans/vaka
      galerisi (sahibinin GERÇEK geçmiş işlerinin içeriği gerekiyor -
      uydurulamaz), PWA (manifest + service worker, ayrı bir kapsam),
      sesli arama modülünü gerçek AI'a çevirmek (telefoni + ses AI
      sağlayıcısı gerekiyor - en büyük, en pahalı kalem).
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
