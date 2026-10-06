import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { MSG } from "./constants.js";
import { createSession, deleteSession, getSessionUser } from "./db/sessions.js";
import { HttpError, STATUS } from "./http.js";
import { randomToken } from "./password.js";

/* Sesión en cookie HttpOnly: el JS nunca toca el token (XSS no lo roba).
   SameSite=Lax frena CSRF cross-site; el chequeo de Origin lo cierra. */
const COOKIE = "tt_session";
const TTL_SECS = 60 * 60 * 24 * 30; /* 30 días */

function isHttps(c) {
  return new URL(c.req.url).protocol === "https:";
}

/* Orígenes con permiso: el propio (front y API mismo dominio) + extras de env. */
export function getAllowedOrigins(c) {
  const extra = String(c.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([new URL(c.req.url).origin, ...extra]);
}

/* Anti-CSRF: si el navegador manda Origin y no es de los nuestros → 403. */
function assertNoCsrf(c) {
  const origin = c.req.header("Origin");
  if (origin && !getAllowedOrigins(c).has(origin)) {
    throw new HttpError(STATUS.FORBIDDEN, MSG.FORBIDDEN);
  }
}

export async function startSession(c, userId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_SECS * 1000).toISOString();
  await createSession(c.env.DB, userId, token, expiresAt);
  setCookie(c, COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isHttps(c),
    maxAge: TTL_SECS,
  });
}

export async function endSession(c) {
  const token = getCookie(c, COOKIE);
  if (token) await deleteSession(c.env.DB, token);
  deleteCookie(c, COOKIE, { path: "/", secure: isHttps(c) });
}

/* Middleware: exige sesión válida en cookie (401 si no). Deja el user en contexto. */
export async function requireAuth(c, next) {
  assertNoCsrf(c);
  const token = getCookie(c, COOKIE);
  const user = token ? await getSessionUser(c.env.DB, token) : null;
  if (!user) {
    throw new HttpError(STATUS.UNAUTHORIZED, MSG.UNAUTHORIZED);
  }
  c.set("user", user);
  await next();
}
