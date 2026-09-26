import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { cn } from "./cn";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({ value, onValueChange, placeholder = "Elegí el día", class: cls, className, ...props }) {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => ({
    y: (value ?? today).getFullYear(),
    m: (value ?? today).getMonth(),
  }));
  const rootRef = useRef(null);

  useEffect(() => {
    if (value) setView({ y: value.getFullYear(), m: value.getMonth() });
  }, [value?.getFullYear(), value?.getMonth()]);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const cells = useMemo(() => {
    const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [view]);

  const title = new Date(view.y, view.m, 1).toLocaleString("es", { month: "long", year: "numeric" });
  const shown = value
    ? value.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })
    : null;

  function move(dir) {
    setView((v) => {
      const dt = new Date(v.y, v.m + dir, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });
  }

  return (
    <div ref={rootRef} class={cn("relative", className, cls)}>
      <button
        type="button"
        aria-expanded={open}
        data-slot="date-picker-trigger"
        onClick={() => setOpen(!open)}
        class="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        {...props}
      >
        <CalendarIcon class="size-4 opacity-50" />
        <span class={cn("truncate", !shown && "text-muted-foreground")}>{shown || placeholder}</span>
      </button>

      {present && (
        <div
          role="dialog"
          aria-label="Elegir día"
          data-slot="date-picker-content"
          data-state={open ? "open" : "closed"}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !open) setPresent(false);
          }}
          class={cn(
            "absolute left-0 top-full z-50 mt-1 w-[248px] rounded-md bg-popover p-2 text-popover-foreground shadow-xl",
            open ? "animate-in fade-in-0 zoom-in-95" : "animate-out fade-out-0 zoom-out-95",
          )}
        >
          <div class="mb-1 flex items-center justify-between">
            <button
              type="button" aria-label="Mes anterior" onClick={() => move(-1)}
              class="rounded-md p-1 hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeftIcon class="size-3.5" />
            </button>
            <p class="text-[13px] font-medium capitalize">{title}</p>
            <button
              type="button" aria-label="Mes siguiente" onClick={() => move(1)}
              class="rounded-md p-1 hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronRightIcon class="size-3.5" />
            </button>
          </div>
          <div class="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div key={w} class="pb-1 text-center font-data text-[10px] uppercase text-muted-foreground">{w}</div>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <div key={"x" + i} />;
              const date = new Date(view.y, view.m, d, 12);
              const selected = sameDay(date, value);
              const isToday = sameDay(date, today);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onValueChange?.(date);
                    setOpen(false);
                  }}
                  class={cn(
                    "flex size-8 items-center justify-center rounded-md text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !selected && isToday && "font-bold text-foreground underline underline-offset-4",
                    !selected && !isToday && "text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
