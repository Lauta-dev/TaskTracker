import { Hono } from "hono";
import { MAX_KEY_NAME_LEN, MSG } from "../constants.js";
import { bearerUser, cookieUser, endSession, requireKeyAdmin, startSession } from "../auth.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../db/apiKeys.js";
import { countUsers, createUser, getUserByUsername } from "../db/users.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { hashPassword, randomToken, verifyPassword } from "../password.js";
import { parseId, validateLogin, validateSetup } from "../validators.js";

const auth = new Hono();

/* Hash señuelo con el mismo costo (no filtra por timing si el user no existe). */
const DUMMY_HASH = "$2b$10$SAKrj.tiahE/N9oKnMc6fu5UpZHE3Waonv3yLybfM4pmSsl/gd9WG";

/* GET /auth/status → { setupRequired, username? }. Público: el front decide
   si muestra crear-cuenta, login o la app. Acepta cookie o key para identificar. */
auth.get("/status", async (c) => {
  try {
    if ((await countUsers(c.env.DB)) === 0) {
      return ok(c, { setupRequired: true });
    }
    const user = (await bearerUser(c)) || (await cookieUser(c));
    return ok(c, user ? { setupRequired: false, username: user.username } : { setupRequired: false });
  } catch (e) {
    return fail(c, e);
  }
});

/* POST /auth/setup { username, password }: crea LA cuenta. Solo anda con la
   tabla vacía (después 403): no hay registro público. */
auth.post("/setup", async (c) => {
  try {
    if ((await countUsers(c.env.DB)) > 0) {
      throw new HttpError(STATUS.FORBIDDEN, MSG.SETUP_DISABLED);
    }
    const { username, password } = validateSetup(await c.req.json());
    const id = await createUser(c.env.DB, username, await hashPassword(password));
    await startSession(c, id);
    return ok(c, { username }, STATUS.CREATED);
  } catch (e) {
    return fail(c, e);
  }
});

/* POST /auth/login { username, password }: mismo 401 exista o no el user. */
auth.post("/login", async (c) => {
  try {
    const { username, password } = validateLogin(await c.req.json());
    const user = await getUserByUsername(c.env.DB, username);
    const valid = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) {
      throw new HttpError(STATUS.UNAUTHORIZED, MSG.INVALID_CREDENTIALS);
    }
    await startSession(c, user.id);
    return ok(c, { username: user.username });
  } catch (e) {
    return fail(c, e);
  }
});

/* POST /auth/logout: revoca la sesión y limpia la cookie. */
auth.post("/logout", async (c) => {
  try {
    await endSession(c);
    return ok(c, { ok: true });
  } catch (e) {
    return fail(c, e);
  }
});

/* ---------- API keys (clientes no navegador) ---------- */

/* Gestión de keys: requireKeyAdmin acepta la ADMIN_KEY del entorno (sin
   navegador) o, si no, cookie/key normal. Se aplica por ruta para cubrir
   también /keys/:id. */

/* POST /auth/keys { name? }: crea una key. El texto plano se devuelve SOLO
   acá: después en DB queda el hash y no se puede recuperar. */
auth.post("/keys", requireKeyAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const name = body?.name == null ? "" : String(body.name).trim();
    if (name.length > MAX_KEY_NAME_LEN) {
      throw new HttpError(STATUS.BAD_REQUEST, MSG.INVALID_KEY_NAME);
    }
    const raw = randomToken();
    const id = await createApiKey(c.env.DB, c.get("user").id, name, raw);
    return ok(c, { id, name, key: raw }, STATUS.CREATED);
  } catch (e) {
    return fail(c, e);
  }
});

/* GET /auth/keys: metadata de las keys (nunca el key ni su hash). */
auth.get("/keys", requireKeyAdmin, async (c) => {
  try {
    return ok(c, await listApiKeys(c.env.DB, c.get("user").id));
  } catch (e) {
    return fail(c, e);
  }
});

/* DELETE /auth/keys/:id: revoca una key (efecto inmediato). */
auth.delete("/keys/:id", requireKeyAdmin, async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    if (!(await revokeApiKey(c.env.DB, c.get("user").id, id))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.KEY_NOT_FOUND);
    }
    return ok(c, { revoked: id });
  } catch (e) {
    return fail(c, e);
  }
});

export default auth;
