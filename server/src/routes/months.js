import { Hono } from "hono";
import { listMonths } from "../db/entries.js";
import { fail, ok } from "../http.js";
import { requireAuth } from "../auth.js";

/* Meses con datos: ["2026-08", "2026-09", ...]. El front navega meses,
   ya no hojas. */
const months = new Hono();

months.use("*", requireAuth);

months.get("/", async (c) => {
  try {
    return ok(c, await listMonths(c.env.DB));
  } catch (e) {
    return fail(c, e);
  }
});

export default months;
