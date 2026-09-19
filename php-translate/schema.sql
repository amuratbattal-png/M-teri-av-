-- Canlı Çeviri Sistemi - PHP + MySQL şeması (v2, Event tabanlı model).
--
-- v1'den (tek "sessions" tablosu) BÜYÜK bir mimari değişiklik: artık bir
-- Event içinde birden çok konuşmacı (roster) olabiliyor, admin panelinden
-- hangisinin "aktif" olduğu değiştiriliyor, sesli yakalama (mikrofon) tek
-- bir Event bağlantısı üzerinden sürekli akıyor. v1 tabloları (speakers,
-- sessions, session_interim) burada YOK - bu şema sıfırdan bir kurulum
-- içindir. v1'den geçiş yapan biri varsa (henüz canlıda olmadığı için
-- şu an kimse yok) tüm tabloları silip yeniden kurmalı.
--
-- SQLite ile de (yerel test için) çalışacak şekilde yazıldı - MySQL'e
-- özgü söz dizimi (backtick, inline INDEX vb.) kasıtlı olarak kullanılmadı.

-- v1'den kalan tablolar - bazıları artık HİÇ kullanılmıyor (sessions,
-- speakers, session_interim), bazılarının ise SÜTUNLARI değişti
-- (transcript_entries: session_id -> event_id + speaker_id eklendi;
-- participant_pings: session_id -> event_id). "CREATE TABLE IF NOT
-- EXISTS" var olan bir tabloyu ASLA güncellemez - eski sütunlarla
-- bırakırsa yeni kod "no such column: event_id" gibi hatalarla
-- patlardı. Bu yüzden değişen/artık kullanılmayan HEPSİ önce
-- düşürülüyor (DROP TABLE IF EXISTS hiçbir zaman hata vermez, tablo
-- hiç yoksa da sorunsuz çalışır) - "settings" tablosu DEĞİŞMEDİ,
-- kayıtlı NVIDIA ayarları kaybolmasın diye BİLEREK düşürülmüyor.
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS speakers;
DROP TABLE IF EXISTS session_interim;
DROP TABLE IF EXISTS transcript_entries;
DROP TABLE IF EXISTS participant_pings;

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  join_code VARCHAR(16) NOT NULL,
  speaker_token VARCHAR(64) NOT NULL,
  -- Konuşmacıların GERÇEKTE konuştuğu dil (STT/mikrofon için) - etkinlik
  -- genelinde sabit, tek bir fiziksel mikrofon/ekran üzerinden akıyor.
  source_lang VARCHAR(10) NOT NULL DEFAULT 'tr',
  -- "Soru sorulması aktif" - admin panelinden açılıp kapatılıyor.
  qa_enabled INTEGER NOT NULL DEFAULT 0,
  -- Hiçbir konuşmacı aktif değilken katılımcı ekranında gösterilecek
  -- görsel - admin panelinden yüklenir, uploads/ altına kaydedilir.
  placeholder_image VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  ended_at DATETIME NULL
);

CREATE INDEX idx_events_join_code ON events(join_code);

-- Bir Event içindeki konuşmacı listesi (roster) - artık ayrı/global bir
-- "speakers" tablosu YOK, her konuşmacı doğrudan bir Event'e ait.
CREATE TABLE IF NOT EXISTS event_speakers (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  -- Konu başlığı iki dilde ayrı ayrı giriliyor - katılımcı arayüz dilini
  -- (TR/EN) değiştirdiğinde hangisi gösterilecek buna göre seçiliyor.
  topic_tr VARCHAR(255) NOT NULL DEFAULT '',
  topic_en VARCHAR(255) NOT NULL DEFAULT '',
  -- Konuşmacı fotoğrafı - admin panelinden yüklenir, uploads/speakers/
  -- altına kaydedilir, katılımcı ekranında aktifken adı/konusuyla
  -- birlikte gösterilir. NULL = henüz fotoğraf yüklenmedi.
  photo VARCHAR(255) NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_event_speakers_event ON event_speakers(event_id);

-- "photo" sütunu sonradan eklendi - CREATE TABLE IF NOT EXISTS zaten var
-- olan bir tabloyu ASLA güncellemez, bu yüzden daha önce kurulmuş
-- (sütun olmadan oluşturulmuş) bir event_speakers tablosuna sütunu
-- burada AYRICA ekliyoruz. Sıfırdan bir kurulumda CREATE TABLE zaten
-- sütunu içerdiği için bu ALTER "duplicate column" hatası verir - bu,
-- setup.php'nin (ve elle phpMyAdmin'den çalıştıranların) tolere ettiği
-- ZARARSIZ bir durumdur (bkz. setup.php'deki $alreadyExists kontrolü).
ALTER TABLE event_speakers ADD COLUMN photo VARCHAR(255) NULL;

-- Konuşmacının söylediği her bitmiş (final) cümle. speaker_id, o cümle
-- söylendiği ANDA hangi konuşmacının "aktif" olduğunu tutar (NULL =
-- hiçbir konuşmacı aktif değilken söylenmiş, ör. ara/geçiş anı).
CREATE TABLE IF NOT EXISTS transcript_entries (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  speaker_id VARCHAR(36) NULL,
  seq INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  -- JSON: {"en": "...", "de": "..."} - dile göre önbelleğe alınmış çeviriler.
  translations TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_transcript_event_seq ON transcript_entries(event_id, seq);

-- Konuşmacının o anki (henüz bitmemiş) cümlesi - katılımcı ekranında
-- "canlı altyazı" hissi için. Her final cümlede temizlenir.
CREATE TABLE IF NOT EXISTS event_interim (
  event_id VARCHAR(36) PRIMARY KEY,
  interim_text TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Her katılımcı anket (poll) isteği bir "nabız" (heartbeat) sayılır -
-- ayrı bir WebSocket bağlantısı olmadığı için katılımcı sayısı burada
-- son N saniyede görülen benzersiz client_id sayısı olarak hesaplanır.
CREATE TABLE IF NOT EXISTS participant_pings (
  event_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  lang VARCHAR(10) NOT NULL,
  last_seen DATETIME NOT NULL,
  PRIMARY KEY (event_id, client_id)
);

-- Katılımcıların sorduğu sorular - admin ekranında canlı listelenir.
-- asker_lang, katılımcının o an SEÇTİĞİ çeviri dili (soruyu muhtemelen
-- o dilde/kendi dilinde yazdığının makul bir işareti) - admin bunu
-- bildiği için (ör. etkinliğin source_lang'ine) çevirebiliyor.
CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  speaker_id VARCHAR(36) NULL,
  asker_name VARCHAR(255) NOT NULL,
  asker_lang VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  -- JSON: {"tr": "...", "en": "..."} - admin'in istediği dile çevirip
  -- önbelleğe aldığı sürümler (transcript_entries.translations ile aynı desen).
  translations TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_questions_event ON questions(event_id, created_at);

-- /admin/settings.php panelinden girilen değerler (NVIDIA API anahtarı/model).
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL
);
