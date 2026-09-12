-- Musteri Avcisi Sistemi - AI lead kalite puani (yildiz)
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0003_ai_score.sql
--
-- candidates tablosuna, NVIDIA ile 1-5 arasi hesaplanan lead kalite
-- puanini tutan nullable bir sutun ekler (bkz.
-- apps/control/src/lib/relevance.ts assessLeadQuality). NULL = hic
-- puanlanmadi (AI atlandi/basarisiz oldu) - "1 yildiz" ile KARISTIRILMAMALI.

ALTER TABLE candidates ADD COLUMN ai_score INTEGER;
