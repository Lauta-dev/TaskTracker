import { useEffect, useState } from "preact/hooks";
import { getRows } from "../api.js";

/* Caché por mes: permite previsualizar los meses vecinos en el carrusel y
   evitar el parpadeo de esqueletos al cambiar de mes. */
const cache = new Map();

export function cachedRows(month) {
  return month ? cache.get(month) ?? null : null;
}

/** Carga un mes en segundo plano (si no está en caché). */
export function prefetchRows(month) {
  if (!month || cache.has(month)) return Promise.resolve(false);
  return getRows(month)
    .then((res) => {
      cache.set(month, res.rows);
      return true;
    })
    .catch(() => false);
}

/** Filas de un mes ("YYYY-MM") o de todos (null). */
export function useRows(month) {
  const [rows, setRows] = useState(() => cachedRows(month));
  const [live, setLive] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Si ya hay datos de ese mes, se muestran al instante y se refrescan.
    setRows(cachedRows(month));
    getRows(month).then((res) => {
      if (!alive) return;
      if (month) cache.set(month, res.rows);
      setRows(res.rows);
      setLive(res.live);
      setError(res.error);
    }).catch((e) => {
      if (!alive) return;
      setRows([]);
      setLive(false);
      setError(e?.message || "error de red");
    });
    return () => {
      alive = false;
    };
  }, [month, tick]);

  useEffect(() => {
    // Un guardado avisa y se refetchea (ej. modal de EntryForm).
    const onSaved = () => setTick((t) => t + 1);
    window.addEventListener("tt:rows", onSaved);
    return () => window.removeEventListener("tt:rows", onSaved);
  }, []);

  // Fuerza refetch.
  const retry = () => setTick((t) => t + 1);

  return { rows, live, error, retry };
}
