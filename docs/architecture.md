# Mimari

Proje kararlarının tam metni için `../CLAUDE.md` dosyasına bakın. Bu belge
sadece teknik akışı özetler.

## Veri akışı

```
                 ┌─────────────────────────────┐
                 │   Tarama worker'ları          │
                 │  (her kanal = ayrı Worker)    │
                 │                              │
                 │  google-search-scanner        │
                 │  company-formation-tracker    │
                 │  [linkedin]  (henüz yok)       │
                 │  [tiktok]    (henüz yok)       │
                 │  [instagram] (henüz yok)       │
                 │  [tender-site] (henüz yok)     │
                 │  [freelancer-gallery] (henüz yok)│
                 └───────────────┬──────────────┘
                                 │ POST /scan-results
                                 │ (x-scan-secret ile)
                                 ▼
                 ┌─────────────────────────────┐
                 │      apps/control             │
                 │  - dedup + evaluate            │
                 │  - proposal draft üretir        │
                 │  - status: pending_approval     │
                 │  - MERKEZI D1 (packages/db)     │
                 └───────────────┬──────────────┘
                                 │ sahibi onaylar
                                 │ POST /candidates/:id/approve
                                 ▼
                 ┌─────────────────────────────┐
                 │   OUTREACH_QUEUE (Cloudflare  │
                 │   Queues)                     │
                 └───────────────┬──────────────┘
                                 │ queue() consumer
                                 ▼
                 ┌─────────────────────────────┐
                 │  Kanal worker'ları (service    │
                 │  binding ile çağrılır)         │
                 │   - workers/channels/whatsapp  │
                 │   - workers/channels/email     │
                 │   - workers/channels/voice-call │
                 │     (PASİF - feature flag)      │
                 └─────────────────────────────┘
```

## Neden onay her zaman zorunlu

`apps/control/src/routes/approvals.ts` içindeki `handleApprove` DIŞINDA
hiçbir kod yolu `OUTREACH_QUEUE.send()` çağırmaz. Yeni bir kanal veya
worker eklerken bu kural bozulmamalı: bir aday `pending_approval`
durumundan `approved` durumuna SADECE sahibinin (veya onun yetkilendirdiği
bir kullanıcının) açık isteğiyle geçer.

## Yeni bir tarama kanalı eklemek

1. `workers/<kanal-adi>/` altında yeni bir Cloudflare Worker oluştur
   (mevcut `google-search-scanner` veya `company-formation-tracker`
   yapısını örnek al).
2. Kanalın kendi `scan.ts` dosyasında gerçek kaynağa özel mantığı yaz,
   sonucu `ScanResult[]` tipine dönüştür (`packages/shared/src/types.ts`).
3. `POST /scan-results` ile control API'ye gönder.
4. `packages/shared/src/types.ts` içindeki `SOURCE_CHANNELS` listesine
   kanalı ekle.
5. `packages/shared/src/config.ts` içindeki `activeSourceChannels`'a
   eklenene kadar kanal "kurulu ama pasif" sayılır.

## Yeni bir gönderim kanalı eklemek

`workers/channels/voice-call` şu an bunun canlı bir örneği: worker hazır,
ama `apps/control`'a service binding olarak bağlanmadı ve `queue()`
içindeki kanal seçimine dahil edilmedi. Aktifleştirme adımları o worker'ın
`wrangler.toml` yorumunda yazılı.
