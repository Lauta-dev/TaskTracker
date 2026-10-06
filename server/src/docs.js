import { BODY, ENTRY, ENTRY_REQUIRED, ENTRY_UPDATABLE, PARAM, QUERY } from "./constants.js";

/* Documentación viva de la API: se arma desde las mismas constantes que
   usan las rutas, así no se desincroniza. GET /docs la devuelve. */
const ID = `:${PARAM.ID}`;

const entryExample = {
  id: 1,
  [ENTRY.SHEET_ID]: 1,
  [ENTRY.DATE]: "2026-09-01T03:00:00.000Z",
  [ENTRY.TYPE]: "Listening",
  [ENTRY.SOURCE]: "Serie",
  [ENTRY.CONTENT]: "The Office S01 E05",
  [ENTRY.DURATION]: "0:23:00",
  [ENTRY.NOTE]: "",
  [ENTRY.URL]: "https://example.com",
};

export const API_DOCS = {
  name: "tasktracker-api",
  version: "1.0.0",
  errors: "Todos los errores responden { error: string } con su status HTTP.",
  endpoints: [
    { method: "GET", path: "/health", description: "Pulso del Worker.", response: { ok: true } },
    { method: "GET", path: "/docs", description: "Esta documentación." },
    {
      method: "GET", path: "/sheets", description: "Lista las hojas en orden cronológico (sin fecha al final, alfabéticas).",
      response: [{ id: 1, name: "Inglés - 2026 Septiembre" }],
    },
    {
      method: "POST", path: "/sheets", description: "Crea una hoja (409 si el nombre existe).",
      body: { name: "Inglés - 2026 Noviembre" }, status: 201,
    },
    {
      method: "GET", path: `/sheets/${ID}/rows`, description: "Filas de una hoja (404 si no existe).",
      params: { [PARAM.ID]: "entero positivo" }, response: [entryExample],
    },
    {
      method: "DELETE", path: `/sheets/${ID}`, description: "Borra la hoja y sus entries.",
      params: { [PARAM.ID]: "entero positivo" }, response: { deleted: 1 },
    },
    {
      method: "PATCH", path: `/sheets/${ID}`, description: "Renombra la hoja (404 si no existe, 409 si el nombre existe).",
      params: { [PARAM.ID]: "entero positivo" },
      body: { name: "Inglés - 2026 Noviembre" }, response: { id: 1, name: "Inglés - 2026 Noviembre" },
    },
    {
      method: "GET", path: "/entries", description: "Todas las entries.",
      response: [entryExample],
    },
    {
      method: "GET", path: `/entries/${ID}`, description: "Una entry (404 si no existe).",
      params: { [PARAM.ID]: "entero positivo" }, response: entryExample,
    },
    {
      method: "POST", path: "/entries", description: `Crea una entry. Requiere ${ENTRY_REQUIRED.join(", ")} y una referencia a hoja: ${BODY.SHEET_ID} o ${BODY.SHEET} (nombre).`,
      body: { [BODY.SHEET]: "Inglés - 2026 Septiembre", ...Object.fromEntries(ENTRY_REQUIRED.map((f) => [f, entryExample[f]])) },
      status: 201,
    },
    {
      method: "PATCH", path: `/entries/${ID}`, description: `Actualización parcial. Campos: ${ENTRY_UPDATABLE.join(", ")}.`,
      params: { [PARAM.ID]: "entero positivo" },
      body: { [ENTRY.NOTE]: "editada" }, response: entryExample,
    },
    {
      method: "DELETE", path: `/entries/${ID}`, description: "Borra una entry.",
      params: { [PARAM.ID]: "entero positivo" }, response: { deleted: 1 },
    },
    {
      method: "GET", path: "/rows", description: "Alias de lectura para el frontend: todo, o filtrado por hoja.",
      query: { [QUERY.SHEET_ID]: "entero positivo (opcional)", [QUERY.SHEET]: "nombre de hoja (opcional)" },
      response: [entryExample],
    },
  ],
};
