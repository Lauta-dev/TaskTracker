# Tinta · Log de inmersión

Calendario de horas de inmersión (inglés, ejercicio, matemática): a más horas, más color. App mobile-first instalable (PWA) que lee y escribe en su API propia (worker + D1).

## Vistas

- **Grilla**: heatmap del mes (Lun–Dom) con header propio (mes + año a la izquierda, botones ◀ ▶ a la derecha), columna "Semana" con el total de cada semana, total del mes y detalle por día en drawer.
- **Pastel**: duraciones totales por mes (con filtro por área).
- **Tabla**: todos los registros del mes.
- **Actividades**: gestión de tipos/fuentes propios por área.
- **Registro**: FAB (+) que abre el formulario en modal (día, tipo, habilidad, duración, contenido, url, nota). Sin conexión, queda en cola y se manda solo.

El mes activo viaja en `?month=YYYY-MM`: el mes existe en cuanto hay una entrada con esa fecha, no hay hojas que crear. La navegación vive en el header del heatmap.

## Datos

- Una sola tabla `entries`; cada fila lleva `date` (YYYY-MM-DD) y `year`/`month`, derivados por el server.
- Lectura: `GET /months` (meses con datos) y `GET /rows?year=&month=` (opcional: sin filtros = todo).
- Escritura: `POST /entries {date, type, source, content, duration, note, url, area}` y `PATCH/DELETE /entries/:id`.
- En local solo viven: cola pendiente (global) y último mes visto.

## Configuración

```bash
# .env (solo dev)
VITE_API_BASE=http://127.0.0.1:8787
```

```bash
npm run dev        # front en :5173
npm run dev:server # API (wrangler dev) en :8787
npm run build      # producción a dist/ con API_BASE del entorno
npm run preview    # probar el build
```

```bash
# .env (solo dev)
VITE_API_BASE=<url de la API>
VITE_YT_API_KEY=<key de YouTube Data API v3>  # opcional: sin esto, el autollenado de videos trae título pero no duración
# prod: exportar API_BASE=<url> antes del build (o en la plataforma)
```

En inglés, pegar un link de YouTube en URL rellena Contenido (título) y
Duración (redondeada: resto > 30s sube, si no baja) si están vacíos.

## Áreas

Entradas mixtas: cada registro lleva `area` (`ingles` | `ejercicio` | `matematica`).
Todos comparten los mismos gráficos; el drawer del día muestra una barra
repartida en 3 colores (uno por área) y la lista agrupada por área.
El formulario adapta tipos/fuentes por área y en ejercicio la duración es
opcional (sesión simple).

## Auth

Sesión en cookie `HttpOnly` (`tt_session`): el JS nunca ve el token.

- Passwords con **bcrypt** (lib `bcryptjs`), sesiones opacas revocables en D1
  (`users` + `sessions`), anti-CSRF por `Origin` + `SameSite=Lax`.
- La cuenta se crea una sola vez: `POST /auth/setup` solo anda con la tabla
  `users` vacía (después responde 403, no hay registro público).
- Orígenes extra del front (CORS/CSRF): `ALLOWED_ORIGINS` en `wrangler.toml`.

## Migraciones (DB existentes, aplicar en orden)

```bash
cd server
wrangler d1 execute DB --file=./migrate-area.sql --remote          # column area (muy viejo)
wrangler d1 execute DB --file=./migrate-single-table.sql --remote  # DB única: year/month en entries, fuera sheets
```

DB nueva: `wrangler d1 execute DB --file=./schema.sql [--remote]` y, si querés datos de ejemplo, `--file=./seed.sql`.

## Estructura

```
server/             # worker Hono + D1 (workspace aparte)
  src/routes/       # auth, entries, months, rows
  src/db/           # users, sessions, entries
src/
  api.js            # listMonths / getRows(month) / postEntry / cola offline global
  parse.js          # matrices mock → filas, duración humana → segs
  dates.js          # keys locales, meses (label/fromKey), celdas Lun–Dom
  month.js          # ?month= → mes resuelto
  format.js         # fmtTotal, secsToHMS, normalizeUrl, level
  storage.js        # localStorage seguro (JSON)
  hooks/            # useRows ({rows, live, error, retry})
  pages/            # Graph, Activities, EntryForm (form por área en entry-form/*)
  components/       # Pie, LockScreen, ui/*
```

## Mock

`src/mock/data.json` con datos congelados (rows por mes, `"2026-08"`…). En dev el front
usa el mock automáticamente para testear los gráficos (y el pastel agrupa como hace
`getMonthlyTotals`). El build de prod va contra la API real. El pill "mock" del header
indica el modo.
