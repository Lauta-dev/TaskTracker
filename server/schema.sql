-- D1: una sola tabla de datos. El mes/año viven en cada entry (year, month),
-- derivados de "date" por el servidor; ya no hay hojas (sheets) ni sheet_id.
-- Aplicar en DB nueva: wrangler d1 execute DB --file=./schema.sql [--remote]

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
