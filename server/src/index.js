import { Hono } from "hono";
import { cors } from "hono/cors";
import { MSG } from "./constants.js";
import { fail, STATUS } from "./http.js";
import entries from "./routes/entries.js";
import rows from "./routes/rows.js";
import sheets from "./routes/sheets.js";

const app = new Hono();

/* El front (vite :5173) llama a esta API (:8787): sin CORS el navegador bloquea. */
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.route("/sheets", sheets);
app.route("/entries", entries);
app.route("/rows", rows);

app.notFound((c) => c.json({ error: MSG.NOT_FOUND }, STATUS.NOT_FOUND));
app.onError((err, c) => fail(c, err));

export default app;
