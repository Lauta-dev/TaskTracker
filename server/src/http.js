import { MSG } from "./constants.js";

export const STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
});

/* Error con status HTTP: los validators y el store lo lanzan, index.js lo atrapa. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ok = (c, data, status = STATUS.OK) => c.json(data, status);

export const fail = (c, err) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: MSG.INTERNAL }, STATUS.SERVER_ERROR);
};
