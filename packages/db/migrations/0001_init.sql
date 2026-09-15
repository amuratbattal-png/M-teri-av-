-- Muşteri Avcısı Sistemi - ilk şema
-- Uygulama: wrangler d1 execute <DB_NAME> --file=packages/db/migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector_slug TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  source_url TEXT,
  country TEXT NOT NULL DEFAULT 'TR',
  need_tags TEXT NOT NULL DEFAULT '[]',
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_linkedin TEXT,
  discovered_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discovered',
  evaluation_notes TEXT,
  proposal_draft TEXT,
  approved_by TEXT,
  approved_at TEXT,
  sent_at TEXT,
  last_contact_channel TEXT,
  raw_metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_sector ON candidates(sector_slug);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source_channel);

CREATE TABLE IF NOT EXISTS communication_log (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id),
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comm_log_candidate ON communication_log(candidate_id);

CREATE TABLE IF NOT EXISTS scan_progress (
  track_slug TEXT PRIMARY KEY,
  source_channel TEXT NOT NULL,
  last_scanned_at TEXT,
  cursor TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
