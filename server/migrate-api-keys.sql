-- API keys para clientes no navegador (app de escritorio C++/Kirigami).
-- En DB solo vive el hash SHA-256 del key: el texto plano se muestra una vez
-- al crearla y después no se puede recuperar (si se pierde, se revoca y se crea otra).
--   wrangler d1 execute DB --file=./migrate-api-keys.sql          # local
--   wrangler d1 execute DB --file=./migrate-api-keys.sql --remote # prod

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  key_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
