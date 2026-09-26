import { dayKey } from "./dates.js";
import { parseDuration, parseRows } from "./parse.js";
import { del, get, set } from "./storage.js";

const GAS_ID = import.meta.env?.VITE_GAS_ID || "";
const API_BASE = GAS_ID ? `https://script.google.com/macros/s/${GAS_ID}/exec` : "";

// Solo nombres creados acá; las filas viven en la API.
const SHEETS_KEY = "tt-sheets";
// Entradas cuyo POST falló; se reintentan después.
const PENDING_KEY = "tt-pending";
// Última hoja usada.
const LAST_KEY = "tt-sheet";

async function req(url, opts) {
  if (!API_BASE) throw new Error("Falta VITE_GAS_ID en el .env");
  // text/plain evita el preflight CORS que Apps Script no responde.
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function post(url, body) {
  return req(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
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
  try {
    const data = await req(`${API_BASE}?action=getSheet`);
    const names = Array.isArray(data) ? data : data?.sheets || [];
    api = names.filter((n) => typeof n === "string");
  } catch {
    api = [];
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
    const data = await req(`${API_BASE}?sheet=${encodeURIComponent(sheet)}`);
    const matrix = Array.isArray(data) ? data : data?.rows || data?.data || [];
    const queued = pendingFor(sheet).map(pendingToRow).filter(Boolean);
    return { rows: parseRows(matrix).concat(queued), live: true, error: "" };
  } catch (e) {
    return { rows: pendingFor(sheet).map(pendingToRow).filter(Boolean), live: false, error: e?.message || "error de red" };
  }
}

/* ---------- escribir: POST, si falla se encola ---------- */

export async function postEntry(entry) {
  try {
    await post(API_BASE, entry);
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
      await post(API_BASE, p);
    } catch {
      rest.push(p);
    }
  }
  set(PENDING_KEY, rest);
  return rest.length;
}

export function pendingCount(sheet) {
  return sheet ? pendingFor(sheet).length : pending().length;
}
