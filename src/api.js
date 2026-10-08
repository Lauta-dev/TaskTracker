import { dateKey } from "./dates.js";
import { parseDuration, parseRows, parseSheetDuration } from "./parse.js";
import { del, get, set } from "./storage.js";

/* Cliente de la API REST (Hono + D1). Un solo lugar para base,
   endpoints, campos y estados: nada de strings sueltos abajo. */
const API_BASE = import.meta.env?.VITE_API_BASE || "";

const EP = Object.freeze({
  SHEETS: "/sheets",
  ENTRIES: "/entries",
  ROWS: "/rows",
  STATUS: "/auth/status",
  SETUP: "/auth/setup",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
});

/* Campos del POST/PATCH (los que acepta el backend). */
const F = Object.freeze({
  SHEET: "sheet",
  SHEET_ID: "sheetId",
  DATE: "date",
  TYPE: "type",
  SOURCE: "source",
  CONTENT: "content",
  DURATION: "duration",
  NOTE: "note",
  URL: "url",
  AREA: "area",
});

const QP = Object.freeze({ SHEET: "sheet" });

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

// Nombres creados sin conexión, pendientes de subir al servidor.
// Cuando el sync los confirma en la DB, salen de esta lista.
const SHEETS_KEY = "tt-sheets";
// Entradas cuyo POST falló; se reintentan después.
// v2: payloads REST.
const PENDING_KEY = "tt-pending-v2";
// Última hoja usada.
const LAST_KEY = "tt-sheet";

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

/* Áreas (hojas mixtas). */
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

/* ---------- hojas ---------- */

export function localSheets() {
  const v = get(SHEETS_KEY, []);
  return Array.isArray(v) ? v.filter((n) => typeof n === "string") : [];
}

function saveLocalSheet(name) {
  const list = localSheets();
  if (!list.includes(name)) list.push(name);
  return set(SHEETS_KEY, list);
}

/* Crea en el servidor; sin conexión cae a la lista local. */
export async function createSheet(name) {
  const clean = String(name || "").trim();
  if (!clean) return false;
  try {
    await req(EP.SHEETS, { method: "POST", body: { name: clean } });
    return true;
  } catch {
    return saveLocalSheet(clean);
  }
}

export async function deleteSheet(name) {
  set(SHEETS_KEY, localSheets().filter((n) => n !== name));
  set(PENDING_KEY, pending().filter((p) => p.sheet !== name));
  if (get(LAST_KEY, "") === name) del(LAST_KEY);
  try {
    const sheets = await req(EP.SHEETS);
    const found = (Array.isArray(sheets) ? sheets : []).find((s) => s?.name === name);
    if (found) await req(`${EP.SHEETS}/${found.id}`, { method: "DELETE" });
  } catch {
    // ya se limpió lo local; el servidor queda para el próximo retry
  }
  return true;
}

/* Renombra en servidor y/o local. Actualiza última hoja y cola pendiente.
   Lanza Error con el mensaje a mostrar ("Ya existe...", sin conexión, etc.). */
export async function renameSheet(oldName, newName) {
  const from = String(oldName || "").trim();
  const clean = String(newName || "").trim();
  if (!from || !clean) throw new Error("Escribí un nombre.");
  if (clean === from) return true;
  if (clean.length > 120) throw new Error("Máximo 120 caracteres.");
  const locals = localSheets();
  const wasLocal = locals.includes(from);
  const clashLocal = locals.includes(clean);

  // Cola y última hoja siguen al nuevo nombre aunque falle la red.
  set(PENDING_KEY, pending().map((p) => (p.sheet === from ? { ...p, sheet: clean } : p)));
  if (get(LAST_KEY, "") === from) set(LAST_KEY, clean);

  if (USE_MOCK) {
    if (wasLocal || !clashLocal) {
      set(SHEETS_KEY, locals.map((n) => (n === from ? clean : n)));
      return true;
    }
    throw new Error("Ya existe una hoja con ese nombre.");
  }

  try {
    const sheets = await req(EP.SHEETS);
    const arr = Array.isArray(sheets) ? sheets : [];
    if (arr.some((s) => s?.name === clean)) throw new Error("Ya existe una hoja con ese nombre.");
    const found = arr.find((s) => s?.name === from);
    if (found) {
      await req(`${EP.SHEETS}/${found.id}`, { method: "PATCH", body: { name: clean } });
      // Servidor manda: sale de la lista local en ambos extremos.
      set(SHEETS_KEY, localSheets().filter((n) => n !== from && n !== clean));
      return true;
    }
  } catch (e) {
    if (e?.status === 409 || /ya existe/i.test(e?.message || "")) {
      throw new Error("Ya existe una hoja con ese nombre.");
    }
    if (e?.status) throw e;
    // Sin red: cae al renombre local.
  }

  if (wasLocal) {
    if (clashLocal) throw new Error("Ya existe una hoja con ese nombre.");
    set(SHEETS_KEY, locals.map((n) => (n === from ? clean : n)));
    return true;
  }
  throw new Error("Sin conexión: no se pudo renombrar.");
}

export function lastSheet() {
  return get(LAST_KEY, "");
}

export function saveLastSheet(name) {
  set(LAST_KEY, name || "");
}

/** Sube al servidor las hojas creadas sin conexión.
 * Devuelve las confirmadas (creadas o 409: ya existían). Las que siguen
 * fallando quedan en la lista local para el próximo intento. */
async function syncLocalSheets(apiNames) {
  const onServer = new Set(apiNames);
  const keep = [];
  const pushed = [];
  for (const name of localSheets()) {
    if (onServer.has(name)) continue;
    try {
      await req(EP.SHEETS, { method: "POST", body: { name } });
      pushed.push(name);
    } catch (e) {
      if (e?.status === 409) {
        pushed.push(name);
        continue;
      }
      keep.push(name);
    }
  }
  set(SHEETS_KEY, keep);
  return pushed;
}

/** Una sola lista: API + locales, sin duplicados. */
export async function listSheets() {
  let api = [];
  if (USE_MOCK) {
    api = [...((await mockData()).sheets || [])];
  } else {
    try {
      const data = await req(EP.SHEETS);
      api = (Array.isArray(data) ? data : []).map((s) => s?.name).filter((n) => typeof n === "string");
      // Lo creado en la página termina en la DB: si algo quedó solo local, se sube ahora.
      api = [...api, ...(await syncLocalSheets(api))];
    } catch {
      api = [];
    }
  }
  return [...new Set([...api, ...localSheets()])];
}

/** Etiqueta corta para el pie: "Inglés - 2026 Septiembre" → "Septiembre". */
function shortMonth(name) {
  const t = String(name || "").trim();
  const after = t.includes(" - ") ? t.split(" - ").pop().trim() : t;
  const parts = after.split(/\s+/);
  return parts[parts.length - 1] || t;
}

/** Totales por mes para el pastel: 2 GET (sheets + rows) y se agrupa acá.
 * En mock se agrupa igual desde data.json (una hoja ≈ un mes).
 * Con area, suma solo sus filas. */
export async function getMonthlyTotals(area = null) {
  const only = AREAS.includes(area) ? area : null;
  const totals = new Map();
  if (USE_MOCK) {
    const m = await mockData();
    for (const name of m.sheets || []) {
      let t = 0;
      for (const r of parseRows(m.rows?.[name] || [])) {
        if (only && (r.area || "ingles") !== only) continue;
        t += r.secs;
      }
      if (t > 0) totals.set(name, t);
    }
  } else {
    const [sheets, rows] = await Promise.all([req(EP.SHEETS), req(EP.ROWS)]);
    const arr = Array.isArray(sheets) ? sheets : [];
    const secsById = new Map();
    for (const e of Array.isArray(rows) ? rows : []) {
      const r = normalizeEntry(e);
      if (!r || typeof e?.sheet_id !== "number") continue;
      if (only && r.area !== only) continue;
      secsById.set(e.sheet_id, (secsById.get(e.sheet_id) || 0) + r.secs);
    }
    // El orden lo define la API (/sheets cronológico): acá no se sortea.
    for (const s of arr) {
      const total = secsById.get(s?.id) || 0;
      if (total > 0 && s?.name) totals.set(s.name, total);
    }
  }
  const out = [];
  for (const [month, total] of totals) {
    if (total > 0) out.push({ month, label: shortMonth(month), total });
  }
  return out;
}

/* ---------- filas: siempre frescas de la API ---------- */

function pending() {
  const v = get(PENDING_KEY, []);
  return Array.isArray(v) ? v : [];
}

function pendingFor(sheet) {
  return pending().filter((p) => p.sheet === sheet);
}

/** La cola ya guarda payloads REST; se normalizan a fila para la grilla. */
function pendingToRow(p) {
  const r = normalizeEntry(p);
  if (!r) return null;
  return { ...r, row: null };
}

export async function getRows(sheet) {
  try {
    if (USE_MOCK) {
      const matrix = (await mockData()).rows?.[sheet] || [];
      const queued = pendingFor(sheet).map(pendingToRow).filter(Boolean);
      return { rows: parseRows(matrix).concat(queued), live: true, error: "" };
    }
    const data = await req(`${EP.ROWS}?${QP.SHEET}=${encodeURIComponent(sheet)}`);
    const queued = pendingFor(sheet).map(pendingToRow).filter(Boolean);
    return { rows: (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean).concat(queued), live: true, error: "" };
  } catch (e) {
    return { rows: pendingFor(sheet).map(pendingToRow).filter(Boolean), live: false, error: e?.message || "error de red" };
  }
}

/* ---------- escribir: POST, si falla se encola ---------- */

/* EntryForm manda {fecha}; se guarda día calendario YYYY-MM-DD, sin hora
   (la hora UTC movía el día según el timezone). El slice conserva los
   payloads en cola con formato ISO legacy. */
function toPayload(entry) {
  return {
    [F.SHEET]: entry.sheet,
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
export async function updateCells(sheet, row, changes) {
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
export async function deleteRowApi(sheet, row) {
  await req(`${EP.ENTRIES}/${row}`, { method: "DELETE" });
}

export function pendingCount(sheet) {
  return sheet ? pendingFor(sheet).length : pending().length;
}
