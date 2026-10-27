import { dateKey, MONTH_LABEL } from "./dates.js";
import { parseDuration, parseRows, parseSheetDuration } from "./parse.js";
import { get, set } from "./storage.js";

/* Cliente de la API REST (Hono + D1). Un solo lugar para base,
   endpoints, campos y estados: nada de strings sueltos abajo. */
const API_BASE = import.meta.env?.VITE_API_BASE || "";

const EP = Object.freeze({
  MONTHS: "/months",
  ENTRIES: "/entries",
  ROWS: "/rows",
  STATUS: "/auth/status",
  SETUP: "/auth/setup",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
});

/* Campos del POST/PATCH (los que acepta el backend).
   year/month no viajan: el server los deriva de date. */
const F = Object.freeze({
  DATE: "date",
  TYPE: "type",
  SOURCE: "source",
  CONTENT: "content",
  DURATION: "duration",
  NOTE: "note",
  URL: "url",
  AREA: "area",
});

/* Resultado de postEntry: lo consume EntryForm ("queued" muestra aviso). */
const SEND = Object.freeze({ SENT: "sent", QUEUED: "queued" });

// Mock automático: en dev (vite dev) se usan los datos congelados;
// el build de prod va contra la API real.
export const USE_MOCK = import.meta.env?.DEV === true;
let mockCache = null;
async function mockData() {
  if (!mockCache) mockCache = (await import("./mock/data.json")).default;
  return mockCache;
}

// Entradas cuyo POST falló; se reintentan después.
// v2: payloads REST. v3: sin sheet (la cola queda global, mesa única).
const PENDING_KEY = "tt-pending-v3";
// Último mes (YYYY-MM) visto.
const LAST_KEY = "tt-month";

// Limpieza one-shot de llaves del esquema viejo (hojas).
for (const old of ["tt-sheets", "tt-sheet"]) {
  try {
    localStorage.removeItem(old);
  } catch {
    // sin localStorage disponible
  }
}

/* Sesión en cookie HttpOnly: el front nunca ve el token.
   El 401 invalida la vista (tt:auth avisa a la UI para mostrar el lock). */
export async function authStatus() {
  return req(EP.STATUS, undefined, { retries: 0 });
}

export async function setup(username, password) {
  await req(EP.SETUP, { method: "POST", body: { username, password } }, { retries: 0 });
  window.dispatchEvent(new Event("tt:auth"));
}

export async function login(username, password) {
  await req(EP.LOGIN, { method: "POST", body: { username, password } }, { retries: 0 });
  window.dispatchEvent(new Event("tt:auth"));
}

export async function logout() {
  try {
    await req(EP.LOGOUT, { method: "POST" }, { retries: 0 });
  } finally {
    window.dispatchEvent(new Event("tt:auth"));
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* Fetch JSON con timeout + reintentos. El error del backend ({error})
   se propaga como mensaje para mostrarlo tal cual. */
async function req(path, { method = "GET", body } = {}, { timeout = 15000, retries = 2 } = {}) {
  if (!API_BASE) throw new Error("Falta VITE_API_BASE en el .env");
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
      if (res.status === 401) {
        window.dispatchEvent(new Event("tt:auth"));
      }
      if (!res.ok) {
        let msg = "HTTP " + res.status;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // cuerpo no-JSON: queda el HTTP status
        }
        const err = new Error(msg);
        err.status = res.status;
        if (res.status >= 500 && attempt < retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw err;
      }
      return res.json();
    } catch (e) {
      last = e;
      if (e?.status) throw e;
      const retryable = e?.name === "TimeoutError" || e?.name === "AbortError" || e instanceof TypeError;
      if (retryable && attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

/* Columnas 1-based históricas (las usa EntryForm para armar changes). */
export const COLS = { fecha: 1, habilidad: 2, recurso: 3, contenido: 4, hora: 5, nota: 6, area: 7 };

/* Áreas (entradas mixtas, una por fila). */
export const AREAS = Object.freeze(["ingles", "ejercicio", "matematica"]);
export const AREA_LABEL = Object.freeze({ ingles: "Inglés", ejercicio: "Ejercicio", matematica: "Matemática" });

/* Columna -> campo del PATCH. Contenido puede traer {title, url}. */
const FIELD_BY_COL = Object.freeze({
  [COLS.fecha]: F.DATE,
  [COLS.habilidad]: F.TYPE,
  [COLS.recurso]: F.SOURCE,
  [COLS.contenido]: F.CONTENT,
  [COLS.hora]: F.DURATION,
  [COLS.nota]: F.NOTE,
  [COLS.area]: F.AREA,
});

/* Fila del backend -> fila normalizada de la grilla.
   row = id D1: es lo que Editar/Borrar mandan de vuelta.
   La fecha es día calendario (dateKey): nunca se reconvierte por timezone. */
function normalizeEntry(e) {
  if (!e || typeof e !== "object") return null;
  const key = dateKey(e.date);
  if (!key) return null;
  const titulo = e.content === null || e.content === undefined ? "" : String(e.content).trim();
  const area = typeof e.area === "string" && AREAS.includes(e.area) ? e.area : "ingles";
  return {
    key,
    area,
    secs: parseSheetDuration(e.duration),
    habilidad: e.type ? String(e.type) : "—",
    recurso: e.source ? String(e.source) : "—",
    titulo: titulo ? titulo : "Sin título",
    url: e.url ? String(e.url) : "",
    notas: e.note ? String(e.note) : "",
    row: typeof e.id === "number" ? e.id : null,
  };
}

/* ---------- meses (antes hojas) ---------- */

export function lastMonth() {
  return get(LAST_KEY, "");
}

export function saveLastMonth(key) {
  set(LAST_KEY, key || "");
}

/** Meses con datos ("YYYY-MM"), del server + los que traen pendientes en cola.
 *  Devuelve null si no se pudo (front muestra "sin datos" sin bloquearse). */
export async function listMonths() {
  let api = [];
  if (USE_MOCK) {
    api = Object.keys((await mockData()).rows || {});
  } else {
    try {
      const data = await req(EP.MONTHS);
      api = (Array.isArray(data) ? data : []).filter((k) => /^\d{4}-\d{2}$/.test(k));
    } catch {
      return null;
    }
  }
  // Un registro en cola autocompleta su mes aunque el server no lo tenga.
  for (const p of pending()) {
    const k = typeof p?.date === "string" ? p.date.slice(0, 7) : "";
    if (/^\d{4}-\d{2}$/.test(k)) api.push(k);
  }
  return [...new Set(api)].sort();
}

/* ---------- filas: siempre frescas de la API ---------- */

function pending() {
  const v = get(PENDING_KEY, []);
  return Array.isArray(v) ? v : [];
}

/* Pendientes de un mes ("2026-10"); sin prefix = todos. */
function pendingFor(prefix) {
  const list = pending();
  if (!prefix) return list;
  return list.filter((p) => typeof p?.date === "string" && p.date.slice(0, 7) === prefix);
}

/** La cola ya guarda payloads REST; se normalizan a fila para la grilla. */
function pendingToRow(p) {
  const r = normalizeEntry(p);
  if (!r) return null;
  return { ...r, row: null };
}

/** Filas de un mes ("2026-10") o de todos (null). */
export async function getRows(month = null) {
  try {
    if (USE_MOCK) {
      const m = await mockData();
      let rows = [];
      if (month) rows = parseRows(m.rows?.[month] || []);
      else {
        for (const key of Object.keys(m.rows || {}).sort()) rows = rows.concat(parseRows(m.rows[key] || []));
      }
      return { rows: rows.concat(pendingFor(month).map(pendingToRow).filter(Boolean)), live: true, error: "" };
    }
    const qs = new URLSearchParams();
    if (month) {
      qs.set("year", month.slice(0, 4));
      qs.set("month", String(Number(month.slice(5, 7))));
    }
    const q = qs.toString();
    const data = await req(q ? `${EP.ROWS}?${q}` : EP.ROWS);
    return {
      rows: (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean)
        .concat(pendingFor(month).map(pendingToRow).filter(Boolean)),
      live: true,
      error: "",
    };
  } catch (e) {
    return { rows: pendingFor(month).map(pendingToRow).filter(Boolean), live: false, error: e?.message || "error de red" };
  }
}

/** Totales por mes para el pastel: un solo GET (todo) y se agrupa acá.
 *  Con area, suma solo sus filas. */
export async function getMonthlyTotals(area = null) {
  const only = AREAS.includes(area) ? area : null;
  let rows;
  if (USE_MOCK) {
    rows = (await getRows(null)).rows;
  } else {
    const data = await req(EP.ROWS);
    rows = (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean);
  }
  const totals = new Map();
  for (const r of rows) {
    if (only && r.area !== only) continue;
    const month = r.key?.slice(0, 7);
    if (!month) continue;
    totals.set(month, (totals.get(month) || 0) + r.secs);
  }
  const y = [...totals.keys()].sort();
  return y
    .filter((k) => totals.get(k) > 0)
    .map((k) => ({ month: k, label: MONTH_LABEL(k), total: totals.get(k) }));
}

/* ---------- escribir: POST, si falla se encola ---------- */

/* EntryForm manda {fecha}; se guarda día calendario YYYY-MM-DD, sin hora
   (la hora UTC movía el día según el timezone). El slice conserva los
   payloads en cola con formato ISO legacy. */
function toPayload(entry) {
  return {
    [F.DATE]: String(entry.fecha ?? "").slice(0, 10),
    [F.TYPE]: entry.habilidad,
    [F.SOURCE]: entry.recurso,
    [F.CONTENT]: entry.contenido,
    [F.DURATION]: entry.hora,
    [F.NOTE]: entry.nota || "",
    [F.URL]: entry.link || "",
    [F.AREA]: AREAS.includes(entry.area) ? entry.area : "ingles",
  };
}

export async function postEntry(entry) {
  const payload = toPayload(entry);
  try {
    await req(EP.ENTRIES, { method: "POST", body: payload });
    await retryPending();
    return SEND.SENT;
  } catch {
    set(PENDING_KEY, [...pending(), payload]);
    return SEND.QUEUED;
  }
}

/** Reintenta la cola; devuelve cuántas quedan. */
export async function retryPending() {
  const rest = [];
  for (const p of pending()) {
    try {
      await req(EP.ENTRIES, { method: "POST", body: p });
    } catch {
      rest.push(p);
    }
  }
  set(PENDING_KEY, rest);
  return rest.length;
}

/** Actualiza por id: changes = [{ col (1-based), newValue }]. Un solo PATCH. */
export async function updateCells(row, changes) {
  const patch = {};
  for (const c of changes || []) {
    const field = FIELD_BY_COL[c.col];
    if (!field) continue;
    if (c.col === COLS.contenido && c.newValue && typeof c.newValue === "object") {
      patch[F.CONTENT] = c.newValue.title || "";
      patch[F.URL] = c.newValue.url || "";
    } else {
      patch[field] = c.newValue;
    }
  }
  if (Object.keys(patch).length === 0) return;
  await req(`${EP.ENTRIES}/${row}`, { method: "PATCH", body: patch });
}

/** Borra una entrada por id. Lanza si falla. */
export async function deleteRowApi(row) {
  await req(`${EP.ENTRIES}/${row}`, { method: "DELETE" });
}

export function pendingCount(prefix) {
  return pendingFor(prefix).length;
}
