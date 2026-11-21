import { sha256Hex } from "../password.js";

/* Keys de API para clientes no navegador (app de escritorio).
   En DB solo vive el hash: el key en claro se devuelve una sola vez al crearla. */

export async function createApiKey(db, userId, name, rawKey) {
  const res = await db
    .prepare("INSERT INTO api_keys (name, key_hash, user_id) VALUES (?, ?, ?)")
    .bind(String(name || ""), await sha256Hex(rawKey), userId)
    .run();
  return res.meta.last_row_id;
}

/* Usuario dueño de una key válida (no revocada), o null.
   Cada uso actualiza last_used_at para poder ver qué key se está usando. */
export async function getApiKeyUser(db, rawKey) {
  const keyHash = await sha256Hex(rawKey);
  const row = await db
    .prepare(
      `SELECT k.id AS keyId, u.id AS id, u.username AS username
       FROM api_keys k JOIN users u ON u.id = k.user_id
       WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
    )
    .bind(keyHash)
    .first();
  if (!row) return null;
  await db
    .prepare("UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
    .bind(row.keyId)
    .run();
  return { id: row.id, username: row.username };
}

/* Metadata de las keys del usuario. Nunca devuelve key_hash. */
export async function listApiKeys(db, userId) {
  const res = await db
    .prepare(
      `SELECT id, name, created_at AS createdAt, last_used_at AS lastUsedAt, revoked_at AS revokedAt
       FROM api_keys WHERE user_id = ? ORDER BY id DESC`,
    )
    .bind(userId)
    .all();
  return res.results || [];
}

/* Revoca una key del usuario. true si se revocó, false si no existe o ya estaba revocada. */
export async function revokeApiKey(db, userId, id) {
  const res = await db
    .prepare(
      `UPDATE api_keys SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    )
    .bind(id, userId)
    .run();
  return (res.meta?.changes || 0) > 0;
}
