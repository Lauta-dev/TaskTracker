-- Setup único de la DB (schema + seed). Ejecutar en D1 una vez:
--   wrangler d1 execute english --remote --file=./seed.sql
-- (o desde el dashboard: D1 → english → Console, pegar de a bloques).
-- Es idempotente: re-ejecutar lo deja igual (IF NOT EXISTS), salvo el
-- seed de ejemplo que agrega filas nuevas cada vez — borrarlo si no querés.

-- Modelo de datos: una sola tabla entries; el mes/año viven en cada entry
-- (year, month), derivados de "date". No hay hojas (sheets) ni sheet_id.
CREATE TABLE IF NOT EXISTS entries (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "date" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL, -- 1..12
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT 'ingles'
);
CREATE INDEX IF NOT EXISTS idx_entries_month ON entries(year, month);

-- Auth: un solo user (username + hash) y sesiones opacas revocables.
-- La sesión viaja en cookie HttpOnly: el JS nunca ve el token.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Seed de ejemplo (borrar de acá para abajo en producción real).
INSERT INTO entries ("date", "year", "month", "type", "source", "content", "duration", "note", "url", "area") VALUES
  ('2026-10-01', 2026, 10, 'Vocabulary', 'Anki', 'Refold 1k', '0:03:00', '', '', 'ingles'),
  ('2026-10-02', 2026, 10, 'Listening', 'Serie', 'The Office S01 E03', '0:30:00', '', '', 'ingles'),
  ('2026-10-02', 2026, 10, 'Vocabulary', 'Anki', 'Refold 1K, Varios', '0:01:00', '', '', 'ingles'),
  ('2026-10-03', 2026, 10, 'Ejercicio', 'Gym', 'Full body', '', '', '', 'ejercicio'),
  ('2026-10-04', 2026, 10, 'Listening', 'Movie', 'The Matrix', '0:28:20', 'Necesito terminar', '', 'ingles');
