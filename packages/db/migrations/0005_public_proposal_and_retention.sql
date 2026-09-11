-- Muşteri Avcısı Sistemi - hosted teklif sayfası (public link) + retention flag altyapısı
-- Uygulama: wrangler d1 execute <DB_NAME> --remote --file=packages/db/migrations/0005_public_proposal_and_retention.sql

ALTER TABLE candidates ADD COLUMN proposal_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_proposal_token ON candidates(proposal_token);
