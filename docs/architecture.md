# Mimari

Proje kararlarının tam metni için `../CLAUDE.md` dosyasına bakın. Bu belge
sadece teknik akışı özetler.

## Veri akışı (GÜNCEL - gönderim manuel)

```
                 ┌─────────────────────────────┐
                 │   Tarama worker'ları          │
                 │  (her kanal = ayrı Worker)    │
                 │                              │
                 │  google-search-scanner (aktif) │
                 │  company-formation-tracker    │
                 │            (aktif)            │
                 │  yahoo-search-scanner (pasif)  │
                 │  linkedin-scanner     (pasif)  │
                 │  tiktok-scanner       (pasif)  │
                 │  instagram-scanner    (pasif)  │
                 │  tender-site-scanner  (pasif)  │
                 │  freelancer-gallery-scanner    │
                 │              (pasif)           │
                 └───────────────┬──────────────┘
                                 │ POST /scan-results
                                 │ (header: x-scan-secret)
                                 ▼
                 ┌─────────────────────────────────────┐
                 │           apps/control                 │
                 │  - dedup (placeId, yoksa isim+sektör+   │
                 │    kaynak+şehir)                         │
                 │  - loadSettings() -> settings tablosu    │
                 │    (proposal şablonu/AI promptu/AI aç-   │
                 │    kapat/model - Ayarlar sayfasından)    │
                 │  - draftProposal() -> NVIDIA ya da şablon │
                 │  - status: pending_approval               │
                 │  - MERKEZİ D1 (packages/db)               │
                 │  - workers_dev = false (genel internetten │
                 │    erişilemez - SADECE service binding)   │
                 └───────────────┬───────────────────────┘
                                 │ TÜM istekler (health/scan-results/
                                 │ alerts hariç) header: x-control-secret
                                 │ (CONTROL_SHARED_SECRET) zorunlu
                                 ▼
                 ┌─────────────────────────────────────┐
                 │           apps/dashboard               │
                 │  - Basic Auth ile korunur (geçici -    │
                 │    bkz. CLAUDE.md sonraki adımlar)     │
                 │  - Onaylar / Onaylananlar / Gönderilenler│
                 │    / Tüm Adaylar / Ayarlar sayfaları    │
                 └───────────────┬───────────────────────┘
                                 │ sahibi "Onayla"ya basar
                                 │ (POST /candidates/:id/approve)
                                 ▼
                     status: pending_approval -> approved
                     (OUTREACH_QUEUE'ya HİÇBİR ŞEY konmaz)
                                 │
                                 │ sahibi Onaylananlar/Tüm Adaylar'da
                                 │ adayı açar - artık popup'ta wa.me /
                                 │ mailto: linkleri GÖRÜNÜR (bkz. altta)
                                 ▼
                 ┌─────────────────────────────────────┐
                 │  Sahibinin KENDİ WhatsApp/e-posta       │
                 │  hesabı (tarayıcı/uygulama)             │
                 │  - wa.me/90...?text=...                  │
                 │  - mailto:...?subject=...&body=...       │
                 │  Sistem bu mesajları KENDİ API'siyle      │
                 │  GÖNDERMEZ - sadece linki hazırlar.       │
                 └───────────────┬───────────────────────┘
                                 │ sahibi gönderdikten sonra
                                 │ "...olarak işaretle"e basar
                                 │ (POST /candidates/:id/mark-sent)
                                 ▼
                     status: approved -> sent
                     communication_log'a "sent" kaydı düşer
```

**ESKİ (artık ÇALIŞMAYAN) yol - koddan silinmedi:** `apps/control`'ün
`queue()` handler'ı ve `workers/channels/{whatsapp,email,voice-call}`
worker'ları hâlâ kodda duruyor (`OUTREACH_SHARED_SECRET` ile korunuyor,
`x-outreach-secret` header'ı zorunlu). Bunlar önceden `handleApprove`
tarafından `OUTREACH_QUEUE`'ya iş konularak otomatik tetikleniyordu; artık
`handleApprove` kuyruğa hiçbir şey koymuyor, bu yüzden bu worker'lar
pratikte hiç çağrılmıyor. Sadece `wrangler.toml`'daki
`[[queues.consumers]]` tanımının geçerli kalması (consumer'sız deploy
edilemiyor) ve ileride otomatik gönderime dönülmek istenirse hazır
durması için tutuluyor - bkz. CLAUDE.md "Gönderim otomatikten manuele
çevrildi".

## Güvenlik sınırları (shared secret'lar)

Üç ayrı paylaşılan sır, üç ayrı güven sınırını korur - hiçbiri diğerinin
yerine geçmez:

| Secret | Kim -> Kime | Header | Amaç |
|---|---|---|---|
| `SCAN_SHARED_SECRET` | Tarama worker'ları -> `apps/control` | `x-scan-secret` | Sadece gerçek tarayıcılar `/scan-results` ve `/alerts`'e yazabilsin |
| `CONTROL_SHARED_SECRET` | `apps/dashboard` -> `apps/control` | `x-control-secret` | `/candidates`, `/stats`, onay/red/düzenleme gibi TÜM aday uç noktaları sadece dashboard'dan erişilsin - `apps/control`'ün kendi `*.workers.dev` adresi `workers_dev = false` ile de kapalı, bu ikinci savunma katmanı |
| `OUTREACH_SHARED_SECRET` | `apps/control` -> kanal worker'ları (whatsapp/email/voice-call) | `x-outreach-secret` | Şu an pratikte tetiklenmiyor (yukarıdaki "ESKİ yol"a bkz.) ama worker'lar hâlâ bu kontrolü yapıyor |

Her üçünde de ortak kural: **secret set edilmemişse (env değeri
`undefined`) istek HER ZAMAN reddedilir**, asla "boş == boş" eşleşmesiyle
sessizce izin verilmez (bu, bir güvenlik denetiminde bulunup düzeltilen
gerçek bir hataydı - bkz. CLAUDE.md).

## Neden onay her zaman zorunlu

İki bağımsız katmanda uygulanıyor:

1. **`apps/control/src/routes/approvals.ts`**: `handleApprove` DIŞINDA
   hiçbir kod yolu bir adayı `pending_approval`'dan çıkarmaz.
   `handleMarkSent`, aday `pending_approval` ya da `rejected`
   durumundaysa 409 ile reddeder - yani bir aday ONAYLANMADAN
   "gönderildi" olarak işaretlenemez (API'ye doğrudan istek atılsa
   bile).
2. **`apps/dashboard/src/render.ts`**: `candidateDetailDialog` içindeki
   WhatsApp/e-posta gönderim linkleri ve "...olarak işaretle" butonları
   SADECE `c.status` `pending_approval`/`rejected` DEĞİLKEN gösterilir
   (`canSend`) - onay bekleyen bir adayın popup'ında gönderim linki hiç
   görünmez.

Yeni bir kanal veya worker eklerken bu iki katman da korunmalı: bir aday
`pending_approval` durumundan `approved` durumuna SADECE sahibinin (veya
onun yetkilendirdiği bir kullanıcının) açık isteğiyle geçmeli, ve
gönderim arayüzü/uç noktaları bu geçiş olmadan hiçbir şeyi mümkün
kılmamalı.

## Ayarlar (kod deploy etmeden değişen davranış)

`apps/control/src/lib/settings.ts` (`loadSettings`/`updateSettings`),
D1'deki `settings` tablosunu (key/value) okur/yazar. Şu an kapsadığı
davranışlar: teklif şablonu metni, NVIDIA sistem promptu, AI aç/kapat,
AI model override. `apps/dashboard`'daki `/ayarlar` sayfası bunun
arayüzü. **KASITLI OLARAK burada olmayan:** API anahtarları/secret'lar -
onlar Cloudflare secret olarak kalır, D1'de düz metin tutulmaz.

## Yeni bir tarama kanalı eklemek

1. `workers/<kanal-adi>/` altında yeni bir Cloudflare Worker oluştur
   (mevcut `google-search-scanner` veya `company-formation-tracker`
   yapısını örnek al).
2. Kanalın kendi `scan.ts` dosyasında gerçek kaynağa özel mantığı yaz,
   sonucu `ScanResult[]` tipine dönüştür (`packages/shared/src/types.ts`).
3. `POST /scan-results` ile control API'ye gönder (`x-scan-secret`
   header'ı ile - `apps/control`'daki `SCAN_SHARED_SECRET` ile AYNI
   değer).
4. `packages/shared/src/types.ts` içindeki `SOURCE_CHANNELS` listesine
   kanalı ekle.
5. `packages/shared/src/config.ts` içindeki `activeSourceChannels`'a
   eklenene kadar kanal "kurulu ama pasif" sayılır.

## Yeni bir (manuel) gönderim kanalı eklemek

Gönderim artık manuel olduğu için (bkz. yukarıdaki veri akışı), yeni bir
kanal eklemek bir service binding/queue kaydı DEĞİL, dashboard'a yeni bir
link üretici eklemek demektir:

1. `apps/dashboard/src/render.ts`'e `waLink`/`mailtoLink`'e benzer yeni
   bir `<kanal>Link(c, text)` fonksiyonu ekle (adayın ilgili iletişim
   alanından bir dış link/URI üretir).
2. `candidateDetailDialog`'daki `send-actions` bloğuna, `canSend`
   kontrolü altında yeni linki ekle.
3. `packages/shared/src/types.ts` içindeki `OUTREACH_CHANNELS`'a yeni
   kanalı ekle, `apps/control`'daki `handleMarkSent`'in kabul ettiği
   `channel` değerlerine dahil et.

`workers/channels/voice-call` ESKİ (otomatik/queue tabanlı) deseni
gösteren, şu an kullanılmayan bir örnek - eğer ileride otomatik
gönderime dönülmek istenirse (sesli arama gibi wa.me/mailto ile
yapılamayan bir kanal için kaçınılmaz), o worker'ı `apps/control`'a
service binding olarak bağlamak ve `handleApprove`'u tekrar
`OUTREACH_QUEUE.send()` çağıracak şekilde değiştirmek gerekir.
