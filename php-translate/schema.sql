-- Canlı Çeviri Sistemi - PHP + MySQL şeması.
-- SQLite ile de (yerel test için) çalışacak şekilde yazıldı - MySQL'e
-- özgü söz dizimi (backtick, inline INDEX vb.) kasıtlı olarak kullanılmadı.

CREATE TABLE IF NOT EXISTS speakers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  join_code VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  speaker_id VARCHAR(36) NOT NULL,
  source_lang VARCHAR(10) NOT NULL DEFAULT 'tr',
  speaker_token VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  ended_at DATETIME NULL
);

CREATE INDEX idx_sessions_join_code ON sessions(join_code);

CREATE TABLE IF NOT EXISTS transcript_entries (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  seq INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  -- JSON: {"en": "...", "de": "..."} - dile göre önbelleğe alınmış çeviriler.
  translations TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_transcript_session_seq ON transcript_entries(session_id, seq);

-- /admin/settings.php panelinden girilen değerler (NVIDIA API anahtarı/model).
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL
);

-- Konuşmacının o anki (henüz bitmemiş) cümlesi - katılımcı ekranında
-- "canlı altyazı" hissi için. Her final cümlede temizlenir.
CREATE TABLE IF NOT EXISTS session_interim (
  session_id VARCHAR(36) PRIMARY KEY,
  interim_text TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Her katılımcı anket (poll) isteği bir "nabız" (heartbeat) sayılır -
-- ayrı bir WebSocket bağlantısı olmadığı için katılımcı sayısı burada
-- son N saniyede görülen benzersiz client_id sayısı olarak hesaplanır.
CREATE TABLE IF NOT EXISTS participant_pings (
  session_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  lang VARCHAR(10) NOT NULL,
  last_seen DATETIME NOT NULL,
  PRIMARY KEY (session_id, client_id)
);
