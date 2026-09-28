import { dayKey } from "./dates.js";
import { parseDuration, parseRows } from "./parse.js";
import { del, get, set } from "./storage.js";

// Dev: datos congelados (src/mock/data.json, solo lectura).
// Prod: API real. El import dinámico deja el mock fuera del bundle de prod.
export const USE_MOCK = import.meta.env.DEV;
let mockCache = null;
async function mockData() {
  if (!mockCache) mockCache = (await import("./mock/data.json")).default;
  return mockCache;
}

const GAS_ID = import.meta.env.PROD
  ? __GAS_ID__
  : import.meta.env?.VITE_GAS_ID || "";
const API_BASE = GAS_ID ? `https://script.google.com/macros/s/${GAS_ID}/exec` : "";

// Solo nombres creados acá; las filas viven en la API.
const SHEETS_KEY = "tt-sheets";
// Entradas cuyo POST falló; se reintentan después.
const PENDING_KEY = "tt-pending";
// Última hoja usada.
const LAST_KEY = "tt-sheet";

async function req(url, opts) {
  if (!API_BASE) throw new Error("Falta VITE_GAS_ID en el .env");
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* Columnas 1-based de la pestaña. */
export const COLS = { fecha: 1, habilidad: 2, recurso: 3, contenido: 4, hora: 5, nota: 6 };

/* POST a GAS: aplica aunque responda HTML/estados raros; basta que resuelva.
   text/plain evita el preflight CORS que Apps Script no responde. */
async function post(action, body) {
  if (!API_BASE) throw new Error("Falta VITE_GAS_ID en el .env");
  await fetch(`${API_BASE}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}

/* ---------- hojas ---------- */

export function localSheets() {
  const v = get(SHEETS_KEY, []);
  return Array.isArray(v) ? v.filter((n) => typeof n === "string") : [];
}

export function createSheet(name) {
  const clean = String(name || "").trim();
  if (!clean) return false;
  const list = localSheets();
  if (!list.includes(clean)) list.push(clean);
  return set(SHEETS_KEY, list);
}

export function deleteSheet(name) {
  set(SHEETS_KEY, localSheets().filter((n) => n !== name));
  set(PENDING_KEY, pending().filter((p) => p.sheet !== name));
  if (get(LAST_KEY, "") === name) del(LAST_KEY);
  return true;
}

export function lastSheet() {
  return get(LAST_KEY, "");
}

export function saveLastSheet(name) {
  set(LAST_KEY, name || "");
}

/** Una sola lista: API + locales, sin duplicados. */
export async function listSheets() {
  let api = [];
  if (USE_MOCK) {
    api = [...((await mockData()).sheets || [])];
  } else {
    try {
      const data = await req(`${API_BASE}?action=GETSHEETS`);
      const names = Array.isArray(data) ? data : data?.sheets || [];
      api = names.filter((n) => typeof n === "string");
    } catch {
      api = [];
    }
  }
  return [...new Set([...api, ...localSheets()])];
}

/* ---------- filas: siempre frescas de la API ---------- */

function pending() {
  const v = get(PENDING_KEY, []);
  return Array.isArray(v) ? v : [];
}

function pendingFor(sheet) {
  return pending().filter((p) => p.sheet === sheet);
}

/** La cola guarda payloads del POST; se normalizan a fila para la grilla. */
function pendingToRow(p) {
  try {
    return {
      key: dayKey(new Date(p.fecha)),
      secs: parseDuration(p.hora).secs || 0,
      habilidad: p.habilidad || "—",
      recurso: p.recurso || "—",
      titulo: p.contenido || "Sin título",
      url: p.link || "",
      notas: p.nota || "",
    };
  } catch {
    return null;
  }
}

export async function getRows(sheet) {
  try {
    const matrix = USE_MOCK
      ? (await mockData()).rows?.[sheet] || []
      : await fetchMatrix(sheet);
    const queued = pendingFor(sheet).map(pendingToRow).filter(Boolean);
    return { rows: parseRows(matrix).concat(queued), live: true, error: "" };
  } catch (e) {
    return { rows: pendingFor(sheet).map(pendingToRow).filter(Boolean), live: false, error: e?.message || "error de red" };
  }
}

async function fetchMatrix(sheet) {
  const data = await req(`${API_BASE}?action=GETROWS&sheet=${encodeURIComponent(sheet)}`);
  return Array.isArray(data) ? data : data?.rows || data?.data || [];
}

/* ---------- escribir: POST, si falla se encola ---------- */

export async function postEntry(entry) {
  try {
    await post("CREATE", entry);
    await retryPending();
    return "sent";
  } catch {
    set(PENDING_KEY, [...pending(), entry]);
    return "queued";
  }
}

/** Reintenta la cola; devuelve cuántas quedan. */
export async function retryPending() {
  const rest = [];
  for (const p of pending()) {
    try {
      await post("CREATE", p);
    } catch {
      rest.push(p);
    }
  }
  set(PENDING_KEY, rest);
  return rest.length;
}

/** Actualiza celdas: changes = [{ col (1-based), newValue }]. Lanza si falla. */
export async function updateCells(sheet, row, changes) {
  for (const c of changes) {
    await post("UPDATE", { sheet, row, col: c.col, newValue: c.newValue });
  }
}

/** Borra una fila por índice 1-based. Lanza si falla. */
export async function deleteRowApi(sheet, row) {
  await post("DELETE", { sheet, row });
}

export function pendingCount(sheet) {
  return sheet ? pendingFor(sheet).length : pending().length;
}
