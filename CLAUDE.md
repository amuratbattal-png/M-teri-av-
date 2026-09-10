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
      (bkz. git log, "Revert" commit'leri). **Sıradaki adım:** eski,
      sorunlu projeyi hiç kullanmadan **sıfırdan yeni bir Google Cloud
      projesi** açıp Custom Search API'yi orada baştan kurmak (100%
      ücretsiz, günde 100 sorgu kotası yeterli). Sistem bunu zarif
      karşılıyor - web arama hata verse bile Maps sonuçları
      etkilenmeden kaydediliyor (`workers/google-search-scanner/src/scan.ts`).
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
- [ ] WhatsApp Business API kimlik bilgileri eklenecek
      (`workers/channels/whatsapp`).
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
