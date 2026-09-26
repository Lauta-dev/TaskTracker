import { useEffect, useState } from "preact/hooks";
import { listSheets } from "../api.js";

export function useSheets() {
  const [names, setNames] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Carga inicial (y en cada retry).
    listSheets().then(
      (list) => {
        if (!alive) return;
        setNames(list);
        setError("");
      },
      (e) => {
        if (!alive) return;
        setNames([]);
        setError(e?.message || "error de red");
      }
    );
    return () => {
      alive = false;
    };
  }, [tick]);

  // Fuerza refetch.
  const retry = () => setTick((t) => t + 1);

  return { names, error, retry };
}
