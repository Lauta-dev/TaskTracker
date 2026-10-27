import { useEffect, useState } from "preact/hooks";
import { Fragment } from "preact";
import { useLocation, useSearch } from "wouter";
import { BookOpen, ChevronLeft, ChevronRight, Dumbbell, Sigma } from "lucide-preact";
import { deleteRowApi, getMonthlyTotals, getRows, pendingCount, AREAS, AREA_LABEL } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { addDays, currentMonth, dayKey, monthCells, monthFromKey, monthKey, MONTH_LABEL } from "../dates.js";
import { fmtShort, fmtTotal, level } from "../format.js";
import { resolveMonth } from "../month.js";
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
import { Pie } from "../components/Pie";
import { Pencil, Trash2 } from "lucide-preact";

/* Rampa shadcn: chart-2 con opacidad sobre el fondo oscuro.
   lv 0 = día sin registro. */
const LEVEL_BG = [
  "bg-muted",
  "bg-chart-2/25",
  "bg-chart-2/50",
  "bg-chart-2/75",
  "bg-chart-2",
];

/* Leyenda: 0 · <20 min · 20-39 · 40-59 · 60+. */
const WDS = ["L", "M", "X", "J", "V", "S", "D"];

/* Íconos por área para el card "Por área". */
const AREA_ICON = {
  ingles: BookOpen,
  matematica: Sigma,
  ejercicio: Dumbbell,
};

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

export function Graph({ onEdit, vista = "grilla" }) {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const [daySelKey, setDaySelKey] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);
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

  const month = resolveMonth(search);
  const { rows: apiRows, live, error, retry } = useRows(month);

  function editRow(r) {
    setRowError("");
    onEdit?.({ row: r.row, key: r.key, area: r.area || "ingles", secs: r.secs, habilidad: r.habilidad, recurso: r.recurso, titulo: r.titulo, url: r.url, notas: r.notas });
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
      await deleteRowApi(r.row);
      setPendingDelete(null);
      window.dispatchEvent(new Event("tt:rows"));
    } catch {
      setPendingDelete(null);
      setRowError("Sin conexión: no se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  // URL predecible: si no hay ?month= se fija al mes resuelto. Solo en "/"
  // — si la vista está saliendo, no secuestrar.
  useEffect(() => {
    if (path !== "/" || !month) return;
    const param = new URLSearchParams(search || "").get("month");
    if (!/^\d{4}-\d{2}$/.test(param || "")) {
      navigate(`/?month=${encodeURIComponent(month)}`, { replace: true });
    }
  }, [path, month, search]);

  // Totales por mes para el pie, con filtro por área (null = todas).
  // Lazy: solo se pide al abrir la vista pastel o cambiar el filtro.
  const [pieArea, setPieArea] = useState(null);
  useEffect(() => {
    if (vista !== "pastel") return;
    let alive = true;
    setMonthly(null);
    getMonthlyTotals(pieArea).then((m) => {
      if (alive) setMonthly(m);
    }).catch(() => {
      if (alive) setMonthly([]);
    });
    return () => {
      alive = false;
    };
  }, [vista, pieArea]);

  // Mes a mostrar: la grilla se construye del mes activo, no de las filas.
  const now = currentMonth();
  // Skeleton con la forma del mes actual del dispositivo.
  const skelCells = monthCells(now.y, now.m);
  let skelLast = -1;
  skelCells.forEach((c, i) => {
    if (c === null) return;
    skelLast = i;
  });
  const skelHas = (p) => skelCells[p] !== null;
  const mv = monthFromKey(month) || now;
  const y = mv.y, m = mv.m;
  const prefix = monthKey(y, m);

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

  const today = dayKey(new Date());
  const isCurrent = prefix === monthKey(now.y, now.m);
  const daysInMonth = new Date(y, m, 0).getDate();
  // "21 de 27 días": en el mes en curso cuenta hasta hoy; en un mes
  // cerrado, completo.
  const elapsed = isCurrent ? new Date().getDate() : daysInMonth;
  const diasActivos = [...dayInfo.values()].filter((v) => v.total > 0).length;
  const monthTotal = [...dayInfo.values()].reduce((acc, v) => acc + v.total, 0);
  const promedio = diasActivos > 0 ? monthTotal / diasActivos : 0;

  // Racha: necesita el historial completo (rachas cruzan meses).
  const [streak, setStreak] = useState({ cur: 0, best: 0, week: [] });
  useEffect(() => {
    if (!month) return;
    let alive = true;
    getRows(null).then((res) => {
      if (!alive) return;
      const t = new Map();
      for (const r of res.rows || []) {
        if (!r.key) continue;
        t.set(r.key, (t.get(r.key) || 0) + r.secs);
      }
      const keys = [...t.keys()].sort();
      let best = 0;
      let run = 0;
      let prev = "";
      for (const k of keys) {
        run = prev && addDays(prev, 1) === k ? run + 1 : 1;
        if (run > best) best = run;
        prev = k;
      }
      // Racha actual: hacia atrás desde hoy (hoy cuenta si tiene registro).
      let cur = 0;
      let day = today;
      while (t.has(day) && t.get(day) > 0) {
        cur++;
        day = addDays(day, -1);
      }
      // Últimos 7 días para las minibarras (X..M, hoy al final).
      const week = [];
      for (let i = -6; i <= 0; i++) {
        const k = addDays(today, i);
        week.push({
          key: k,
          secs: t.get(k) || 0,
          wd: new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)))
            .toLocaleDateString("es", { weekday: "narrow" }).toUpperCase(),
        });
      }
      setStreak({ cur, best, week });
    }).catch(() => {
      if (!alive) return;
      setStreak({ cur: 0, best: 0, week: [] });
    });
    return () => {
      alive = false;
    };
  }, [month, today, apiRows]);

  // Total de mes por área (cards + drawer).
  function areaTotal(a) {
    let t = 0;
    for (const v of dayInfo.values()) t += v.byArea?.[a] || 0;
    return t;
  }

  // Bloque final del mes: intensidad por mínutos totales.
  const monthLv = level(monthTotal);

  // Semanas (chunks de 7 celdas) con su total; skeleton usa la misma forma.
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
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const weekTotals = weeks.map((row) => row.reduce((acc, c) => (c == null ? acc : acc + c.total), 0));
  const skelWeeks = [];
  for (let i = 0; i < skelCells.length; i += 7) skelWeeks.push(skelCells.slice(i, i + 7));

  function shiftMonth(d) {
    const dt = new Date(y, m - 1 + d, 1);
    navigate(`/?month=${monthKey(dt.getFullYear(), dt.getMonth() + 1)}`);
  }

  function openDay(key) {
    setDaySelKey(key);
    setDayOpen(true);
    setDrawerArea(null);
    setShownArea(null);
  }

  const sel = daySelKey ? dayInfo.get(daySelKey) : null;
  const selDate = daySelKey ? new Date(y, m - 1, Number(daySelKey.slice(8, 10))) : null;
  const queued = month ? pendingCount(month) : 0;
  // Mayor de los últimos 7 días: escala las minibarras de racha.
  const weekMax = Math.max(1, ...streak.week.map((d) => d.secs));

  return (
    <div>
      <div class="mb-4">
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

      {vista !== "tabla" && vista !== "pastel" && (
      <>
      <div key="grilla-wrap" class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 md:flex md:items-start md:gap-4">
      <div key="grilla" class="min-w-0 flex-1">
        {/* Header del heatmap: mes + resumen a la izquierda, navegación a la derecha. */}
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h1 class="font-display text-[24px] font-semibold capitalize leading-none tracking-tight md:text-[27px]">{MONTH_LABEL(prefix)}</h1>
            <p class="font-data mt-1.5 text-[11px] text-muted-foreground md:text-[12px]">
              {monthTotal > 0 ? `${fmtShort(monthTotal)} · ` : ""}{diasActivos} días activos
            </p>
          </div>
          <div class="flex shrink-0 items-center rounded-full border border-border">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              title="Mes anterior"
              aria-label="Mes anterior"
              class="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted md:size-10"
            >
              <ChevronLeft class="size-5" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              title="Mes siguiente"
              aria-label="Mes siguiente"
              class="flex size-9 items-center justify-center border-l border-border rounded-r-full text-muted-foreground transition-colors active:bg-muted md:size-10"
            >
              <ChevronRight class="size-5" />
            </button>
          </div>
        </div>
        <div class="grid gap-0 -mx-2 sm:-mx-4 md:mx-0" style={{ gridTemplateColumns: "repeat(7, 1fr) 68px" }}>
          {WDS.map((w) => (
            <div key={w} class="font-data pb-1 text-center text-[12px] uppercase tracking-widest text-muted-foreground md:pb-2 md:text-[13px]">
              {w}
            </div>
          ))}
          <div class="font-data pb-1 text-right text-[10px] uppercase tracking-widest text-muted-foreground md:pb-2 md:text-[11px]">Semana</div>
          {(apiRows === null ? skelWeeks : weeks).map((row, wi) => (
            <Fragment key={"w" + wi}>
              {row.map((d, ci) => {
                const i = wi * 7 + ci;
                if (apiRows === null) {
                  // Skeleton con la forma del mes actual del dispositivo.
                  if (d === null) {
                    if (i <= skelLast) return <div key={"x" + i} aria-hidden="true" />;
                    if (i !== skelLast + 1) return <div key={"x" + i} aria-hidden="true" />;
                    const span = skelCells.length - 1 - skelLast;
                    return (
                      <div
                        key="skel-total"
                        aria-hidden="true"
                        style={{ gridColumn: span > 1 ? `${(i % 7) + 2} / span ${span}` : undefined }}
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
                }
                if (d == null) {
                  if (i <= lastIdx) return <div key={"x" + i} />;
                  // Relleno final: un solo bloque que ocupa todos los espacios.
                  if (i !== lastIdx + 1) return <div key={"x" + i} aria-hidden="true" />;
                  const span = cells.length - 1 - lastIdx;
                  return (
                    <div
                      key="month-total"
                      title={`Total del mes: ${fmtTotal(monthTotal)}`}
                      style={{ gridColumn: span > 1 ? `${(i % 7) + 2} / span ${span}` : undefined }}
                      class={`relative min-h-full w-full overflow-hidden border border-border rounded-br-md ${LEVEL_BG[monthLv]}`}
                    >
                      <span class="absolute inset-0 flex items-center justify-center p-1.5">
                        <span class="font-data text-[14px] font-bold leading-none text-foreground md:text-[17px]">
                          {fmtShort(monthTotal)}
                        </span>
                      </span>
                    </div>
                  );
                }
                const lv = level(d.total);
                const isFuture = d.key > today && isCurrent;
                const isToday = d.key === today;
                const hasData = d.total > 0;
                const done = [...new Set((dayInfo.get(d.key)?.entries || []).map((e) => e.area || "ingles"))];
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
                return (
                  <button
                    type="button"
                    key={d.key}
                    disabled={!hasData}
                    onClick={() => openDay(d.key)}
                    title={`${d.day}: ${d.total > 0 ? fmtTotal(d.total) : "sin registro"}`}
                    class={`relative aspect-square w-full overflow-hidden border border-border text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${LEVEL_BG[lv]} ${cc} ${isFuture ? "border-dashed" : ""} ${isToday ? "after:absolute after:inset-0 after:rounded-[inherit] after:ring-2 after:ring-foreground/80" : ""} ${hasData ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span class="absolute inset-0 flex flex-col justify-between p-2 md:p-2.5">
                      <span class={`font-data text-[15px] font-bold leading-none md:text-[17px] ${lv >= 4 ? "text-background" : lv > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {d.day}
                      </span>
                      {done.length > 0 && (
                        <span class="flex gap-1">
                          {done.map((a) => (
                            <span
                              key={a}
                              title={AREA_LABEL[a]}
                              style={{ background: AREA_COLOR[a] }}
                              class="size-[7px] rounded-full ring-1 ring-background/50"
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {/* Total de la semana, a la derecha. */}
              <div class="flex aspect-square w-full flex-col items-end justify-end pb-2.5 md:pb-2">
                <span class={`font-data text-[12px] font-semibold leading-none md:text-[13px] ${weekTotals[wi] > 0 ? "text-foreground" : "text-muted-foreground/70"}`}>
                  {weekTotals[wi] > 0 ? fmtShort(weekTotals[wi]) : ""}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <aside class="mt-6 space-y-3 md:mt-0 md:w-[300px] md:shrink-0">
        {/* ESTE MES */}
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">Este mes</p>
          <p class="font-display mt-1 text-[30px] font-semibold leading-none tracking-tight md:text-[34px]">
            {apiRows === null ? <span class="inline-block h-7 w-32 animate-pulse rounded-sm bg-muted" /> : fmtTotal(monthTotal)}
          </p>
          {apiRows !== null && (
            <p class="mt-2 text-[12px] text-muted-foreground md:text-[13px]">
              {diasActivos} de {elapsed} días con registro
              {promedio > 0 ? <> · promedio {fmtShort(promedio)} por día activo</> : null}
            </p>
          )}
        </div>
        {/* RACHA */}
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex gap-6">
            <div>
              <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">Racha actual</p>
              <p class="font-display mt-1 text-[22px] font-semibold leading-none md:text-[24px]">{streak.cur} días</p>
            </div>
            <div>
              <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">Mejor</p>
              <p class="font-display mt-1 text-[22px] font-semibold leading-none text-muted-foreground md:text-[24px]">{streak.best} días</p>
            </div>
          </div>
          {/* Minibarras: Últimos 7 días (X..M). */}
          <div aria-hidden="true" class="mt-3 flex h-12 items-end gap-1.5">
            {streak.week.map((d) => (
              <div
                key={d.key}
                title={`${d.key}: ${fmtTotal(d.secs)}`}
                style={{ height: `${d.secs > 0 ? Math.max(12, (d.secs / weekMax) * 100) : 6}%` }}
                class={`min-h-[4px] flex-1 rounded-[4px] ${d.secs > 0 ? "bg-chart-2" : "bg-muted"}`}
              />
            ))}
          </div>
          <div class="mt-1 flex gap-1.5">
            {streak.week.map((d) => (
              <span key={d.key} class="font-data flex-1 text-center text-[9px] text-muted-foreground">{d.wd}</span>
            ))}
          </div>
        </div>
        {/* POR ÁREA */}
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="font-data text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">Por área</p>
          {monthTotal > 0 ? (
            <>
              <div class="mt-3 flex h-2.5 gap-[3px]" role="img" aria-label={`Reparto del mes: ${AREAS.filter((a) => areaTotal(a) > 0).map((a) => `${AREA_LABEL[a]} ${fmtTotal(areaTotal(a))}`).join(", ")}`}>
                {(() => {
                  const vis = AREAS.filter((a) => (areaTotal(a)) > 0);
                  return vis.map((a, i) => (
                    <div
                      key={a}
                      title={`${AREA_LABEL[a]}: ${fmtTotal(areaTotal(a))}`}
                      style={{ width: `${(areaTotal(a) / monthTotal) * 100}%`, background: AREA_COLOR[a] }}
                      class={`h-full ${i === 0 ? "rounded-l-full" : ""} ${i === vis.length - 1 ? "rounded-r-full" : ""}`}
                    />
                  ));
                })()}
              </div>
              <ul class="mt-3 space-y-1.5">
                {AREAS.map((a) => {
                  const v = areaTotal(a);
                  if (!(v > 0)) return null;
                  const Icon = AREA_ICON[a];
                  return (
                    <li key={a} class="flex items-center gap-2 text-[14px]">
                      <Icon class="size-4 shrink-0" style={{ color: AREA_COLOR[a] }} />
                      <span class="min-w-0 flex-1 truncate">{AREA_LABEL[a]}</span>
                      <span class="font-data shrink-0 text-[13px] font-semibold">{fmtTotal(v)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p class="text-sm text-muted-foreground mt-2">Sin datos este mes.</p>
          )}
        </div>
      </aside>
      </div>
      </>
      )}

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
            <Pie key={pieArea || "all"} data={monthly} area={pieArea} onAreaChange={setPieArea} />
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
          <p class="px-4 py-3 text-sm text-muted-foreground">Sin registros este mes.</p>
        )}
      </div>
      )}

      <Sheet
        open={dayOpen}
        onOpenChange={setDayOpen}
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
                  {(() => {
                    const s = selDate.toLocaleDateString("es", { weekday: "long", day: "numeric" }).replace(",", "");
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}
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
                            <AreaIcon area={a} />
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
                            <p class="font-data mt-0.5 truncate text-[11px] text-muted-foreground">{e.notas || " "}</p>
                          </div>
                          <span class="inline-flex shrink-0 items-center gap-3">
                            <span class="w-14 shrink-0 text-right font-data text-[12px] font-semibold">
                              {e.secs > 0 ? fmtTotal(e.secs) : shownArea === "ejercicio" ? "1 ses" : "—"}
                            </span>
                            {e.row ? (
                              <DropdownMenu label={`Opciones de ${e.titulo}`}>
                                <DropdownMenuItem onClick={() => { setDayOpen(false); editRow(e); }}>
                                  <Pencil class="size-5" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem destructive onClick={() => { setDayOpen(false); askDelete(e); }}>
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
