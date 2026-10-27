import { Hono } from "hono";
import { MSG } from "../constants.js";
import {
  createEntry,
  deleteEntry,
  getEntryById,
  listEntries,
  updateEntry,
  yearMonthOf,
} from "../db/entries.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { parseId, validateEntryCreate, validateEntryPatch } from "../validators.js";
import { requireAuth } from "../auth.js";

const entries = new Hono();

entries.use("*", requireAuth);

entries.get("/", async (c) => {
  try {
    return ok(c, await listEntries(c.env.DB));
  } catch (e) {
    return fail(c, e);
  }
});

entries.get("/:id", async (c) => {
  try {
    const row = await getEntryById(c.env.DB, parseId(c.req.param("id")));
    if (!row) throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    return ok(c, row);
  } catch (e) {
    return fail(c, e);
  }
});

entries.post("/", async (c) => {
  try {
    const entry = validateEntryCreate(await c.req.json());
    if (!yearMonthOf(entry.date)) {
      throw new HttpError(STATUS.BAD_REQUEST, MSG.INVALID_DATE);
    }
    return ok(c, await createEntry(c.env.DB, entry), STATUS.CREATED);
  } catch (e) {
    return fail(c, e);
  }
});

entries.patch("/:id", async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    const patch = validateEntryPatch(await c.req.json());
    if (patch.date !== undefined) {
      const ym = yearMonthOf(patch.date);
      if (!ym) throw new HttpError(STATUS.BAD_REQUEST, MSG.INVALID_DATE);
      patch.year = ym.year;
      patch.month = ym.month;
    }
    if (!(await updateEntry(c.env.DB, id, patch))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    }
    return ok(c, await getEntryById(c.env.DB, id));
  } catch (e) {
    return fail(c, e);
  }
});

entries.delete("/:id", async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    if (!(await deleteEntry(c.env.DB, id))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    }
    return ok(c, { deleted: id });
  } catch (e) {
    return fail(c, e);
  }
});

export default entries;
