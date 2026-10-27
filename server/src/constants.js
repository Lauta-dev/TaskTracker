/* Nombres de tablas, columnas, params y mensajes en un solo lugar.
   Nada de strings sueltos en queries ni rutas. */

export const TABLES = Object.freeze({
  ENTRIES: "entries",
});

export const ENTRY = Object.freeze({
  ID: "id",
  DATE: "date",
  YEAR: "year",
  MONTH: "month",
  TYPE: "type",
  SOURCE: "source",
  CONTENT: "content",
  DURATION: "duration",
  NOTE: "note",
  URL: "url",
  AREA: "area",
});

/* Campos obligatorios al crear (miran el NOT NULL del schema).
   year/month NO vienen del cliente: el server los deriva de date. */
export const ENTRY_REQUIRED = Object.freeze([
  ENTRY.DATE,
  ENTRY.TYPE,
  ENTRY.SOURCE,
  ENTRY.CONTENT,
  ENTRY.DURATION,
  ENTRY.NOTE,
  ENTRY.URL,
  ENTRY.AREA,
]);

/* Áreas válidas (hojas mixtas: cada entrada lleva su área). */
export const AREAS = Object.freeze(["ingles", "ejercicio", "matematica"]);

/* Campos que acepta el PATCH (todo menos el id). */
export const ENTRY_UPDATABLE = Object.freeze([...ENTRY_REQUIRED]);

/* Params de ruta: /entries/:id */
export const PARAM = Object.freeze({ ID: "id" });

/* Query params: /rows?year=2026&month=10 */
export const QUERY = Object.freeze({ YEAR: "year", MONTH: "month" });

/* Auth: límites del setup/login. */
export const MIN_USERNAME_LEN = 3;
export const MAX_USERNAME_LEN = 32;
export const MIN_PASSWORD_LEN = 8;
export const MAX_PASSWORD_LEN = 128;

export const MSG = Object.freeze({
  NOT_FOUND: "Not found",
  INVALID_ID: "Invalid id: must be a positive integer",
  ENTRY_NOT_FOUND: "Entry not found",
  INVALID_DATE: "Field 'date' must be a valid date (YYYY-MM-DD)",
  FIELD_REQUIRED: (field) => `Field '${field}' is required`,
  FIELD_MUST_BE_STRING: (field) => `Field '${field}' must be a string`,
  EMPTY_PATCH: "Nothing to update: provide at least one field",
  UNKNOWN_FIELD: (field) => `Unknown field '${field}'`,
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  INVALID_CREDENTIALS: "Invalid username or password",
  SETUP_DISABLED: "Setup is disabled: a user already exists",
  INVALID_USERNAME: `Username must be ${MIN_USERNAME_LEN}-${MAX_USERNAME_LEN} chars (letters, numbers, _ or -)`,
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LEN} chars`,
  PASSWORD_TOO_LONG: `Password must be at most ${MAX_PASSWORD_LEN} chars`,
  AUTH_NOT_CONFIGURED: "Auth not configured",
  INTERNAL: "Internal error",
});
