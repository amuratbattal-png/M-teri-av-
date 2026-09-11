-- Muşteri Avcısı Sistemi - aday zaman çizelgesi, serbest etiketler, kara liste
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0004_activity_tags_blacklist.sql

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id),
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_candidate ON activity_log(candidate_id);

ALTER TABLE candidates ADD COLUMN tags TEXT;
ALTER TABLE candidates ADD COLUMN do_not_contact INTEGER NOT NULL DEFAULT 0;
