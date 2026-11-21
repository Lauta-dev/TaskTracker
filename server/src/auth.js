import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { AUTH, MSG } from "./constants.js";
import { getApiKeyUser } from "./db/apiKeys.js";
import { createSession, deleteSession, getSessionUser } from "./db/sessions.js";
import { getFirstUserId } from "./db/users.js";
import { HttpError, STATUS } from "./http.js";
import { randomToken } from "./password.js";

/* Doble vía de autenticación:
   - cookie HttpOnly (tt_session): PWA, el JS nunca toca el token (XSS no lo roba).
     SameSite=Lax frena CSRF cross-site; el chequeo de Origin lo cierra.
   - API key en Authorization: Bearer <key>: clientes no navegador (escritorio),
     que no pueden usar cookies. La key se guarda hasheada en D1 y es revocable. */
const COOKIE = "tt_session";
const TTL_SECS = 60 * 60 * 24 * 30; /* 30 días */

function isHttps(c) {
  return new URL(c.req.url).protocol === "https:";
}

/* Si el front vive en otro sitio (cross-site), Lax no viaja en fetch:
   se usa None + Secure (solo https). Mismo sitio: Lax. */
function sessionCookieOpts(c) {
  const origin = c.req.header("Origin");
  const crossSite = !!origin && origin !== new URL(c.req.url).origin;
  return {
    path: "/",
    httpOnly: true,
    sameSite: crossSite ? "None" : "Lax",
    secure: crossSite ? true : isHttps(c),
    maxAge: TTL_SECS,
  };
}

/* Orígenes con permiso: el propio (front y API mismo dominio) + extras de env. */
export function getAllowedOrigins(c) {
  const extra = String(c.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([new URL(c.req.url).origin, ...extra]);
}

/* Anti-CSRF: si el navegador manda Origin y no es de los nuestros → 403.
   Solo aplica a la cookie: con API key la credencial viaja explícitamente. */
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
  setCookie(c, COOKIE, token, sessionCookieOpts(c));
}

export async function endSession(c) {
  const token = getCookie(c, COOKIE);
  if (token) await deleteSession(c.env.DB, token);
  const { maxAge: _maxAge, ...clearOpts } = sessionCookieOpts(c);
  deleteCookie(c, COOKIE, clearOpts);
}

/* Usuario desde la cookie de sesión (PWA), o null. */
export async function cookieUser(c) {
  const token = getCookie(c, COOKIE);
  return token ? getSessionUser(c.env.DB, token) : null;
}

/* Usuario desde Authorization: Bearer <key> (escritorio), o null si no hay header.
   Si el header existe pero está mal formado / la key no sirve → 401. */
export async function bearerUser(c) {
  const header = c.req.header(AUTH.HEADER);
  if (!header) return null;
  const match = new RegExp(`^${AUTH.SCHEME}\\s+(.+)$`, "i").exec(header.trim());
  const key = match?.[1]?.trim();
  if (!key) throw new HttpError(STATUS.UNAUTHORIZED, MSG.INVALID_API_KEY);
  const user = await getApiKeyUser(c.env.DB, key);
  if (!user) throw new HttpError(STATUS.UNAUTHORIZED, MSG.INVALID_API_KEY);
  return user;
}

/* Resuelve la identidad de la request: KEY primero, cookie después. */
export async function requestUser(c) {
  return (await bearerUser(c)) || (await cookieUser(c));
}

/* Middleware: exige KEY o sesión válida (401 si no). Deja el user en contexto. */
export async function requireAuth(c, next) {
  const usingKey = !!c.req.header(AUTH.HEADER);
  if (!usingKey) assertNoCsrf(c);
  const user = await requestUser(c);
  if (!user) {
    throw new HttpError(STATUS.UNAUTHORIZED, MSG.UNAUTHORIZED);
  }
  c.set("user", user);
  await next();
}

/* ---------- Admin key (gestión de keys sin navegador) ---------- */

/* Comparación de secretos en tiempo (casi) constante: no filtra por timing. */
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a ?? ""));
  const bb = enc.encode(String(b ?? ""));
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

/* ADMIN_KEY es un secreto de entorno, no una key en D1: sirve SOLO para
   administrar keys. Nunca autoriza /entries, /rows ni /months. */
export function isAdminKey(c) {
  const admin = c.env.ADMIN_KEY;
  if (!admin) return false;
  const header = c.req.header(AUTH.HEADER);
  if (!header) return false;
  const match = new RegExp(`^${AUTH.SCHEME}\\s+(.+)$`, "i").exec(header.trim());
  const token = match?.[1]?.trim();
  return !!token && safeEqual(token, admin);
}

/* Middleware para /auth/keys: la admin key pasa sin cookie; si no, la ruta
   sigue aceptando cookie o key normal. Las keys creadas por el admin se
   asocian a la cuenta única. */
export async function requireKeyAdmin(c, next) {
  if (!isAdminKey(c)) return requireAuth(c, next);
  const userId = await getFirstUserId(c.env.DB);
  if (!userId) throw new HttpError(STATUS.UNAUTHORIZED, MSG.NO_ACCOUNT);
  c.set("user", { id: userId, username: "admin" });
  await next();
}
