# Tinta · Log de inmersión

Calendario de horas de inglés: a más horas, más color. App mobile-first instalable (PWA) que lee y escribe en un Google Spreadsheet vía Apps Script.

## Vistas

- **Grilla**: heatmap del mes (Lun–Dom) con el total del mes, objetivo 2h/día y detalle por día en drawer.
- **Barras**: barras horizontales por día, con comparación de hasta 2 hojas (checkboxes).
- **Tabla**: todos los registros de la hoja.
- **Registro**: FAB (+) que abre el formulario en modal (día, tipo, habilidad, duración, contenido, url, nota). Sin conexión, queda en cola y se manda solo.

La hoja activa viaja en `?sheet=`. El mes se toma de las filas (o del celu si no hay).

## Datos

- Lectura: `GET ?action=getSheet` (lista) y `GET ?sheet=<nombre>` (matriz).
- Escritura: `POST {fecha, habilidad, recurso, contenido, link, hora, nota, sheet}`.
- En local solo viven: nombres de hojas creadas acá, cola pendiente, última hoja y tema.

## Configuración

```bash
cp .env.example .env   # si existe, o crealo con:
# VITE_GAS_ID=<id del deployment de Apps Script>
```

```bash
npm run dev      # desarrollo con VITE_GAS_ID del .env (reiniciar si cambia)
npm run build    # producción a dist/ con GAS_ID del entorno
npm run preview  # probar el build
```

```bash
# .env (solo dev)
VITE_GAS_ID=<id del deployment>
# prod: exportar GAS_ID=<id> antes del build (o en la plataforma)
```

## Áreas

Hojas mixtas: cada registro lleva `área` (`ingles` | `ejercicio` | `matematica`).
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
- Aplicar esquema: `wrangler d1 execute DB --file=./schema.sql [--remote]`.
- DBs existentes (sin columna `area`): `wrangler d1 execute DB --file=./migrate-area.sql [--remote]` (backfill a `ingles`).
- Orígenes extra del front (CORS/CSRF): `ALLOWED_ORIGINS` en `wrangler.toml`.

## Estructura

```
src/
  api.js            # listSheets / getRows / postEntry / cola offline
  parse.js          # matriz API → filas, duración humana → segs
  dates.js          # keys locales, mes actual, celdas Lun–Dom
  format.js         # fmtTotal, secsToHMS, normalizeUrl, level
  storage.js        # localStorage seguro (JSON)
  sheet.js          # ?sheet= → hoja resuelta
  hooks/            # useSheets, useRows ({data, loading, error, retry})
  pages/            # Graph, Registro
  components/       # SheetPicker, Bars, ui/* (select, sheet, modal…)
```

## Mock

`src/mock/data.json` con datos congelados (hojas + matrices). En dev el front usa el mock
automáticamente para testear los gráficos: grilla y barras leen las matrices, y el pastel
agrupa `sheets + rows` del propio mock como hace `getMonthlyTotals` con `GET /sheets` +
`GET /rows`. El build de prod va contra la API real. El pill "mock" del header indica el modo.
