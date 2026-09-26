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
