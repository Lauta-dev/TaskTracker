import { useEffect, useState } from "preact/hooks";
import { getRows } from "../api.js";

export function useRows(sheet) {
  const [rows, setRows] = useState(null);
  const [live, setLive] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sheet) return;
    let alive = true;
    // Recarga al cambiar de hoja.
    setRows(null);
    getRows(sheet).then((res) => {
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
  }, [sheet, tick]);

  // Fuerza refetch.
  const retry = () => setTick((t) => t + 1);

  if (!sheet) return { rows: [], live: true, error: "", retry };
  return { rows, live, error, retry };
}
