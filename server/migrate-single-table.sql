-- DB única: entries absorbe los meses (year, month) y se elimina sheets.
-- Deriva year/month del nombre de la hoja ("Inglés - 2026 Octubre"),
-- mismo criterio que usaba el frontend (monthFromSheetName). Si el nombre
-- no matchea o no hay hoja, cae a la fecha de la entry.
-- Aplicar una sola vez: wrangler d1 execute DB --file=./migrate-single-table.sql [--remote]

CREATE TABLE entries_new (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "date" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT 'ingles'
);

-- rest = lo que sigue al " - " del nombre ("2026 Octubre"); sin " - " queda
-- "" y todos los CASE caen a strftime(date) como fallback.
INSERT INTO entries_new ("id", "date", "year", "month", "type", "source", "content", "duration", "note", "url", "area")
SELECT
  id,
  date,
  CASE
    WHEN substr(rest, 1, 4) GLOB '[12][0-9][0-9][0-9]' THEN CAST(substr(rest, 1, 4) AS INTEGER)
    ELSE CAST(strftime('%Y', substr(date, 1, 10)) AS INTEGER)
  END,
  CASE lower(trim(substr(rest, 6)))
    WHEN 'enero' THEN 1      WHEN 'febrero' THEN 2
    WHEN 'marzo' THEN 3      WHEN 'abril' THEN 4
    WHEN 'mayo' THEN 5       WHEN 'junio' THEN 6
    WHEN 'julio' THEN 7      WHEN 'agosto' THEN 8
    WHEN 'septiembre' THEN 9 WHEN 'setiembre' THEN 9
    WHEN 'octubre' THEN 10   WHEN 'noviembre' THEN 11
    WHEN 'diciembre' THEN 12
    ELSE CAST(strftime('%m', substr(date, 1, 10)) AS INTEGER)
  END,
  type, source, content, duration, note, url, area
FROM (
  SELECT
    e.id AS id,
    e.date AS date,
    CASE
      WHEN s.name IS NULL THEN ''
      ELSE substr(s.name, instr(s.name || ' - ', ' - ') + 3)
    END AS rest,
    e.type AS type,
    e.source AS source,
    e.content AS content,
    e.duration AS duration,
    e.note AS note,
    e.url AS url,
    e.area AS area
  FROM entries e
  LEFT JOIN sheets s ON s.id = e.sheet_id
);

DROP TABLE IF EXISTS sheets;
ALTER TABLE entries RENAME TO entries_old;
ALTER TABLE entries_new RENAME TO entries;
DROP TABLE entries_old;

CREATE INDEX IF NOT EXISTS idx_entries_month ON entries("year", "month");
DROP INDEX IF EXISTS idx_entries_sheet;
