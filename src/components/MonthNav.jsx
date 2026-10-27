import { ChevronLeft, ChevronRight } from "lucide-preact";
import { currentMonth, monthFromKey, monthKey, MONTH_LABEL } from "../dates.js";

/* Navegación de meses (antes era el picker de hojas).
   ◀ ▶ mueven el mes; el label abre la lista de meses con datos. */
export function MonthNav({ months, value, onPick }) {
  const mv = monthFromKey(value);
  const now = currentMonth();
  const thisKey = monthKey(now.y, now.m);

  function shift(d) {
    if (!mv) return;
    const dt = new Date(mv.y, mv.m - 1 + d, 1);
    onPick(monthKey(dt.getFullYear(), dt.getMonth() + 1));
  }

  const list = (months || []).includes(thisKey) ? months || [] : [...(months || []), thisKey].sort();

  return (
    <div class="flex items-center gap-1">
      <button
        type="button"
        onClick={() => shift(-1)}
        title="Mes anterior"
        aria-label="Mes anterior"
        class="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors active:bg-muted md:size-11"
      >
        <ChevronLeft class="size-5" />
      </button>
      <div class="min-w-0 flex-1 md:w-44 md:flex-none">
        <select
          value={value}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label="Elegir mes"
          class="font-display h-10 w-full appearance-none truncate rounded-md bg-muted px-3 text-center text-[15px] font-semibold shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-11 md:text-[16px]"
        >
          {value && !list.includes(value) && (
            <option value={value}>{MONTH_LABEL(value)}</option>
          )}
          {list.map((k) => (
            <option key={k} value={k}>
              {MONTH_LABEL(k)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        title="Mes siguiente"
        aria-label="Mes siguiente"
        class="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors active:bg-muted md:size-11"
      >
        <ChevronRight class="size-5" />
      </button>
    </div>
  );
}
