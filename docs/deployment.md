# İlk Kurulum (kendi bilgisayarından)

Bu adımları kendi terminalinde, projeyi klonladığın dizinde çalıştır.
Sırayı takip et — bazı adımların çıktısı (ID'ler, URL'ler) sonraki
adımlarda kullanılıyor.

## 0. Hazırlık

```bash
git clone https://github.com/amuratbattal-png/M-teri-av-.git
cd M-teri-av-
git checkout claude/musteri-avcisi-sistemi-a94is2   # ya da PR merge olduysa main
pnpm install
```

Cloudflare'e giriş yap (ikisinden biri):

```bash
npx wrangler login          # tarayıcı açılır, Cloudflare hesabınla giriş yap
# YA DA, bir API token'ın varsa (bkz. README - API Token Oluşturma):
export CLOUDFLARE_API_TOKEN="cf..."   # bu terminal oturumu için geçerli
```

## 1. D1 veritabanını oluştur

```bash
cd apps/control
pnpm exec wrangler d1 create musteri-avcisi-db
```

Çıktıda `database_id = "xxxxxxxx-xxxx-..."` şeklinde bir satır göreceksin.
Bu ID'yi kopyala, `apps/control/wrangler.toml` içindeki
`database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"` satırını onunla
değiştir.

Şemayı uygula:

```bash
pnpm exec wrangler d1 execute musteri-avcisi-db --remote \
  --file=../../packages/db/migrations/0001_init.sql
```

**Sonradan eklenen her migration için de bunu tekrarla** (`packages/db/migrations/`
klasöründeki dosya adı sırasına göre, en son `0002_settings.sql` var - Ayarlar
sayfasının kullandığı `settings` tablosu). `apps/control`'ü deploy etmeden
ÖNCE ilgili migration'ı uygulamamak, `schema.ts`'de olup D1'de olmayan bir
sütun/tabloya erişilince "D1_ERROR: no such column/table" ile worker'ın
tamamen çökmesine yol açar (bir kere başımıza geldi - bkz. CLAUDE.md
"follow_up_date" notu):

```bash
pnpm exec wrangler d1 execute musteri-avcisi-db --remote \
  --file=../../packages/db/migrations/0002_settings.sql
```

## 2. Outreach kuyruğunu oluştur

```bash
pnpm exec wrangler queues create musteri-avcisi-outreach
```

(`apps/control/wrangler.toml` içinde isim zaten doğru tanımlı, ek bir ID
girmen gerekmiyor.)

## 3. Tarama worker'ları için KV namespace'leri oluştur

Aşağıdaki 5 worker'ın her biri kendi tarama ilerlemesini (cursor) bir KV
namespace'te tutuyor. Her biri için:

```bash
cd ../../workers/google-search-scanner
pnpm exec wrangler kv namespace create SCAN_STATE
```

Çıktıdaki `id = "xxxx"` değerini o worker'ın `wrangler.toml` dosyasındaki
`id = "REPLACE_WITH_REAL_KV_NAMESPACE_ID"` satırına yaz. Aynısını şu
worker'lar için tekrarla:

- `workers/google-search-scanner`
- `workers/yahoo-search-scanner`
- `workers/linkedin-scanner`
- `workers/tiktok-scanner`
- `workers/instagram-scanner`

(`company-formation-tracker`, `tender-site-scanner`,
`freelancer-gallery-scanner` KV kullanmıyor, bu adımı atla.)

## 4. Paylaşılan gizli anahtarı (SCAN_SHARED_SECRET) oluştur

Bu, tarama worker'larının control API'ye yazarken kullandığı ortak parola.
Rastgele bir değer üret:

```bash
openssl rand -hex 32
# openssl yoksa: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Çıkan değeri kopyala, aşağıdaki HER dizinde aynı değeri gir (her komut
`wrangler secret put SCAN_SHARED_SECRET` çalıştırıp değeri soracak,
kopyaladığın değeri yapıştır ve Enter'a bas):

```bash
cd ../../apps/control                         && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../../workers/google-search-scanner        && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../yahoo-search-scanner                    && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../linkedin-scanner                        && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../tiktok-scanner                          && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../instagram-scanner                       && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../tender-site-scanner                     && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../freelancer-gallery-scanner              && pnpm exec wrangler secret put SCAN_SHARED_SECRET
cd ../company-formation-tracker               && pnpm exec wrangler secret put SCAN_SHARED_SECRET
```

## 5. Dashboard şifresini ayarla

```bash
cd ../../apps/dashboard
pnpm exec wrangler secret put DASHBOARD_PASSWORD
# istediğin bir şifre gir (DASHBOARD_USERNAME varsayılan "admin" -
# değiştirmek istersen apps/dashboard/wrangler.toml içindeki
# DASHBOARD_USERNAME satırını düzenle)
```

## 6. Deploy sırası

Sırayı takip et - control ve dashboard, diğer worker'lara "service
binding" ile bağlı, o yüzden önce onlar deploy edilmeli.

```bash
# 6a. Gönderim kanalları önce (control bunlara bağlanıyor)
cd ../../workers/channels/whatsapp   && pnpm exec wrangler deploy
cd ../email                          && pnpm exec wrangler deploy

# 6b. Merkezi kontrol sistemi
cd ../../../apps/control             && pnpm exec wrangler deploy
```

```bash
# 6c. Dashboard
cd ../dashboard && pnpm exec wrangler deploy
```

## 7. Tarama worker'larını deploy et

Tarama worker'ları control'e **service binding** ile bağlanır (düz URL
`fetch()` ile değil - workers.dev üzerinde worker-to-worker istekler
Cloudflare tarafından "error 1042" ile engelleniyor). Bu binding
`wrangler.toml` içinde `musteri-avcisi-control` ismiyle zaten tanımlı,
ekstra bir URL/ID girmen gerekmiyor - sadece control'ün deploy edilmiş
olması yeterli (adım 6b'de yaptın).

Faz 1'de aktif olan iki worker'ı deploy et:

```bash
cd ../../workers/google-search-scanner && pnpm exec wrangler deploy
cd ../company-formation-tracker        && pnpm exec wrangler deploy
```

Diğer worker'ları (yahoo, linkedin, tiktok, instagram, tender-site,
freelancer-gallery, voice-call, wordpress-agent) şimdi deploy etsen de
sorun olmaz - gerçek API anahtarı/kimlik bilgisi girilene kadar sahte
veri üretmeden boş sonuç döner ya da (voice-call/wordpress-agent için)
`501 disabled` döner.

## 8. Değişiklikleri commit'le

`wrangler.toml` dosyalarına yazdığın gerçek `database_id` ve KV `id`
değerlerini commit'leyip PR'a push et (bu ID'ler hassas değil, sadece
kaynak referansı):

```bash
cd ../../..   # repo köküne dön
git add -A
git commit -m "Cloudflare kaynak ID'lerini gerçek değerlerle doldur"
git push
```

## 9. Doğrula

```bash
curl https://musteri-avcisi-control.<SENIN-SUBDOMAIN>.workers.dev/health
# {"ok":true,"service":"musteri-avcisi-control"}
```

Dashboard'a tarayıcıdan git: `https://musteri-avcisi-dashboard.<SENIN-SUBDOMAIN>.workers.dev`
(Basic Auth ile `admin` / az önce belirlediğin şifre).

## Sırada ne var

- `google-search-scanner`'ın gerçek arama yapabilmesi için Google Places
  API anahtarını ekle: `cd workers/google-search-scanner && pnpm exec wrangler secret put SEARCH_API_KEY`
- WhatsApp/e-posta gönderimi için `workers/channels/whatsapp` ve
  `workers/channels/email` altına gerçek sağlayıcı kimlik bilgilerini
  ekle (bkz. `docs/roadmap.md`).
