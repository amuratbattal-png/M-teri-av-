# Müşteri Avcısı Sistemi

Otonom müşteri bulma ve teklif gönderme sistemi. Google, LinkedIn, TikTok,
Instagram, ihale siteleri ve freelancer platformları üzerinden potansiyel
müşteri taraması yapar; onaydan geçen teklifleri WhatsApp/e-posta ile
gönderir.

Proje kapsamı, alınan kararlar ve mimari gerekçeler için:
**[`CLAUDE.md`](./CLAUDE.md)** — her yeni oturum önce bunu okumalı.

Teknik akış ve yeni kanal ekleme rehberi: [`docs/architecture.md`](./docs/architecture.md)
Yol haritası: [`docs/roadmap.md`](./docs/roadmap.md)

## Yapı

```
apps/control/                       Merkezi kontrol sistemi (API + onay akışı + dispatch)
apps/dashboard/                      Onay paneli (Basic Auth korumalı)
packages/db/                         Merkezi D1 şeması (Drizzle ORM)
packages/shared/                     Ortak tipler, ihtiyaç etiketleri, sektör/kelime listesi
workers/google-search-scanner/       Kanal: Google arama/Maps tarama (Faz 1 aktif)
workers/yahoo-search-scanner/         Kanal: Yahoo arama (PASİF)
workers/linkedin-scanner/             Kanal: LinkedIn (PASİF)
workers/tiktok-scanner/               Kanal: TikTok (PASİF)
workers/instagram-scanner/            Kanal: Instagram (PASİF)
workers/tender-site-scanner/          Kanal: ihale siteleri (PASİF)
workers/freelancer-gallery-scanner/   Kanal: freelancer galerileri (PASİF)
workers/company-formation-tracker/    Paralel iş kolu: yeni şirket / iş arayan (Faz 1 aktif)
workers/wordpress-agent/              WordPress'e müdahale ajanı (PASİF)
workers/channels/whatsapp/            Gönderim: WhatsApp
workers/channels/email/               Gönderim: e-posta
workers/channels/voice-call/          Gönderim: sesli arama (PASİF)
```

## Geliştirme

```bash
pnpm install
pnpm typecheck   # tüm workspace paketlerini derleme kontrolünden geçirir
```

Her worker kendi dizininde `pnpm dev` (wrangler dev) ile ayrı ayrı
çalıştırılabilir. Gerçek Cloudflare kaynakları (D1, KV, Queues) henüz
oluşturulmadı — her `wrangler.toml` içinde ilgili `REPLACE_WITH_REAL_*`
placeholder'ları var, bkz. `docs/roadmap.md` Faz 1.

## Temel kural: hiçbir şey onaysız gönderilmez

Her aday `pending_approval` durumuna kadar otomatik işlenir, ama gönderim
SADECE `POST /candidates/:id/approve` çağrıldığında tetiklenir. Detay için
`docs/architecture.md#neden-onay-her-zaman-zorunlu`.
