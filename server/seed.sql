-- Seed inicial de ejemplo. Ejecutar en D1 DESPUÉS de schema.sql.
-- Sin hojas: cada entry lleva year/month, que el INSERT completa a mano.

INSERT INTO entries ("date", "year", "month", "type", "source", "content", "duration", "note", "url", "area") VALUES
  ('2026-10-01', 2026, 10, 'Vocabulary', 'Anki', 'Refold 1k', '0:03:00', '', '', 'ingles'),
  ('2026-10-02', 2026, 10, 'Listening', 'Serie', 'The Office S01 E03', '0:30:00', '', '', 'ingles'),
  ('2026-10-02', 2026, 10, 'Vocabulary', 'Anki', 'Refold 1K, Varios', '0:01:00', '', '', 'ingles'),
  ('2026-10-03', 2026, 10, 'Ejercicio', 'Gym', 'Full body', '', '', '', 'ejercicio'),
  ('2026-10-04', 2026, 10, 'Listening', 'Movie', 'The Matrix', '0:28:20', 'Necesito terminar', '', 'ingles');
