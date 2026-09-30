import { ENTRY, ENTRY_REQUIRED, TABLES } from "../constants.js";

const T = TABLES.ENTRIES;
const q = (col) => `"${col}"`;
const ALL_COLS = [ENTRY.ID, ENTRY.SHEET_ID, ...ENTRY_REQUIRED].map(q).join(", ");

export async function listEntries(db, sheetId = null) {
  if (sheetId == null) {
    const { results } = await db.prepare(`SELECT ${ALL_COLS} FROM "${T}" ORDER BY ${q(ENTRY.ID)}`).all();
    return results;
  }
  const { results } = await db
    .prepare(`SELECT ${ALL_COLS} FROM "${T}" WHERE ${q(ENTRY.SHEET_ID)} = ? ORDER BY ${q(ENTRY.ID)}`)
    .bind(sheetId)
    .all();
  return results;
}

export function getEntryById(db, id) {
  return db.prepare(`SELECT ${ALL_COLS} FROM "${T}" WHERE ${q(ENTRY.ID)} = ?`).bind(id).first();
}

/* entry trae las 7 columnas en el orden de ENTRY_REQUIRED: nunca ${} con valores. */
export async function createEntry(db, sheetId, entry) {
  const cols = [ENTRY.SHEET_ID, ...ENTRY_REQUIRED].map(q).join(", ");
  const placeholders = [ENTRY.SHEET_ID, ...ENTRY_REQUIRED].map(() => "?").join(", ");
  const values = [sheetId, ...ENTRY_REQUIRED.map((f) => entry[f])];
  const res = await db.prepare(`INSERT INTO "${T}" (${cols}) VALUES (${placeholders})`).bind(...values).run();
  return { id: res.meta.last_row_id, sheet_id: sheetId, ...entry };
}

/* patch ya viene filtrado por el validator (whitelist): solo las keys son ${}. */
export async function updateEntry(db, id, patch) {
  const fields = Object.keys(patch);
  const set = fields.map((f) => `${q(f)} = ?`).join(", ");
  const res = await db
    .prepare(`UPDATE "${T}" SET ${set} WHERE ${q(ENTRY.ID)} = ?`)
    .bind(...fields.map((f) => patch[f]), id)
    .run();
  return res.meta.changes > 0;
}

export async function deleteEntry(db, id) {
  const res = await db.prepare(`DELETE FROM "${T}" WHERE ${q(ENTRY.ID)} = ?`).bind(id).run();
  return res.meta.changes > 0;
}
