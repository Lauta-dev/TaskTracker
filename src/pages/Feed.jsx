import { useMemo, useState } from "preact/hooks";
import { Pencil, Trash2 } from "lucide-preact";
import { deleteRowApi } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { DropdownMenu, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { AreaIcon } from "../components/AreaIcon";
import { fmtTotal } from "../format.js";

/* Feed del mes estilo diseño: un día por bloque con encabezado
   (nombre + chip del total) y filas de ficha con icono de área,
   título (verde/↗ si lleva link), habilidad · recurso y duración. */

function dayHeading(key) {
  const s = new Date(key + "T12:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric" }).replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function DayRow({ r, onEdit, onDelete }) {
  const a = r.area || "ingles";
  return (
    <div class="flex items-start gap-3 bg-secondary/60 px-3 py-2.5 transition-colors">
      <span
        aria-hidden="true"
        class="grid size-9 shrink-0 place-items-center rounded-full"
        style={{ background: `var(--area-${a}-container)`, color: `var(--area-${a})` }}
      >
        <AreaIcon area={a} class="size-4.5" />
      </span>

      <div class="min-w-0 flex-1">
        <p class={`truncate text-[14px] font-medium leading-snug md:text-[15px] ${r.url ? "text-chart-2" : ""}`}>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" class="inline-flex items-baseline gap-1 hover:underline">
              {r.titulo} <span aria-hidden="true" class="text-[13px]">↗</span>
            </a>
          ) : (
            r.titulo
          )}
        </p>
        <p class="font-data mt-0.5 truncate text-[11px] text-muted-foreground">
          {r.habilidad} · {r.recurso}
        </p>
        {r.notas && (
          <p class="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{r.notas}</p>
        )}
      </div>

      <span class="font-data shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums">
        {r.secs > 0 ? fmtTotal(r.secs) : "—"}
      </span>

      {r.row != null && (
        <DropdownMenu triggerLabel={`Opciones de ${r.titulo}`}>
          <DropdownMenuItem onClick={() => onEdit(r)}>
            <Pencil class="size-5" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem destructive onClick={() => onDelete(r)}>
            <Trash2 class="size-5" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenu>
      )}
    </div>
  );
}

export function Feed({ month, onEdit }) {
  const { rows, retry } = useRows(month);
  const [deleting, setDeleting] = useState(false);

  const days = useMemo(() => {
    if (!rows) return null;
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.key)) m.set(r.key, []);
      m.get(r.key).push(r);
    }
    // Suma total por día para el chip del encabezado.
    return [...m.entries()]
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([key, list]) => ({ key, list, total: list.reduce((acc, r) => acc + (r.secs || 0), 0) }));
  }, [rows]);

  async function onDelete(r) {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteRowApi(r.row);
      window.dispatchEvent(new Event("tt:rows"));
      retry();
    } finally {
      setDeleting(false);
    }
  }

  if (rows === null) {
    return (
      <div aria-hidden="true" class="space-y-3 rounded-xl bg-card p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} class="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {days.length === 0 ? (
        <div class="rounded-xl bg-card px-4 py-8 text-center">
          <p class="text-sm text-muted-foreground">Sin registros este mes.</p>
        </div>
      ) : (
        <div class="flex flex-col gap-4">
          {days.map(({ key, list, total }) => {
            // Chip del encabezado: color del área dominante del día.
            const counts = {};
            for (const r of list) {
              const a = r.area || "ingles";
              counts[a] = (counts[a] || 0) + (r.secs || 0);
            }
            const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] || "ingles";
            return (
              <section key={key} class="rounded-xl bg-card p-3 md:p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h2 class="font-display text-[20px] font-semibold leading-6 tracking-tight md:text-[22px]">
                    {dayHeading(key)}
                  </h2>
                  {total > 0 && (
                    <span
                      class="font-data rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums"
                      style={{ background: `var(--area-${top}-container)`, color: `var(--area-${top}-on-container)` }}
                    >
                      {fmtTotal(total)}
                    </span>
                  )}
                </div>
                <div class="flex flex-col gap-1.5">
                  {list.map((r, i) => (
                    <DayRow key={r.row ?? `${key}-${i}`} r={r} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <div aria-hidden="true" class="h-2" />
    </div>
  );
}
