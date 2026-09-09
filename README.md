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
apps/control/                 Merkezi kontrol sistemi (API + onay akışı + dispatch)
packages/db/                   Merkezi D1 şeması (Drizzle ORM)
packages/shared/                Ortak tipler, ihtiyaç etiketleri, sektör listesi
workers/google-search-scanner/  Kanal: Google arama/Maps tarama
workers/company-formation-tracker/  Paralel iş kolu: yeni şirket / iş arayan
workers/channels/whatsapp/       Gönderim: WhatsApp
workers/channels/email/          Gönderim: e-posta
workers/channels/voice-call/     Gönderim: sesli arama (PASİF)
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
