CREATE TABLE IF NOT EXISTS sheets (
	id integer primary key autoincrement,
  name text
);

CREATE TABLE IF NOT EXISTS entries (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER NOT NULL REFERENCES sheets(id),
  "date" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "url" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_sheet ON entries(sheet_id);

-- Auth: un solo user (username + hash PBKDF2) y sesiones opacas revocables.
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
