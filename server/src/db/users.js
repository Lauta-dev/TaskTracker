/* Acceso a la tabla users. */
export async function countUsers(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
  return row?.n ?? 0;
}

export async function getUserByUsername(db, username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
}

export async function createUser(db, username, passwordHash) {
  const res = await db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .bind(username, passwordHash)
    .run();
  return res.meta.last_row_id;
}
