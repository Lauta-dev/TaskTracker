// Date -> "YYYY-MM-DD" local.
export function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return String(y).padStart(4, "0") + "-" + m + "-" + day;
}

// Mes actual del dispositivo, m 1-12.
export function currentMonth() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

// {y, m} -> "YYYY-MM".
export function monthKey(y, m) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
}

// "YYYY-MM" -> {y, m}. Null si no matchea.
export function monthFromKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { y: Number(m[1]), m: mo };
}

// "YYYY-MM-DD" (o Date) -> key calendario sin pasar por timezone.
// El date-only se toma literal: new Date("2026-10-01") es medianoche UTC
// y en ART cae el 30-sep. Los ISO legacy con hora conservan el
// comportamiento anterior (hora local del dispositivo).
export function dateKey(v) {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : dayKey(v);
  }
  if (typeof v === "string") {
    const t = v.trim();
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      const chk = new Date(y, mo - 1, d);
      if (chk.getFullYear() === y && chk.getMonth() === mo - 1 && chk.getDate() === d) {
        return `${m[1]}-${m[2]}-${m[3]}`;
      }
      return null;
    }
  }
  const d = new Date(v);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return dayKey(d);
}

const MESES = Object.freeze([
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]);

// "2026-10" -> "octubre 2026".
export function MONTH_LABEL(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  return `${MESES[Number(m[2])]} ${m[1]}`;
}

// "2026-10" -> "Octubre".
export function monthName(key) {
  const m = String(key || "").match(/-(\d{2})$/);
  if (!m) return "";
  const n = MESES[Number(m[1])];
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

// Grilla Lun->Dom del mes con nulls de relleno.
export function monthCells(y, m) {
  const first = new Date(y, m - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const key =
      String(y).padStart(4, "0") +
      "-" +
      String(m).padStart(2, "0") +
      "-" +
      String(day).padStart(2, "0");
    cells.push({ key, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
