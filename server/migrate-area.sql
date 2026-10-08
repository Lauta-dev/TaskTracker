-- Hojas mixtas: cada entrada lleva su área (backfill a 'ingles').
-- Aplicar una sola vez: wrangler d1 execute DB --file=./migrate-area.sql [--remote]
ALTER TABLE "entries" ADD COLUMN "area" TEXT NOT NULL DEFAULT 'ingles';
