import { lastMonth } from "./api.js";

/** "YYYY-MM" sin validar rango (eso lo hace monthFromKey). */
export function monthFromSearch(search) {
  const q = new URLSearchParams(search || "").get("month");
  return /^\d{4}-\d{2}$/.test(q || "") ? q : null;
}

/** Prioridad: ?month=, último visto, mes actual del dispositivo.
 *  Devuelve "YYYY-MM" (siempre válido aunque la lista siga cargando). */
export function resolveMonth(search) {
  return monthFromSearch(search) || lastMonth() || "";
}
