import { Hono } from "hono";
import { MSG, QUERY } from "../constants.js";
import { listEntries } from "../db/entries.js";
import { getSheetByName } from "../db/sheets.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { parseId } from "../validators.js";

/* Alias de lectura para la migración del frontend:
   GET /rows                → todo
   GET /rows?sheetId=1      → por id
   GET /rows?sheet=Nombre   → por nombre (como el GAS de hoy) */
const rows = new Hono();

rows.get("/", async (c) => {
  try {
    const byId = c.req.query(QUERY.SHEET_ID);
    const byName = c.req.query(QUERY.SHEET);
    if (byId != null) return ok(c, await listEntries(c.env.DB, parseId(byId)));
    if (byName != null) {
      const sheet = await getSheetByName(c.env.DB, byName);
      if (!sheet) throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
      return ok(c, await listEntries(c.env.DB, sheet.id));
    }
    return ok(c, await listEntries(c.env.DB));
  } catch (e) {
    return fail(c, e);
  }
});

export default rows;
