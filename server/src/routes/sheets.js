import { Hono } from "hono";
import { MSG, PARAM } from "../constants.js";
import { createSheet, deleteSheet, getSheetById, getSheetByName, listSheets, renameSheet } from "../db/sheets.js";
import { listEntries } from "../db/entries.js";
import { fail, HttpError, ok, STATUS } from "../http.js";
import { parseId, validateSheetCreate, validateSheetUpdate } from "../validators.js";

const sheets = new Hono();

sheets.get("/", async (c) => {
  try {
    return ok(c, await listSheets(c.env.DB));
  } catch (e) {
    return fail(c, e);
  }
});

sheets.post("/", async (c) => {
  try {
    const { name } = validateSheetCreate(await c.req.json());
    if (await getSheetByName(c.env.DB, name)) {
      throw new HttpError(STATUS.CONFLICT, MSG.SHEET_EXISTS);
    }
    return ok(c, await createSheet(c.env.DB, name), STATUS.CREATED);
  } catch (e) {
    return fail(c, e);
  }
});

sheets.get(`/:${PARAM.ID}/rows`, async (c) => {
  try {
    const id = parseId(c.req.param(PARAM.ID));
    if (!(await getSheetById(c.env.DB, id))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
    }
    return ok(c, await listEntries(c.env.DB, id));
  } catch (e) {
    return fail(c, e);
  }
});

sheets.delete(`/:${PARAM.ID}`, async (c) => {
  try {
    const id = parseId(c.req.param(PARAM.ID));
    if (!(await deleteSheet(c.env.DB, id))) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
    }
    return ok(c, { deleted: id });
  } catch (e) {
    return fail(c, e);
  }
});

sheets.patch(`/:${PARAM.ID}`, async (c) => {
  try {
    const id = parseId(c.req.param(PARAM.ID));
    const { name } = validateSheetUpdate(await c.req.json());
    const current = await getSheetById(c.env.DB, id);
    if (!current) {
      throw new HttpError(STATUS.NOT_FOUND, MSG.SHEET_NOT_FOUND);
    }
    if (current.name !== name && (await getSheetByName(c.env.DB, name))) {
      throw new HttpError(STATUS.CONFLICT, MSG.SHEET_EXISTS);
    }
    return ok(c, await renameSheet(c.env.DB, id, name));
  } catch (e) {
    return fail(c, e);
  }
});

export default sheets;
