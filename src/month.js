import { lastMonth } from "./api.js";
import { monthKey } from "./dates.js";

/** "YYYY-MM" sin validar rango (eso lo hace monthFromKey). */
export function monthFromSearch(search) {
  const q = new URLSearchParams(search || "").get("month");
  return /^\d{4}-\d{2}$/.test(q || "") ? q : null;
}

/** Prioridad: ?month=, último visto, mes actual del dispositivo.
 *  Devuelve "YYYY-MM" (siempre válido aunque la lista siga cargando). */
export function resolveMonth(search) {
  const now = new Date();
  return monthFromSearch(search) || lastMonth() || monthKey(now.getFullYear(), now.getMonth() + 1);
}
