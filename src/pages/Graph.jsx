import { useEffect, useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { pendingCount, saveLastSheet } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { currentMonth, monthCells } from "../dates.js";
import { fmtTotal } from "../format.js";
import { resolveSheet } from "../sheet.js";
import { Sheet } from "../components/ui/sheet";

/* Rampa shadcn: chart-2 (verde) en pasos de opacidad sobre muted */
const LEVEL_BG = [
  "bg-muted",
  "bg-chart-2/25",
  "bg-chart-2/50",
  "bg-chart-2/75",
  "bg-chart-2",
];

function level(ratio) {
  if (ratio <= 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const pad = (n) => String(n).padStart(2, "0");

export function Graph({ names }) {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const [sheetKey, setSheetKey] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const list = names || [];
  const sheet = resolveSheet(search, list);
  const { rows: apiRows, live, error, retry } = useRows(sheet);

  // URL predecible: si no hay ?sheet=, se fija al resuelto.
  // Solo en "/" — si la vista está saliendo (ej. a /hojas), no secuestrar.
  useEffect(() => {
    if (path !== "/" || names === null) return;
    const params = new URLSearchParams(search || "");
    if (!params.get("sheet") && sheet) {
      saveLastSheet(sheet);
      navigate(`/?sheet=${encodeURIComponent(sheet)}`, { replace: true });
    }
  }, [path, names, sheet, search ]);

  // Mes a mostrar: el más reciente entre las filas (la hoja define su mes);
  // si no hay filas, el actual del dispositivo.
  const now = currentMonth();
  // Skeleton con la forma del mes actual del dispositivo.
  const skelCells = monthCells(now.y, now.m);
  let skelFirst = -1, skelLast = -1;
  skelCells.forEach((c, i) => {
    if (c === null) return;
    if (skelFirst === -1) skelFirst = i;
    skelLast = i;
  });
  const skelCorner = (i) => [
    (i === 0 || i === skelFirst) && "rounded-tl-md",
    i === 6 && "rounded-tr-md",
    i === 7 && "rounded-tl-md",
    i === skelCells.length - 7 && "rounded-bl-md",
    i === skelCells.length - 1 && "rounded-br-md",
  ].filter(Boolean).join(" ");
  let y = now.y, m = now.m;
  if (apiRows && apiRows.length > 0) {
    const months = [...new Set(apiRows.map((r) => r.key?.slice(0, 7)).filter(Boolean))].sort();
    const latest = months[months.length - 1];
    if (latest) {
      y = Number(latest.slice(0, 4));
      m = Number(latest.slice(5, 7));
    }
  }
  const prefix = `${y}-${pad(m)}`;
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("es", { month: "long", year: "numeric" });

  const dayInfo = new Map();
  for (const r of apiRows || []) {
    if (!r.key?.startsWith(prefix)) continue;
    if (!dayInfo.has(r.key)) dayInfo.set(r.key, { total: 0, entries: [] });
    const info = dayInfo.get(r.key);
    info.total += r.secs;
    info.entries.push(r);
  }

  const rows = (apiRows || [])
    .filter((r) => r.key?.startsWith(prefix))
    .sort((a, b) => b.key.localeCompare(a.key));

  const maxSecs = Math.max(1, ...[...dayInfo.values()].map((v) => v.total));

  const cells = monthCells(y, m).map((c) =>
    c === null ? null : { ...c, total: dayInfo.get(c.key)?.total || 0 },
  );

  // Celdas vacías después del último día → total del mes.
  let firstIdx = -1, lastIdx = -1;
  cells.forEach((c, i) => {
    if (c === null) return;
    if (firstIdx === -1) firstIdx = i;
    lastIdx = i;
  });
  const monthTotal = [...dayInfo.values()].reduce((acc, v) => acc + v.total, 0);
  // Esquinas redondeadas puntuales de la grilla.
  // El arriba-izq va al primer día visible (el índice 0 puede ser hueco).
  const corner = (i) => [
    (i === 0 || i === firstIdx) && "rounded-tl-md",
    i === 6 && "rounded-tr-md",
    i === 7 && "rounded-tl-md",
    i === cells.length - 7 && "rounded-bl-md",
    i === cells.length - 1 && "rounded-br-md",
  ].filter(Boolean).join(" ");
  // Intensidad del bloque total: promedio por día activo vs mejor día.
  const monthLv = level(monthTotal > 0 && dayInfo.size > 0 ? monthTotal / (maxSecs * dayInfo.size) : 0);
  const monthTcls = monthLv === 0 ? "text-muted-foreground" : monthLv >= 3 ? "text-neutral-950" : "text-foreground";

  const visibleRows = expanded ? rows : rows.slice(0, 5);

  function openDay(key) {
    setSheetKey(key);
    setSheetOpen(true);
  }

  const sel = sheetKey ? dayInfo.get(sheetKey) : null;
  const selDate = sheetKey ? new Date(y, m - 1, Number(sheetKey.slice(8, 10))) : null;
  const queued = sheet ? pendingCount(sheet) : 0;

  return (
    <div>
      <div class="mb-4">
        {list.length === 0 && apiRows !== null && (
          <p class="text-sm text-muted-foreground">No hay hojas. Creá una desde el selector.</p>
        )}
        <p class="font-data mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">{monthName}</p>
        {apiRows !== null && !live && (
          <button
            type="button"
            onClick={retry}
            class="font-data mt-2 block text-left text-[11px] text-muted-foreground underline underline-offset-4"
          >
            Sin conexión · mostrando lo guardado{queued > 0 ? ` · ${queued} en cola` : ""} · reintentar{error ? ` (${error})` : ""}
          </button>
        )}
      </div>

      <div class="grid grid-cols-7 gap-1">
        {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
          <div key={w} class="font-data pb-1 text-center text-[13px] uppercase tracking-widest text-muted-foreground">
            {w}
          </div>
        ))}
        {apiRows === null
          ? skelCells.map((c, i) => {
              if (c === null) {
                if (i <= skelLast) return <div key={"x" + i} aria-hidden="true" class={skelCorner(i)} />;
                if (i !== skelLast + 1) return null;
                const span = skelCells.length - 1 - skelLast;
                return (
                  <div
                    key="skel-total"
                    aria-hidden="true"
                    style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
                    class={`min-h-full w-full animate-pulse bg-muted rounded-br-md ${i === skelCells.length - 7 ? "rounded-bl-md" : ""}`}
                  />
                );
              }
              return (
                <div
                  key={"s" + i}
                  aria-hidden="true"
                  style={{ animationDelay: `${(i % 7) * 60}ms` }}
                  class={`aspect-square w-full animate-pulse bg-muted ${skelCorner(i)}`}
                />
              );
            })
          : cells.map((d, i) => {
          if (d == null) {
            if (i <= lastIdx) return <div key={"x" + i} class={corner(i)} />;
            // Relleno final: un solo bloque que ocupa todos los espacios.
            if (i !== lastIdx + 1) return null;
            const span = cells.length - 1 - lastIdx;
            const totalCorners = [
              i === 0 && "rounded-tl-md",
              i === 6 && "rounded-tr-md",
              i === 7 && "rounded-tl-md",
              i === cells.length - 7 && "rounded-bl-md",
              "rounded-br-md",
            ].filter(Boolean).join(" ");
            return (
              <div
                key="month-total"
                title={`Total del mes: ${fmtTotal(monthTotal)}`}
                style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
                class={`relative min-h-full w-full overflow-hidden border border-border ${LEVEL_BG[monthLv]} ${totalCorners}`}
              >
                <span class="absolute inset-0 flex items-center justify-center p-1.5">
                  <span class={`font-data text-[16px] font-bold leading-none ${monthTcls}`}>
                    {fmtTotal(monthTotal)}
                  </span>
                </span>
              </div>
            );
          }
          const lv = level(d.total / maxSecs);
          // lv 0: apagado · lv 1-2: medios → texto del tema · lv 3-4: brasa viva → texto oscuro fijo
          const tcls = lv === 0 ? "text-muted-foreground" : lv >= 3 ? "text-neutral-950" : "text-foreground";
          return (
            <button
              type="button"
              key={d.key}
              onClick={() => openDay(d.key)}
              title={`${d.day}: ${d.total > 0 ? fmtTotal(d.total) : "sin registro"}`}
              class={`relative aspect-square w-full cursor-pointer overflow-hidden border border-border text-left ${LEVEL_BG[lv]} ${corner(i)} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <span class="absolute inset-0 flex flex-col justify-between p-2">
                <span
                  class={`font-data text-[16px] font-bold leading-none ${tcls}`}
                >
                  {d.day}
                </span>
                {d.total > 0 && (
                    <span class={`font-data text-[13px] font-bold leading-none ${tcls}`}>
                    {fmtTotal(d.total)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div class="mt-6 overflow-hidden rounded-md border border-border">
        {apiRows === null ? (
          <div class="space-y-2 p-3" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={"t" + i} class="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <table class="w-full table-fixed text-left text-[13px]">
            <thead>
              <tr class="bg-muted font-data text-[10px] uppercase tracking-widest text-muted-foreground">
                <th class="w-10 px-3 py-2 font-medium">Día</th>
                <th class="px-3 py-2 font-medium">Actividad</th>
                <th class="w-20 px-3 py-2 text-right font-medium">Tiempo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {visibleRows.map((r, i) => (
                <tr key={r.key + "-" + i}>
                  <td class="whitespace-nowrap px-3 py-2 font-data text-muted-foreground">{r.key.slice(8, 10)}</td>
                  <td class="px-3 py-2">
                    <p class="font-medium leading-snug">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" class="underline underline-offset-2">
                          {r.titulo} ↗
                        </a>
                      ) : r.titulo}
                    </p>
                    <p class="font-data text-[11px] text-muted-foreground">{r.habilidad} · {r.recurso}</p>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right font-data font-semibold">
                    {r.secs > 0 ? fmtTotal(r.secs) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p class="px-4 py-3 text-sm text-muted-foreground">Sin registros en esta hoja.</p>
        )}
        {rows.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            class="w-full bg-muted px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Ver menos ↑" : `Ver los ${rows.length} ↓`}
          </button>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        label={selDate ? `Actividades del ${selDate.getDate()}` : "Actividades del día"}
      >
        {selDate && (
          <div>
            <div class="flex items-baseline justify-between gap-2 rounded-t-2xl bg-muted px-4 py-3">
              <p class="text-[14px] font-semibold">
                {selDate.toLocaleDateString("es", { day: "numeric", month: "long" })}
              </p>
              <p class="font-data text-[14px] font-bold">
                {sel && sel.total > 0 ? fmtTotal(sel.total) : "0m"}
              </p>
            </div>
            {sel && sel.entries.length > 0 ? (
              <ul>
                {sel.entries.map((e, idx) => (
                  <li
                    key={idx}
                    class={`mt-2 bg-muted px-4 py-3 ${idx === sel.entries.length - 1 ? "rounded-b-2xl" : ""}`}
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-data text-[11px] text-muted-foreground">
                        {e.habilidad} · {e.recurso}
                      </span>
                      <span class="font-data text-[12px] font-semibold">
                        {e.secs > 0 ? fmtTotal(e.secs) : "—"}
                      </span>
                    </div>
                    <p class="mt-1 text-[14px] font-medium leading-snug">
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer" class="underline underline-offset-2">
                          {e.titulo} ↗
                        </a>
                      ) : e.titulo}
                    </p>
                    {e.notas && <p class="font-data mt-1 text-[11px] text-muted-foreground">{e.notas}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p class="mt-2 rounded-b-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Sin registros ese día.</p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
