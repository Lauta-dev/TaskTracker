import { useEffect, useState } from "preact/hooks";
import { listMonths } from "../api.js";

/** Meses con datos ("YYYY-MM", cronológicos). null = cargando. */
export function useMonths() {
  const [months, setMonths] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    listMonths().then(
      (list) => {
        if (!alive) return;
        setMonths(list || []);
        setError("");
      },
      () => {
        if (!alive) return;
        setMonths(null);
        setError("error de red");
      },
    );
    return () => {
      alive = false;
    };
  }, [tick]);

  // Fuerza refetch.
  const retry = () => setTick((t) => t + 1);

  return { months, error, retry };
}
