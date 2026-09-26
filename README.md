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
npm run dev      # desarrollo (reiniciar si cambia el .env)
npm run build    # producción a dist/
npm run preview  # probar el build
```

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

`src/mock/data.json` con datos congelados. En `dev` se usa el mock (solo lectura; el POST va a la API real), en `build` la API. El pill "mock" del header indica el modo.
