import { useEffect, useState } from "preact/hooks";
import { getRows } from "../api.js";

/** Filas de un mes ("YYYY-MM") o de todos (null). */
export function useRows(month) {
  const [rows, setRows] = useState(null);
  const [live, setLive] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Recarga al cambiar de mes (o al pasar de null).
    setRows(null);
    getRows(month).then((res) => {
      if (!alive) return;
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
