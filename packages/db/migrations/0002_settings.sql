-- Musteri Avcisi Sistemi - duzenlenebilir ayarlar tablosu
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0002_settings.sql
--
-- Basit key/value tablosu - Ayarlar sayfasindan degistirilebilen degerler
-- (NVIDIA API anahtari, model adi, uyari e-postasi, teklif sablonu, AI
-- sistem talimati) burada tutulur. Bos deger yerine SATIRIN OLMAMASI
-- "varsayilana don" anlamina gelir (bkz. apps/control/src/lib/settings.ts).

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
