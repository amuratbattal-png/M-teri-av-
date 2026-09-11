-- Muşteri Avcısı Sistemi - takip hatırlatıcısı için follow_up_date sütunu
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0003_followup.sql

ALTER TABLE candidates ADD COLUMN follow_up_date TEXT;
