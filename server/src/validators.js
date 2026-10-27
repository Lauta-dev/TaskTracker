import {
  AREAS,
  ENTRY,
  ENTRY_REQUIRED,
  ENTRY_UPDATABLE,
  MAX_PASSWORD_LEN,
  MAX_USERNAME_LEN,
  MIN_PASSWORD_LEN,
  MIN_USERNAME_LEN,
  MSG,
} from "./constants.js";
import { HttpError, STATUS } from "./http.js";

/* :id de ruta → entero positivo o 400. */
export function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.INVALID_ID);
  }
  return id;
}

function asString(value, field, { allowEmpty = false } = {}) {
  if (typeof value !== "string") {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.FIELD_MUST_BE_STRING(field));
  }
  if (!allowEmpty && value.trim() === "") {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.FIELD_REQUIRED(field));
  }
  return value;
}

/* POST /auth/setup y /auth/login: username + password con política mínima. */
const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

function validateUsername(raw) {
  const username = asString(raw, "username").trim();
  if (
    username.length < MIN_USERNAME_LEN ||
    username.length > MAX_USERNAME_LEN ||
    !USERNAME_RE.test(username)
  ) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.INVALID_USERNAME);
  }
  return username;
}

function validatePassword(raw) {
  const password = asString(raw, "password");
  if (password.length < MIN_PASSWORD_LEN) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.PASSWORD_TOO_SHORT);
  }
  if (password.length > MAX_PASSWORD_LEN) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.PASSWORD_TOO_LONG);
  }
  return password;
}

export function validateSetup(body) {
  return { username: validateUsername(body?.username), password: validatePassword(body?.password) };
}

export function validateLogin(body) {
  return { username: validateUsername(body?.username), password: validatePassword(body?.password) };
}

/* POST /entries: entry ya normalizado (sin hoja: year/month los deriva el server). */
export function validateEntryCreate(body) {
  const entry = {};
  for (const field of ENTRY_REQUIRED) {
    entry[field] = asString(body?.[field], field, { allowEmpty: OPTIONAL_EMPTY.has(field) });
  }
  if (!AREAS.includes(entry[ENTRY.AREA])) {
    throw new HttpError(STATUS.BAD_REQUEST, `Field 'area' must be one of: ${AREAS.join(", ")}`);
  }
  return entry;
}

/* PATCH /entries/:id: objeto con al menos un campo válido (date valida en la ruta). */
export function validateEntryPatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.EMPTY_PATCH);
  }
  const patch = {};
  for (const [field, value] of Object.entries(body)) {
    if (!ENTRY_UPDATABLE.includes(field)) {
      throw new HttpError(STATUS.BAD_REQUEST, MSG.UNKNOWN_FIELD(field));
    }
    patch[field] = asString(value, field, { allowEmpty: true });
  }
  if (patch[ENTRY.AREA] !== undefined && !AREAS.includes(patch[ENTRY.AREA])) {
    throw new HttpError(STATUS.BAD_REQUEST, `Field 'area' must be one of: ${AREAS.join(", ")}`);
  }
  if (Object.keys(patch).length === 0) {
    throw new HttpError(STATUS.BAD_REQUEST, MSG.EMPTY_PATCH);
  }
  return patch;
}

/* Qué campos aceptan "" (nota/url pueden ir vacías; duración también:
   ejercicio es sesión simple con duración opcional). */
const OPTIONAL_EMPTY = new Set([ENTRY.NOTE, ENTRY.URL, ENTRY.DURATION]);
