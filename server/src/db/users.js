/* Acceso a la tabla users. */
export async function countUsers(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
  return row?.n ?? 0;
}

export async function getUserByUsername(db, username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
}

/* ID de la cuenta única (la app admite un solo usuario). La usa la admin key
   para asociar las keys que crea desde la línea de comandos. */
export async function getFirstUserId(db) {
  const row = await db.prepare("SELECT id FROM users ORDER BY id LIMIT 1").first();
  return row?.id ?? null;
}

export async function createUser(db, username, passwordHash) {
  const res = await db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .bind(username, passwordHash)
    .run();
  return res.meta.last_row_id;
}
