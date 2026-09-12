-- Musteri Avcisi Sistemi - "canli log" (Terminal sayfasi)
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0004_activity_log.sql
--
-- AI'in (lead puanlama, teklif yazimi) ve taramanin ne yaptigini gosteren
-- kisa olay kaydi - bkz. apps/control/src/lib/activity-log.ts logActivity,
-- apps/dashboard Terminal sayfasi (renderTerminalPage).

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log (created_at);
