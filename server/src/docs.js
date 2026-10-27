import { ENTRY, ENTRY_REQUIRED, ENTRY_UPDATABLE, PARAM, QUERY } from "./constants.js";

/* Documentación viva de la API: se arma desde las mismas constantes que
   usan las rutas, así no se desincroniza. GET /docs la devuelve. */
const ID = `:${PARAM.ID}`;

const entryExample = {
  id: 1,
  [ENTRY.DATE]: "2026-10-01",
  [ENTRY.YEAR]: 2026,
  [ENTRY.MONTH]: 10,
  [ENTRY.TYPE]: "Listening",
  [ENTRY.SOURCE]: "Serie",
  [ENTRY.CONTENT]: "The Office S01 E05",
  [ENTRY.DURATION]: "0:23:00",
  [ENTRY.NOTE]: "",
  [ENTRY.URL]: "https://example.com",
  [ENTRY.AREA]: "ingles",
};

export const API_DOCS = {
  name: "tasktracker-api",
  version: "2.0.0",
  errors: "Todos los errores responden { error: string } con su status HTTP.",
  auth: "Sesión en cookie HttpOnly (tt_session): el front usa fetch con credentials: include. GET /auth/status dice si falta crear la cuenta o si hay sesión. /entries, /months y /rows exigen sesión (401) y chequean Origin (403).",
  endpoints: [
    { method: "GET", path: "/health", description: "Pulso del Worker.", response: { ok: true } },
    { method: "GET", path: "/docs", description: "Esta documentación." },
    {
      method: "GET", path: "/auth/status", description: "Estado público: si falta setup o hay sesión.",
      response: { setupRequired: false, username: "tu-user" },
    },
    {
      method: "POST", path: "/auth/setup", description: "Crea LA cuenta. Solo con tabla vacía: después 403.",
      body: { username: "tu-user", password: "tu-clave" }, response: { username: "tu-user" }, status: 201,
    },
    {
      method: "POST", path: "/auth/login", description: "Login (mismo 401 exista o no el user). Setea la cookie de sesión.",
      body: { username: "tu-user", password: "tu-clave" }, response: { username: "tu-user" },
    },
    {
      method: "POST", path: "/auth/logout", description: "Revoca la sesión y limpia la cookie.",
      response: { ok: true },
    },
    {
      method: "GET", path: "/months", description: "Meses con datos, cronológicos.",
      response: ["2026-09", "2026-10"],
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
      method: "POST", path: "/entries", description: `Crea una entry: ${ENTRY_REQUIRED.join(", ")}. El server deriva year/month de date.`,
      body: Object.fromEntries(ENTRY_REQUIRED.map((f) => [f, entryExample[f]])),
      response: entryExample, status: 201,
    },
    {
      method: "PATCH", path: `/entries/${ID}`, description: `Actualización parcial. Campos: ${ENTRY_UPDATABLE.join(", ")}. Si cambia date, year/month se recalculan.`,
      params: { [PARAM.ID]: "entero positivo" },
      body: { [ENTRY.NOTE]: "editada" }, response: entryExample,
    },
    {
      method: "DELETE", path: `/entries/${ID}`, description: "Borra una entry.",
      params: { [PARAM.ID]: "entero positivo" }, response: { deleted: 1 },
    },
    {
      method: "GET", path: "/rows", description: "Alias de lectura para el frontend: todo, o filtrado por mes.",
      query: { [QUERY.YEAR]: "2026 (opcional)", [QUERY.MONTH]: "10 (opcional)" },
      response: [entryExample],
    },
  ],
};
