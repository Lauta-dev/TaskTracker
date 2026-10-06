import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { MSG } from "../constants.js";
import { endSession, startSession } from "../auth.js";
import { getSessionUser } from "../db/sessions.js";
import { countUsers, createUser, getUserByUsername } from "../db/users.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { hashPassword, verifyPassword } from "../password.js";
import { validateLogin, validateSetup } from "../validators.js";

const auth = new Hono();

/* Hash señuelo con el mismo costo (no filtra por timing si el user no existe). */
const DUMMY_HASH = "$2b$10$SAKrj.tiahE/N9oKnMc6fu5UpZHE3Waonv3yLybfM4pmSsl/gd9WG";

/* GET /auth/status → { setupRequired, username? }. Público: el front decide
   si muestra crear-cuenta, login o la app. */
auth.get("/status", async (c) => {
  try {
    if ((await countUsers(c.env.DB)) === 0) {
      return ok(c, { setupRequired: true });
    }
    const token = getCookie(c, "tt_session");
    const user = token ? await getSessionUser(c.env.DB, token) : null;
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

export default auth;
