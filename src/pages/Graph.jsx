import { useEffect, useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { deleteRowApi, getMonthlyTotals, localSheets, pendingCount, saveLastSheet, AREAS, AREA_LABEL } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { currentMonth, dayKey, monthCells, monthFromSheetName } from "../dates.js";
import { fmtShort, fmtTotal, level } from "../format.js";
import { resolveSheet } from "../sheet.js";
import { Sheet } from "../components/ui/sheet";
import { AreaIcon } from "../components/AreaIcon";
import { AREA_COLOR } from "./entry-form/presets.js";
import { DropdownMenu, DropdownMenuItem } from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Select, SelectContent, SelectTrigger, SelectValue } from "../components/ui/select";
import { Bars } from "../components/Bars";
import { Pie } from "../components/Pie";
import { Check, Pencil, Trash2 } from "lucide-preact";

/* Rampa shadcn: chart-2 (verde) en pasos de opacidad sobre muted */
const LEVEL_BG = [
  "bg-muted",
  "bg-chart-2/25",
  "bg-chart-2/50",
  "bg-chart-2/75",
  "bg-chart-2",
];

/* Esquinas expuestas: redondea donde la celda no tiene día vecino
   (ni en vertical ni al costado). `hasDay(pos)` dice si esa posición
   de la grilla de 7 columnas tiene día. */
function exposedCorners(pos, hasDay) {
  const col = pos % 7;
  const above = pos >= 7 && hasDay(pos - 7);
  const below = hasDay(pos + 7);
  const left = col > 0 && hasDay(pos - 1);
  const right = col < 6 && hasDay(pos + 1);
  return [
    !above && !left && "rounded-tl-md",
    !above && !right && "rounded-tr-md",
    !below && !left && "rounded-bl-md",
    !below && !right && "rounded-br-md",
  ].filter(Boolean).join(" ");
}

export function Graph({ names, onEdit, vista = "grilla" }) {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const [sheetKey, setSheetKey] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerArea, setDrawerArea] = useState(null);
  const [shownArea, setShownArea] = useState(null);

  // La lista anima al salir: se desmonta tras el animate-out (con fallback).
  useEffect(() => {
    if (drawerArea) {
      setShownArea(drawerArea);
      return;
    }
    if (!shownArea) return;
    const t = setTimeout(() => setShownArea(null), 220);
    return () => clearTimeout(t);
  }, [drawerArea]);
  const [monthly, setMonthly] = useState(null);
  const [rowError, setRowError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = names || [];
  const sheet = resolveSheet(search, list);
  const { rows: apiRows, live, error, retry } = useRows(sheet);
  // Hojas mixtas: un solo gráfico combinado; el drawer separa por área.

  function editRow(r) {
    setRowError("");
    onEdit?.({ sheet, row: r.row, key: r.key, area: r.area || "ingles", secs: r.secs, habilidad: r.habilidad, recurso: r.recurso, titulo: r.titulo, url: r.url, notas: r.notas });
  }

  function askDelete(r) {
    setRowError("");
    setPendingDelete(r);
  }

  async function confirmDelete() {
    const r = pendingDelete;
    if (!r) return;
    setDeleting(true);
    setRowError("");
    try {
      await deleteRowApi(sheet, r.row);
      setPendingDelete(null);
      window.dispatchEvent(new Event("tt:rows"));
    } catch {
      setPendingDelete(null);
      setRowError("Sin conexión: no se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  // URL predecible: si no hay ?sheet= o apunta a una hoja que no existe,
  // se fija al resuelto. Solo en "/" — si la vista está saliendo, no secuestrar.
  useEffect(() => {
    if (path !== "/" || names === null) return;
    const params = new URLSearchParams(search || "");
    const param = params.get("sheet");
    if ((!param || (param !== sheet && !localSheets().includes(param))) && sheet) {
      saveLastSheet(sheet);
      navigate(`/?sheet=${encodeURIComponent(sheet)}`, { replace: true });
    }
  }, [path, names, sheet, search ]);

  // Totales por mes para el pie.
  // Lazy: solo se pide al abrir la vista pastel.
  useEffect(() => {
    if (vista !== "pastel" || monthly !== null) return;
    let alive = true;
    getMonthlyTotals().then((m) => {
      if (alive) setMonthly(m);
    }).catch(() => {
      if (alive) setMonthly([]);
    });
    return () => {
      alive = false;
    };
  }, [vista]);

  // Mes a mostrar: lo define la hoja ("Inglés - 2026 Octubre"); las filas
  // solo son fallback para hojas con nombre libre, y el dispositivo si no hay.
  const now = currentMonth();
  // Skeleton con la forma del mes actual del dispositivo.
  const skelCells = monthCells(now.y, now.m);
  let skelLast = -1;
  skelCells.forEach((c, i) => {
    if (c === null) return;
    skelLast = i;
  });
  const skelHas = (p) => skelCells[p] !== null;
  let y = now.y, m = now.m;
  const fromName = monthFromSheetName(sheet);
  if (fromName) {
    y = fromName.y;
    m = fromName.m;
  } else if (apiRows && apiRows.length > 0) {
    const months = [...new Set(apiRows.map((r) => r.key?.slice(0, 7)).filter(Boolean))].sort();
    const latest = months[months.length - 1];
    if (latest) {
      y = Number(latest.slice(0, 4));
      m = Number(latest.slice(5, 7));
    }
  }
  const prefix = `${y}-${String(m).padStart(2, "0")}`;

  // Comparar hojas (cada hoja ≈ un mes): hasta 2, con checkboxes.
  // Sin elección: la hoja en pantalla.
  const [picked, setPicked] = useState([]);
  const cmp = picked.length > 0 ? picked.slice(-2) : [sheet];

  function toggleMonth(name) {
    setPicked((cur) => cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name].slice(-2));
  }

  // Filas de las comparadas que no están en pantalla (2 hooks fijos).
  const otherA = cmp[0] && cmp[0] !== sheet ? cmp[0] : null;
  const otherB = cmp[1] && cmp[1] !== sheet ? cmp[1] : null;
  const rowsA = useRows(otherA);
  const rowsB = useRows(otherB);

  function rowsFor(name) {
    if (name === sheet) return apiRows;
    if (name === otherA) return rowsA.rows;
    if (name === otherB) return rowsB.rows;
    return [];
  }

  function latestPrefix(all) {
    const months = [...new Set((all || []).map((r) => r.key?.slice(0, 7)).filter(Boolean))].sort();
    return months[months.length - 1] || "";
  }

  const seriesLoading = cmp.some((name) => rowsFor(name) === null);
  const series = cmp.map((name, idx) => {
    const all = rowsFor(name) || [];
    // Cada serie muestra el mes de su hoja; fallback al último mes con filas.
    const named = monthFromSheetName(name);
    const p = named
      ? `${String(named.y).padStart(4, "0")}-${String(named.m).padStart(2, "0")}`
      : latestPrefix(all);
    const dm = new Map();
    for (const r of all) {
      if (p && r.key?.slice(0, 7) !== p) continue;
      const d = Number(r.key.slice(8, 10));
      dm.set(d, (dm.get(d) || 0) + r.secs);
    }
    const n = p ? new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)), 0).getDate() : 30;
    return {
      label: name,
      color: idx === 0 ? "var(--color-chart-2)" : "var(--color-chart-4)",
      days: Array.from({ length: n }, (_, i) => ({ day: i + 1, total: dm.get(i + 1) || 0 })),
    };
  });

  const dayInfo = new Map();
  for (const r of apiRows || []) {
    if (!r.key?.startsWith(prefix)) continue;
    if (!dayInfo.has(r.key)) dayInfo.set(r.key, { total: 0, entries: [], byArea: { ingles: 0, ejercicio: 0, matematica: 0 } });
    const info = dayInfo.get(r.key);
    info.total += r.secs;
    const a = r.area || "ingles";
    if (info.byArea[a] === undefined) info.byArea[a] = 0;
    info.byArea[a] += r.secs;
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
  let lastIdx = -1;
  cells.forEach((c, i) => {
    if (c === null) return;
    lastIdx = i;
  });
  const hasDay = (p) => cells[p] != null;
  const monthTotal = [...dayInfo.values()].reduce((acc, v) => acc + v.total, 0);
  const today = dayKey(new Date());
  // Reparto de hoy por área para la tarjeta del aside.
  const areaMonth = { ingles: 0, ejercicio: 0, matematica: 0 };
  for (const r of apiRows || []) {
    if (r.key !== today) continue;
    const a = r.area || "ingles";
    areaMonth[a] = (areaMonth[a] || 0) + r.secs;
  }
  const areaMonthTotal = areaMonth.ingles + areaMonth.ejercicio + areaMonth.matematica;
  // Bloque final: total del mes, con intensidad vs el mejor día.
  const monthLv = level(monthTotal > 0 && dayInfo.size > 0 ? monthTotal / (maxSecs * dayInfo.size) : 0);
  const monthTcls = monthLv === 0 ? "text-muted-foreground" : monthLv >= 3 ? "text-background" : "text-foreground";

  function openDay(key) {
    setSheetKey(key);
    setSheetOpen(true);
    setDrawerArea(null);
    setShownArea(null);
  }

  const sel = sheetKey ? dayInfo.get(sheetKey) : null;
  const selDate = sheetKey ? new Date(y, m - 1, Number(sheetKey.slice(8, 10))) : null;
  const queued = sheet ? pendingCount(sheet) : 0;

  return (
    <div>
      <div class="mb-4">
        {list.length === 0 && !sheet && apiRows !== null && (
          <p class="text-sm text-muted-foreground">No hay hojas. Creá una desde el selector.</p>
        )}
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

      {vista === "barras" && list.length > 1 && (
        <div class="mb-3">
          <Select value="">
            <SelectTrigger class="h-9 w-full gap-2 rounded-full border-0 bg-muted px-3 text-[13px] font-medium shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
              <SelectValue>{cmp.join(" vs ")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {list.map((n) => {
                const on = cmp.includes(n);
                return (
                  <div
                    key={n}
                    onClick={() => toggleMonth(n)}
                    class="flex cursor-default select-none items-center gap-2.5 rounded-sm px-2 py-2.5 text-[15px]"
                  >
                    <span class={`flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-chart-2 bg-chart-2" : "border-muted-foreground"}`}>
                      {on && <Check class="size-3 text-background" />}
                    </span>
                    <span class="min-w-0 flex-1 truncate">{n}</span>
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {vista !== "tabla" && vista !== "pastel" && (vista === "grilla" ? (
      <>
      <div key="grilla-wrap" class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 md:flex md:items-start md:gap-6">
      <div key="grilla" class="grid flex-1 grid-cols-7 gap-0 -mx-2 sm:-mx-4 md:mx-0">
        {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
          <div key={w} class="font-data pb-1 text-center text-[12px] uppercase tracking-widest text-muted-foreground md:pb-2 md:text-[13px]">
            {w}
          </div>
        ))}
        {apiRows === null
          ? skelCells.map((c, i) => {
              if (c === null) {
                if (i <= skelLast) return <div key={"x" + i} aria-hidden="true" />;
                if (i !== skelLast + 1) return null;
                const span = skelCells.length - 1 - skelLast;
                return (
                  <div
                    key="skel-total"
                    aria-hidden="true"
                    style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
                    class="min-h-full w-full animate-pulse rounded-br-md bg-muted"
                  />
                );
              }
              const skelBelow = i + 7;
              const skelRight = i % 7 < 6 ? i + 1 : -1;
              const skelBelowIsTotal = skelBelow > skelLast && skelBelow < skelCells.length;
              const skelRightIsTotal = skelRight !== -1 && skelRight > skelLast && skelRight < skelCells.length;
              const skelCc = exposedCorners(i, skelHas)
                .split(" ")
                .filter((c) => {
                  if (skelBelowIsTotal && (c === "rounded-bl-md" || c === "rounded-br-md")) return false;
                  if (skelRightIsTotal && (c === "rounded-tr-md" || c === "rounded-br-md")) return false;
                  return true;
                })
                .join(" ");
              return (
                <div
                  key={"s" + i}
                  aria-hidden="true"
                  style={{ animationDelay: `${(i % 7) * 60}ms` }}
                  class={`aspect-square w-full animate-pulse bg-muted ${skelCc}`}
                />
              );
            })
          : cells.map((d, i) => {
          if (d == null) {
            if (i <= lastIdx) return <div key={"x" + i} />;
            // Relleno final: un solo bloque que ocupa todos los espacios.
            if (i !== lastIdx + 1) return null;
            const span = cells.length - 1 - lastIdx;
            return (
              <div
                key="month-total"
                title={`Total del mes: ${fmtTotal(monthTotal)}`}
                style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
                class={`relative min-h-full w-full overflow-hidden border border-border rounded-br-md ${LEVEL_BG[monthLv]}`}
              >
                <span class="absolute inset-0 flex items-center justify-center p-1.5">
                  <span class={`font-data text-[14px] font-bold leading-none md:text-[17px] ${monthTcls}`}>
                    {fmtShort(monthTotal)}
                  </span>
                </span>
              </div>
            );
          }
          const lv = level(d.total / maxSecs);
          // lv 0: apagado · lv 1-2: texto del tema · lv 3-4: lleno → texto del fondo
          const tcls = lv === 0 ? "text-muted-foreground" : lv >= 3 ? "text-background" : "text-foreground";
          // Empalme con el bloque del total: si abajo o a la derecha hay
          // relleno del total (no día, pero tampoco vacío exterior), la
          // última semana queda como una sola pieza sin muescas.
          const belowPos = i + 7;
          const rightPos = i % 7 < 6 ? i + 1 : -1;
          const belowIsTotal = belowPos > lastIdx && belowPos < cells.length;
          const rightIsTotal = rightPos !== -1 && rightPos > lastIdx && rightPos < cells.length;
          const cc = exposedCorners(i, hasDay)
            .split(" ")
            .filter((c) => {
              if (belowIsTotal && (c === "rounded-bl-md" || c === "rounded-br-md")) return false;
              if (rightIsTotal && (c === "rounded-tr-md" || c === "rounded-br-md")) return false;
              return true;
            })
            .join(" ");
          const ccTl = cc.includes("rounded-tl");
          // Solo los días con datos abren el drawer (los vacíos no son botón).
          const hasData = d.total > 0;
          return (
            <button
              type="button"
              key={d.key}
              disabled={!hasData}
              onClick={() => openDay(d.key)}
              title={`${d.day}: ${d.total > 0 ? fmtTotal(d.total) : "sin registro"}`}
              class={`relative aspect-square w-full overflow-hidden border border-border text-left ${LEVEL_BG[lv]} ${cc} ${hasData ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "cursor-default"}`}
            >
              <span class="absolute inset-0 flex flex-col justify-between p-1.5 md:p-2">
                {d.key === today ? (
                  <span aria-hidden="true" class="invisible font-data text-[14px] font-bold leading-none md:text-[16px]">
                    {d.day}
                  </span>
                ) : (
                  <span class={`font-data text-[14px] font-bold leading-none md:text-[16px] ${tcls}`}>
                    {d.day}
                  </span>
                )}
                {d.total > 0 && (() => {
                  const done = [...new Set((dayInfo.get(d.key)?.entries || []).map((e) => e.area || "ingles"))];
                  return (
                    <span class="flex justify-end">
                      <span class="flex items-center gap-0.5 rounded-full bg-black/70 px-1 py-0.5 leading-none md:gap-1.5 md:px-2 md:py-1">
                        {done.map((a) => (
                          <span key={a} style={{ color: AREA_COLOR[a] }} class="leading-none">
                            <AreaIcon area={a} class="block size-2.5 md:size-[18px]" />
                          </span>
                        ))}
                      </span>
                    </span>
                  );
                })()}
              </span>
              {d.key === today && (
                <span class={`absolute left-0 top-0 border-b border-r border-chart-2 bg-chart-2 p-1.5 md:p-2 ${ccTl ? "rounded-tl-md rounded-br-xl" : "rounded-br-xl"}`}>
                  <span class="block font-data text-[12px] font-bold leading-none text-background sm:text-[14px] md:text-[16px]">
                    {d.day}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <aside class="mt-3 md:mt-0 md:w-[260px] md:shrink-0">
        {apiRows === null ? (
          <div class="rounded-md border border-border bg-card p-4" aria-hidden="true">
            <div class="h-3 w-20 animate-pulse rounded-sm bg-muted" />
            <div class="mt-3 h-2.5 animate-pulse rounded-full bg-muted" />
            <div class="mt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={"f" + i} class="h-5 animate-pulse rounded-sm bg-muted" />
              ))}
            </div>
          </div>
        ) : (
            <div class="overflow-hidden rounded-md border border-border bg-card p-4">
              <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[12px]">Por área</p>
              {areaMonthTotal > 0 ? (
                <>
                  <div class="mt-3 flex h-2.5 gap-[3px]" role="img"                     aria-label={`Reparto de hoy: ${AREAS.map((a) => `${AREA_LABEL[a]} ${fmtTotal(areaMonth[a] || 0)}`).join(", ")}`}>
                    {(() => {
                      const vis = AREAS.filter((a) => (areaMonth[a] || 0) > 0);
                      return vis.map((a, i) => (
                        <div
                          key={a}
                          title={`${AREA_LABEL[a]}: ${fmtTotal(areaMonth[a])}`}
                          style={{ width: `${(areaMonth[a] / areaMonthTotal) * 100}%`, background: AREA_COLOR[a] }}
                          class={`h-full ${i === 0 ? "rounded-l-full" : ""} ${i === vis.length - 1 ? "rounded-r-full" : ""}`}
                        />
                      ));
                    })()}
                  </div>
                  <ul class="mt-3 space-y-1.5">
                    {AREAS.map((a) => {
                      const v = areaMonth[a] || 0;
                      if (!(v > 0)) return null;
                      return (
                        <li key={a} class="flex items-center gap-1.5 text-[14px]">
                          <span style={{ color: AREA_COLOR[a] }}>
                            <AreaIcon area={a} class="size-4" />
                          </span>
                          <span class="min-w-0 flex-1 truncate text-muted-foreground">{AREA_LABEL[a]}</span>
                          <span class="font-data shrink-0 text-[14px] font-bold">{fmtTotal(v)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div class="mt-3 flex items-baseline justify-between gap-2 border-t border-border pt-2.5">
                    <span class="font-data text-[11px] uppercase tracking-widest text-muted-foreground">Total</span>
                    <span class="font-data text-[18px] font-bold">{fmtTotal(areaMonthTotal)}</span>
                  </div>
                </>
              ) : (
                <p class="mt-2 text-sm text-muted-foreground">Sin datos hoy.</p>
              )}
            </div>
        )}
      </aside>
      </div>
      </>
      ) : seriesLoading ? (
        <div key="barras-loading" aria-hidden="true" class="h-[240px] animate-pulse rounded-md bg-muted" />
      ) : (
        <div key="barras" class="relative left-1/2 w-[94vw] -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <Bars series={series} />
        </div>
      ))}

      {vista === "pastel" && (
        <div key="pastel" class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          {monthly === null ? (
            <div aria-hidden="true" class="rounded-md border border-border bg-card px-4 py-4">
              <div class="mx-auto size-[220px] animate-pulse rounded-full bg-muted" />
              <div class="mt-3 space-y-1">
                {[0, 1, 2].map((i) => (
                  <div key={"p" + i} class="h-9 animate-pulse rounded-sm bg-muted" />
                ))}
              </div>
            </div>
          ) : (
            <Pie data={monthly} />
          )}
        </div>
      )}

      {vista === "tabla" && (
      <div key="tabla" class="mt-6 overflow-hidden rounded-md border border-border animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        {rowError && <p class="border-b border-border px-4 py-2 text-sm text-destructive">{rowError}</p>}
        {apiRows === null ? (
          <div class="space-y-2 p-3" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={"t" + i} class="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <table class="w-full table-fixed text-left text-[13px] md:text-[15px]">
            <thead>
                <tr class="bg-muted font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">
                <th class="w-10 px-3 py-2 font-medium">Día</th>
                <th class="px-3 py-2 font-medium">Actividad</th>
                <th class="w-20 px-3 py-2 text-right font-medium">Tiempo</th>
                <th class="w-[60px] px-2 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.key + "-" + i}>
                  <td class="whitespace-nowrap px-3 py-2 font-data text-muted-foreground">{r.key.slice(8, 10)}</td>
                  <td class="px-3 py-2">
                    <p class="font-medium leading-snug">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" class="text-chart-2 underline underline-offset-2">
                          {r.titulo}
                        </a>
                      ) : r.titulo}
                    </p>
                    <p class="font-data text-[11px] text-muted-foreground md:text-[12px]">{r.recurso && r.recurso !== "—" ? `${r.habilidad} · ${r.recurso}` : r.habilidad}</p>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right font-data font-semibold">
                    {r.secs > 0 ? fmtTotal(r.secs) : "—"}
                  </td>
                  <td class="whitespace-nowrap py-2 pl-4 pr-2 text-right">
                    {r.row ? (
                      <DropdownMenu label={`Opciones de ${r.titulo}`}>
                        <DropdownMenuItem onClick={() => editRow(r)}>
                          <Pencil class="size-5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => askDelete(r)}>
                          <Trash2 class="size-5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenu>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p class="px-4 py-3 text-sm text-muted-foreground">Sin registros en esta hoja.</p>
        )}
      </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        label={selDate ? `Actividades del ${selDate.getDate()}` : "Actividades del día"}
      >
        {selDate && (
          <div>
            <div class="px-1">
              <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground">
                Detalle del día
              </p>
              <div class="mt-1 flex items-baseline justify-between gap-2">
                <p class="text-[16px] font-semibold md:text-[18px]">
                  {selDate.toLocaleDateString("es", { day: "numeric", month: "long" })}
                </p>
                <p class="font-data text-[16px] font-bold md:text-[18px]">
                  {sel && sel.total > 0 ? fmtTotal(sel.total) : "0m"}
                </p>
              </div>
              {sel && sel.entries.length > 0 && (
                <div class="mt-3 flex gap-2">
                  {AREAS.map((a) => {
                    const items = sel.entries.filter((e) => (e.area || "ingles") === a);
                    if (items.length === 0) return null;
                    const v = sel.byArea?.[a] || 0;
                    const active = drawerArea === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setDrawerArea(active ? null : a)}
                        aria-pressed={active}
                        aria-expanded={active}
                        style={active ? { boxShadow: `0 0 0 2px ${AREA_COLOR[a]}` } : undefined}
                        class="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span class="flex items-center gap-1.5 truncate text-[12px] font-medium">
                          <span style={{ color: AREA_COLOR[a] }}>
                            <AreaIcon area={a} class="size-4" />
                          </span>
                          {AREA_LABEL[a]}
                        </span>
                        <span class="font-data mt-0.5 block text-[15px] font-bold leading-tight">
                          {v > 0 ? fmtTotal(v) : `${items.length} ses`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div class={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${drawerArea ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div class="min-h-0 overflow-hidden">
              {sel && shownArea && (() => {
                const items = sel.entries.filter((e) => (e.area || "ingles") === shownArea);
                if (items.length === 0) return null;
                const listOpen = drawerArea === shownArea;
                return (
                  <ul
                    key={shownArea}
                    onAnimationEnd={(e) => {
                      if (e.target === e.currentTarget && !listOpen) setShownArea(null);
                    }}
                    class={`mt-1 divide-y divide-border px-1 motion-reduce:animate-none ${listOpen ? "animate-in fade-in-0 slide-in-from-top-2 duration-200" : "animate-out fade-out-0 slide-out-to-top-2 duration-200"}`}
                  >
                    {items.map((e, idx) => (
                      <li key={idx} class="py-2.5">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <p class="truncate text-[13px] font-medium leading-snug">
                              {(() => {
                                const t = e.titulo || "";
                                const cortado = t.length > 36;
                                const visible = cortado ? t.slice(0, 36).trimEnd() : t;
                                return (
                                  <>
                                    {e.url ? (
                                      <a href={e.url} target="_blank" rel="noreferrer" class="text-chart-2 underline underline-offset-2">
                                        {visible}
                                      </a>
                                    ) : visible}
                                    {cortado && <span class="text-muted-foreground">…</span>}
                                  </>
                                );
                              })()}
                            </p>
                            <p class="font-data text-[11px] text-muted-foreground">{e.recurso && e.recurso !== "—" ? `${e.habilidad} · ${e.recurso}` : e.habilidad}</p>
                            <p class="font-data mt-0.5 truncate text-[11px] text-muted-foreground">{e.notas || " "}</p>
                          </div>
                          <span class="inline-flex shrink-0 items-center gap-3">
                            <span class="w-14 shrink-0 text-right font-data text-[12px] font-semibold">
                              {e.secs > 0 ? fmtTotal(e.secs) : shownArea === "ejercicio" ? "1 ses" : "—"}
                            </span>
                            {e.row ? (
                              <DropdownMenu label={`Opciones de ${e.titulo}`}>
                                <DropdownMenuItem onClick={() => { setSheetOpen(false); editRow(e); }}>
                                  <Pencil class="size-5" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem destructive onClick={() => { setSheetOpen(false); askDelete(e); }}>
                                  <Trash2 class="size-5" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenu>
                            ) : null}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
                </div>
              </div>
            </div>
            {!(sel && sel.entries.length > 0) && (
              <p class="mt-2 px-1 py-3 text-sm text-muted-foreground">Sin registros ese día.</p>
            )}
            <div aria-hidden="true" class="h-8" />
          </div>
        )}
      </Sheet>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v && !deleting) setPendingDelete(null); }}
        label="Eliminar registro"
      >
        <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
        <AlertDialogDescription>
          {pendingDelete ? `¿Eliminar "${pendingDelete.titulo}"? Esta acción no se puede deshacer.` : ""}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingDelete(null)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction destructive disabled={deleting} onClick={confirmDelete}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
