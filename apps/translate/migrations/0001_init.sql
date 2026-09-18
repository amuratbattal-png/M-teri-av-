-- Canlı Çeviri Sistemi - ilk şema. packages/db'deki müşteri avcısı
-- şemasıyla İLGİSİZ, tamamen ayrı bir D1 veritabanına uygulanır.

CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  join_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  speaker_id TEXT NOT NULL,
  source_lang TEXT NOT NULL DEFAULT 'tr',
  speaker_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS transcript_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  -- JSON: { "en": "...", "de": "..." } - dile göre önbelleğe alınmış çeviriler.
  translations TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transcript_session_seq
  ON transcript_entries(session_id, seq);
