import { lastSheet } from "./api.js";

export function sheetFromSearch(search) {
  return new URLSearchParams(search || "").get("sheet") || "";
}

/** ?sheet= válido → ese; si no, última usada válida; si no, primera. */
export function resolveSheet(search, names) {
  const list = names || [];
  const q = sheetFromSearch(search);
  if (q && list.includes(q)) return q;
  const last = lastSheet();
  if (last && list.includes(last)) return last;
  return list[0] || "";
}
