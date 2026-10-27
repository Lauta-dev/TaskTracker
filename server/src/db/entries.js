import { ENTRY, ENTRY_REQUIRED, TABLES } from "../constants.js";

const T = TABLES.ENTRIES;
const q = (col) => `"${col}"`;
const ALL_COLS = [ENTRY.ID, ...ENTRY_REQUIRED, ENTRY.YEAR, ENTRY.MONTH].map(q).join(", ");

/* "date" -> { year, month } (los primeros 10 chars: YYYY-MM-DD o ISO legacy). */
export function yearMonthOf(date) {
  const d = String(date || "");
  const m = d.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(m[1]), month };
}

export async function listEntries(db, filters = {}) {
  const where = [];
  const values = [];
  if (filters.year != null) {
    where.push(`${q(ENTRY.YEAR)} = ?`);
    values.push(filters.year);
  }
  if (filters.month != null) {
    where.push(`${q(ENTRY.MONTH)} = ?`);
    values.push(filters.month);
  }
  const sql = `SELECT ${ALL_COLS} FROM "${T}"${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${q(ENTRY.ID)}`;
  const { results } = await db.prepare(sql).bind(...values).all();
  return results;
}

export function getEntryById(db, id) {
  return db.prepare(`SELECT ${ALL_COLS} FROM "${T}" WHERE ${q(ENTRY.ID)} = ?`).bind(id).first();
}

/* entry trae las 8 columnas en el orden de cols; year/month derivados de date.
   Nunca ${} con valores: placeholders en hardcode. */
export async function createEntry(db, entry) {
  const cols = [ENTRY.DATE, ENTRY.YEAR, ENTRY.MONTH, ENTRY.TYPE, ENTRY.SOURCE, ENTRY.CONTENT, ENTRY.DURATION, ENTRY.NOTE, ENTRY.URL, ENTRY.AREA].map(q).join(", ");
  const placeholders = cols.split(", ").map(() => "?").join(", ");
  const ym = yearMonthOf(entry[ENTRY.DATE]);
  const values = [entry[ENTRY.DATE], ym.year, ym.month, ...ENTRY_REQUIRED.slice(1).map((f) => entry[f])];
  const res = await db.prepare(`INSERT INTO "${T}" (${cols}) VALUES (${placeholders})`).bind(...values).run();
  return { id: res.meta.last_row_id, ...entry, year: ym.year, month: ym.month };
}

/* patch ya viene filtrado por el validator (whitelist): solo las keys son ${}.
   El PATCH /entries/:id agrega year/month cuando el patch toca date. */
export async function updateEntry(db, id, patch) {
  const set = Object.keys(patch).map((f) => `${q(f)} = ?`);
  const res = await db
    .prepare(`UPDATE "${T}" SET ${set.join(", ")} WHERE ${q(ENTRY.ID)} = ?`)
    .bind(...Object.values(patch), id)
    .run();
  return res.meta.changes > 0;
}

export async function deleteEntry(db, id) {
  const res = await db.prepare(`DELETE FROM "${T}" WHERE ${q(ENTRY.ID)} = ?`).bind(id).run();
  return res.meta.changes > 0;
}

/* Meses con datos como "YYYY-MM", cronológicos. */
export async function listMonths(db) {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT ${q(ENTRY.YEAR)} AS y, ${q(ENTRY.MONTH)} AS m FROM "${T}" ORDER BY y, m`,
    )
    .all();
  return results.map((r) =>
    `${String(r.y).padStart(4, "0")}-${String(r.m).padStart(2, "0")}`,
  );
}
