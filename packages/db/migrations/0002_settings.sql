-- Musteri Avcisi Sistemi - duzenlenebilir ayarlar tablosu
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0002_settings.sql
--
-- Basit key/value tablosu - Ayarlar sayfasindan degistirilebilen degerler
-- (NVIDIA API anahtari, model adi, uyari e-postasi, teklif sablonu, AI
-- sistem talimati) burada tutulur. Bos deger yerine SATIRIN OLMAMASI
-- "varsayilana don" anlamina gelir (bkz. apps/control/src/lib/settings.ts).
--
-- NOT: canlidaki (production) settings tablosunda updated_at NOT NULL
-- sutunu, bu satir eklenmeden once de zaten vardi (CREATE TABLE IF NOT
-- EXISTS calistiginda tablo farkli bir semayla mevcuttu, migration hicbir
-- sey degistirmedi - "Ayarlari Kaydet hatasi" olayi, bkz. CLAUDE.md). Bu
-- dosya artik gercekle eslesecek sekilde guncellendi (yeni/temiz bir D1
-- icin) ama zaten var olan tabloyu ETKILEMEZ (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
