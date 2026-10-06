import { lastSheet, localSheets } from "./api.js";

export function sheetFromSearch(search) {
  return new URLSearchParams(search || "").get("sheet") || "";
}

/** Prioridad: ?sheet=, última guardada, primera de la lista.
 * Si la lista aún no cargó (null) se confía en ?sheet=/última para poder
 * pedir filas enseguida; al cargar se valida contra la lista. */
export function resolveSheet(search, names) {
  const q = sheetFromSearch(search);
  const last = lastSheet();
  if (!names) return q || last || "";
  const list = names || [];
  const locals = localSheets();
  const known = (n) => list.includes(n) || locals.includes(n);
  if (q && known(q)) return q;
  if (last && known(last)) return last;
  return list[0] || q || last || "";
}
