# Yol Haritası

## Faz 0 — İskelet (tamamlandı)

- Monorepo yapısı, merkezi DB şeması, control API, onay akışı.
- Onay paneli (`apps/dashboard`, Basic Auth korumalı).
- 8 tarama worker'ı: `google-search-scanner`, `company-formation-tracker`
  (Faz 1'de aktif), `yahoo-search-scanner`, `linkedin-scanner`,
  `tiktok-scanner`, `instagram-scanner`, `tender-site-scanner`,
  `freelancer-gallery-scanner` (hepsi kurulu, başlangıçta pasif).
- 3 gönderim kanalı: `whatsapp`, `email` (aktif iskelet), `voice-call`
  (mimaride hazır, feature-flag ile pasif).
- `wordpress-agent` iskeleti (pasif, kapsam netleşmedi).
- Tüm paketler `tsc --noEmit` ile hatasız derleniyor.

## Faz 1 — Türkiye pazarı, ilk canlı kanallar

- [ ] Cloudflare hesabında D1 veritabanı + her worker için KV namespace
      oluşturulup ID'ler `wrangler.toml` dosyalarına yazılacak.
- [ ] `google-search-scanner` gerçek bir arama/yerel işletme API'sine
      bağlanacak (Google Places API veya SerpApi gibi bir sağlayıcı).
- [ ] WhatsApp Business Cloud API ve bir e-posta sağlayıcı (Resend/
      Postmark) kimlik bilgileri eklenecek.
- [ ] `apps/dashboard` için Cloudflare Access (Zero Trust) kurulacak -
      Basic Auth sadece geçici bir önlem.
- [ ] `company-formation-tracker` için gerçek "yeni şirket kuruluşu"
      kaynağı (Ticaret Sicili Gazetesi ilanları vb.) bağlanacak.

## Faz 1.x — Ek tarama kanalları (iskeleti hazır, sırayla tek tek aktifleştirilecek)

- [ ] `linkedin-scanner` - sahibinin KENDİ profiline gerçek erişimi olan
      bir entegrasyon (yerel bilgisayardaki bir yapay zeka değil).
- [ ] `tiktok-scanner`, `instagram-scanner` - hashtag/anahtar kelime
      takibi.
- [ ] `tender-site-scanner` - hedef ihale site(leri) belirlenip kazıma
      mantığı yazılacak.
- [ ] `freelancer-gallery-scanner` - herkese açık galeri sayfalarından
      firma adı tespiti + Google üzerinden iletişim bilgisi arama (gizli
      kullanıcı bilgisi ÇEKİLMEYECEK, bkz. CLAUDE.md).
- [ ] `yahoo-search-scanner` - Google'a ek arama motoru kaynağı.
- [ ] Her kanal aktifleştikçe `packages/shared/src/config.ts`
      `activeSourceChannels` listesine eklenecek.

## WordPress ajanı (kapsam netleştirme bekliyor)

- [ ] Hangi siteler (kendi 3 sitesi mi, müşteri siteleri mi, ikisi de mi)
      ve hangi işlemler (içerik güncelleme, SEO meta, eklenti yönetimi)
      netleştirilecek.
- [ ] `workers/wordpress-agent/src/wp-client.ts` içine gerçek metodlar
      eklenecek, `WORDPRESS_AGENT_ENABLED` aktif edilecek.

## Faz 2 — Avrupa'ya genişleme

- [ ] `country` alanı TR dışına açılacak, sektör listesi ve dil desteği
      genişletilecek.

## Ayrı / bağımsız proje (bu repo kapsamında değil)

- SEO puanlama/yükseltme motoru (`ajansimiz.net`) - kendi 3 site için,
  müşteri avcısı sisteminden bağımsız.
- Sesli arama modülünün aktifleştirilmesi - mimari hazır, sahibi
  istediğinde aktif edilecek (bkz. `docs/architecture.md`).
