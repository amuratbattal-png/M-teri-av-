-- Muşteri Avcısı Sistemi - website_url sütunu + settings tablosu
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0002_website_and_settings.sql

ALTER TABLE candidates ADD COLUMN website_url TEXT;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
