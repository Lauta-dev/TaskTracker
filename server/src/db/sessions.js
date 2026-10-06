import { sha256Hex } from "../password.js";

/* Sesiones opacas: en DB solo vive el hash del token. */
export async function createSession(db, userId, token, expiresAt) {
  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), userId, expiresAt)
    .run();
}

/* Sesión válida + su user, o null (expirada/inválida: se purga si expiró). */
export async function getSessionUser(db, token) {
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.expires_at AS expiresAt, u.id AS id, u.username AS username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first();
  if (!row) return null;
  if (Date.parse(row.expiresAt) <= Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return { id: row.id, username: row.username };
}

export async function deleteSession(db, token) {
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .run();
}
