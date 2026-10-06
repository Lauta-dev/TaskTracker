// Segundos -> "Xh Ym" | "Xh" | "Ym".
export function fmtTotal(secs) {
  const totalMin = Math.floor(Number(secs) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return h + "h " + m + "m";
  if (h > 0) return h + "h";
  return m + "m";
}

// Segundos -> "Xh" | "Ym" (compacto para la grilla, sin redondear).
export function fmtShort(secs) {
  const totalMin = Math.floor(Number(secs) / 60);
  if (totalMin >= 60) return Math.floor(totalMin / 60) + "h";
  return totalMin + "m";
}

// Segundos -> "HH:MM:SS".
export function secsToHMS(secs) {
  const s = Math.max(0, Math.round(Number(secs)));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return h + ":" + m + ":" + r;
}

// Agrega https:// si falta esquema, "" si vacío.
export function normalizeUrl(u) {
  if (u === null || u === undefined) return "";
  const t = String(u).trim();
  if (t === "") return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return t;
  return "https://" + t;
}

// Ratio 0..1 -> nivel 0..4 para la rampa de color.
export function level(ratio) {
  if (ratio <= 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
