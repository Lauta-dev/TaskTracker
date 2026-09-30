import { Hono } from "hono";
import { ENTRY, MSG, PARAM } from "../constants.js";
import {
  createEntry,
  deleteEntry,
  getEntryById,
  listEntries,
  updateEntry,
} from "../db/entries.js";
import { getSheetById, getSheetByName } from "../db/sheets.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { parseId, validateEntryCreate, validateEntryPatch } from "../validators.js";

const entries = new Hono();

/* Resuelve a qué hoja apunta el POST: sheetId directo o nombre. */
async function resolveSheetId(db, sheetId, sheetName) {
  if (sheetId != null) {
    if (!(await getSheetById(db, sheetId))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
    }
    return sheetId;
  }
  const sheet = await getSheetByName(db, sheetName);
  if (!sheet) throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
  return sheet.id;
}

entries.get("/", async (c) => {
  try {
    return ok(c, await listEntries(c.env.DB));
  } catch (e) {
    return fail(c, e);
  }
});

entries.get(`/:${PARAM.ID}`, async (c) => {
  try {
    const row = await getEntryById(c.env.DB, parseId(c.req.param(PARAM.ID)));
    if (!row) throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    return ok(c, row);
  } catch (e) {
    return fail(c, e);
  }
});

entries.post("/", async (c) => {
  try {
    const { entry, sheetId, sheetName } = validateEntryCreate(await c.req.json());
    const id = await resolveSheetId(c.env.DB, sheetId, sheetName);
    return ok(c, await createEntry(c.env.DB, id, entry), STATUS.CREATED);
  } catch (e) {
    return fail(c, e);
  }
});

entries.patch(`/:${PARAM.ID}`, async (c) => {
  try {
    const id = parseId(c.req.param(PARAM.ID));
    const patch = validateEntryPatch(await c.req.json());
    if (patch[ENTRY.SHEET_ID] !== undefined && !(await getSheetById(c.env.DB, patch[ENTRY.SHEET_ID]))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
    }
    if (!(await updateEntry(c.env.DB, id, patch))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    }
    return ok(c, await getEntryById(c.env.DB, id));
  } catch (e) {
    return fail(c, e);
  }
});

entries.delete(`/:${PARAM.ID}`, async (c) => {
  try {
    const id = parseId(c.req.param(PARAM.ID));
    if (!(await deleteEntry(c.env.DB, id))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.ENTRY_NOT_FOUND);
    }
    return ok(c, { deleted: id });
  } catch (e) {
    return fail(c, e);
  }
});

export default entries;
