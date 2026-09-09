# Yol Haritası

## Faz 0 — İskelet (tamamlandı, bu commit)

- Monorepo yapısı, merkezi DB şeması, control API, onay akışı, 2 tarama
  worker'ı (stub), 2 gönderim kanalı (stub) + 1 pasif kanal.

## Faz 1 — Türkiye pazarı, ilk canlı kanallar

- [ ] Cloudflare hesabında D1 veritabanı + KV namespace oluşturulup ID'ler
      `wrangler.toml` dosyalarına yazılacak.
- [ ] `google-search-scanner` gerçek bir arama/yerel işletme API'sine
      bağlanacak (Google Places API veya SerpApi gibi bir sağlayıcı).
- [ ] WhatsApp Business Cloud API ve bir e-posta sağlayıcı (Resend/
      Postmark) kimlik bilgileri eklenecek.
- [ ] Basit bir onay arayüzü (dashboard) - şimdilik `GET /candidates?
      status=pending_approval` + `POST /candidates/:id/approve` API'si
      var, arayüz yok.
- [ ] `company-formation-tracker` için gerçek "yeni şirket kuruluşu"
      kaynağı (Ticaret Sicili Gazetesi ilanları vb.) bağlanacak.

## Faz 1.x — Ek tarama kanalları (sırayla, tek tek aktifleştirilecek)

- [ ] `linkedin` - sahibinin KENDİ profiline gerçek erişimi olan bir
      entegrasyon (yerel bilgisayardaki bir yapay zeka değil).
- [ ] `tiktok`, `instagram` - hashtag/anahtar kelime takibi.
- [ ] `tender_site` - ihale siteleri.
- [ ] `freelancer_gallery` - herkese açık galeri sayfalarından firma adı
      tespiti + Google üzerinden iletişim bilgisi arama (gizli kullanıcı
      bilgisi ÇEKİLMEYECEK, bkz. CLAUDE.md).
- [ ] `yahoo_search` - Google'a ek arama motoru kaynağı.

## Faz 2 — Avrupa'ya genişleme

- [ ] `country` alanı TR dışına açılacak, sektör listesi ve dil desteği
      genişletilecek.

## Ayrı / bağımsız proje (bu repo kapsamında değil)

- SEO puanlama/yükseltme motoru (`ajansimiz.net`) - kendi 3 site için,
  müşteri avcısı sisteminden bağımsız.
- Sesli arama modülünün aktifleştirilmesi - mimari hazır, sahibi
  istediğinde aktif edilecek (bkz. `docs/architecture.md`).
