import { lastSheet, localSheets } from "./api.js";

export function sheetFromSearch(search) {
  return new URLSearchParams(search || "").get("sheet") || "";
}

/** ?sheet= manda si está en la lista o es local (recién creada);
 * si no, última válida; si no, primera. */
export function resolveSheet(search, names) {
  const list = names || [];
  const locals = localSheets();
  const q = sheetFromSearch(search);
  if (q && (list.includes(q) || locals.includes(q))) return q;
  const last = lastSheet();
  if (last && (list.includes(last) || locals.includes(last))) return last;
  return list[0] || "";
}
