import { Hono } from "hono";
import { ENTRY, QUERY } from "../constants.js";
import { yearMonthOf } from "../db/entries.js";
import { listEntries } from "../db/entries.js";
import { fail, ok } from "../http.js";
import { requireAuth } from "../auth.js";

/* Lectura para el frontend:
   GET /rows                → todo
   GET /rows?year=2026      → por año
   GET /rows?year=2026&month=10 → por mes */
const rows = new Hono();

rows.use("*", requireAuth);

rows.get("/", async (c) => {
  try {
    const year = c.req.query(QUERY.YEAR);
    const month = c.req.query(QUERY.MONTH);
    const filters = {};
    if (year != null && /^\d{4}$/.test(year)) filters.year = Number(year);
    if (month != null && /^\d{1,2}$/.test(month)) filters.month = Number(month);
    return ok(c, await listEntries(c.env.DB, filters));
  } catch (e) {
    return fail(c, e);
  }
});

export default rows;
