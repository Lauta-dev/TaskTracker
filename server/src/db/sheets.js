import { ENTRY, SHEET, TABLES } from "../constants.js";

const T = TABLES.SHEETS;
const ID = `"${SHEET.ID}"`;
const NAME = `"${SHEET.NAME}"`;

export async function listSheets(db) {
  const { results } = await db
    .prepare(`SELECT ${ID}, ${NAME} FROM "${T}" ORDER BY ${NAME}`)
    .all();
  // Cronológico por año+mes del nombre ("Inglés - 2026 Octubre"):
  // ago → sep → oct → nov. Sin fecha parseable, al final alfabético.
  return [...results].sort((a, b) => {
    const ra = sheetRank(a?.name);
    const rb = sheetRank(b?.name);
    if (ra !== null && rb !== null) return ra - rb;
    if (ra !== null) return -1;
    if (rb !== null) return 1;
    return String(a?.name || "").localeCompare(String(b?.name || ""), "es");
  });
}

const SHEET_MONTHS = Object.freeze({
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
});

function sheetRank(name) {
  const t = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const m = t.match(/((?:19|20)\d{2})\s+([a-z]+)/);
  const month = m && SHEET_MONTHS[m[2]];
  if (!m || !month) return null;
  return Number(m[1]) * 12 + month;
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

/* Renombra la hoja. Devuelve la fila o null si no existe. */
export async function renameSheet(db, id, name) {
  const res = await db.prepare('UPDATE "sheets" SET "name" = ? WHERE "id" = ?').bind(name, id).run();
  if (res.meta.changes === 0) return null;
  return getSheetById(db, id);
}
