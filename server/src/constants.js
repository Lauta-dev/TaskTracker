/* Nombres de tablas, columnas, params y mensajes en un solo lugar.
   Nada de strings sueltos en queries ni rutas. */

export const TABLES = Object.freeze({
  SHEETS: "sheets",
  ENTRIES: "entries",
});

export const SHEET = Object.freeze({
  ID: "id",
  NAME: "name",
});

export const ENTRY = Object.freeze({
  ID: "id",
  SHEET_ID: "sheet_id",
  DATE: "date",
  TYPE: "type",
  SOURCE: "source",
  CONTENT: "content",
  DURATION: "duration",
  NOTE: "note",
  URL: "url",
});

/* Campos obligatorios al crear (miran el NOT NULL del schema). */
export const ENTRY_REQUIRED = Object.freeze([
  ENTRY.DATE,
  ENTRY.TYPE,
  ENTRY.SOURCE,
  ENTRY.CONTENT,
  ENTRY.DURATION,
  ENTRY.NOTE,
  ENTRY.URL,
]);

/* Campos que acepta el PATCH (todo menos el id). */
export const ENTRY_UPDATABLE = Object.freeze([...ENTRY_REQUIRED, ENTRY.SHEET_ID]);

/* Params de ruta: /sheets/:id, /entries/:id */
export const PARAM = Object.freeze({ ID: "id" });

/* Query params: /rows?sheetId=1 o ?sheet=Nombre */
export const QUERY = Object.freeze({ SHEET_ID: "sheetId", SHEET: "sheet" });

/* Body del POST /entries: sheetId o sheet (nombre), uno de los dos. */
export const BODY = Object.freeze({ SHEET_ID: "sheetId", SHEET: "sheet" });

export const MAX_SHEET_NAME = 120;

export const MSG = Object.freeze({
  NOT_FOUND: "Not found",
  INVALID_ID: "Invalid id: must be a positive integer",
  SHEET_NAME_REQUIRED: "Sheet name is required",
  SHEET_NAME_TOO_LONG: `Sheet name must be at most ${MAX_SHEET_NAME} characters`,
  SHEET_EXISTS: "Sheet already exists",
  SHEET_NOT_FOUND: "Sheet not found",
  ENTRY_NOT_FOUND: "Entry not found",
  SHEET_REF_REQUIRED: "Provide sheetId or sheet (name)",
  FIELD_REQUIRED: (field) => `Field '${field}' is required`,
  FIELD_MUST_BE_STRING: (field) => `Field '${field}' must be a string`,
  EMPTY_PATCH: "Nothing to update: provide at least one field",
  UNKNOWN_FIELD: (field) => `Unknown field '${field}'`,
  INTERNAL: "Internal error",
});
