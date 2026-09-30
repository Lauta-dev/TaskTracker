import { ENTRY, SHEET, TABLES } from "../constants.js";

const T = TABLES.SHEETS;
const ID = `"${SHEET.ID}"`;
const NAME = `"${SHEET.NAME}"`;

export async function listSheets(db) {
  const { results } = await db
    .prepare(`SELECT ${ID}, ${NAME} FROM "${T}" ORDER BY ${NAME}`)
    .all();
  return results;
}

export function getSheetById(db, id) {
  return db.prepare(`SELECT ${ID}, ${NAME} FROM "${T}" WHERE ${ID} = ?`).bind(id).first();
}

export function getSheetByName(db, name) {
  return db.prepare(`SELECT ${ID}, ${NAME} FROM "${T}" WHERE ${NAME} = ?`).bind(name).first();
}

export async function createSheet(db, name) {
  const res = await db.prepare(`INSERT INTO "${T}" (${NAME}) VALUES (?)`).bind(name).run();
  return { id: res.meta.last_row_id, name };
}

/* Borra la hoja y sus entries (el schema no tiene ON DELETE CASCADE). */
export async function deleteSheet(db, id) {
  const stmts = [
    db.prepare(`DELETE FROM "${TABLES.ENTRIES}" WHERE "${ENTRY.SHEET_ID}" = ?`).bind(id),
    db.prepare(`DELETE FROM "${T}" WHERE ${ID} = ?`).bind(id),
  ];
  const [, sheetRes] = await db.batch(stmts);
  return sheetRes.meta.changes > 0;
}
