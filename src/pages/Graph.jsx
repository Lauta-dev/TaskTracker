import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { Pencil, Plus, Trash2, X } from "lucide-preact";
import { deleteRowApi, getMonthlyTotals, pendingCount, AREAS, AREA_LABEL } from "../api.js";
import { useRows, cachedRows, prefetchRows } from "../hooks/useRows.js";
import { currentMonth, dayKey, monthCells, monthFromKey, monthKey, MONTH_LABEL } from "../dates.js";
import { fmtTotal } from "../format.js";
import { resolveMonth } from "../month.js";
import { Sheet } from "../components/ui/sheet";
import { AreaIcon } from "../components/AreaIcon";
import { AREA_TILE } from "./entry-form/presets.js";
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

const WDS = ["L", "M", "X", "J", "V", "S", "D"];

/* Rampas por área (0 = sin registro, 4 = 45+ min). Mismo lenguaje que el
   diseño: verde para Inglés, ámbar para Ejercicio, azul para Matemática. */
/* Rampa por defecto (sin filtro de área): violeta, el acento firma. */
const RAMP_DEFECTO = ["#151515", "#241c4f", "#3d2f8f", "#7052d6", "#a78bfa"];
const RAMPS = {
  ingles: ["#151515", "#0f3d27", "#14633c", "#1f9d5c", "#3ddc84"],
  ejercicio: ["#151515", "#4a2a0c", "#8a4d14", "#cc7a1f", "#ffb366"],
  matematica: ["#151515", "#12304f", "#1b4f85", "#3a89dd", "#7db4ff"],
};
const LEVEL_FG = ["#c9c9c9", "#e6e0fa", "#efeafd", "#04140b", "#04140b"];

/* Minutos del día -> nivel 0..4 (0 · ≤15 · ≤30 · ≤45 · 45+). */
function lvlMin(min) {
  if (!(min > 0)) return 0;
  if (min <= 15) return 1;
  if (min <= 30) return 2;
  if (min <= 45) return 3;
  return 4;
}

function Kpi({ value, label }) {
  return (
    <div class="rounded-xl bg-muted px-3 py-2">
      <b class="font-data block text-[15px] font-semibold leading-5 min-[840px]:text-[18px]">{value}</b>
      <span class="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/* Semanas de un mes. Se usa tanto para el mes activo como para las vistas
   previas/siguientes del carrusel. */
function MonthGrid({ month, rows, areaSel, today, selectedKey, onDayClick, active }) {
  const mv = monthFromKey(month) || currentMonth();
  const { y, m } = mv;
  const prefix = monthKey(y, m);

  const cells = monthCells(y, m);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayInfo = new Map();
  for (const r of rows || []) {
    if (!r.key?.startsWith(prefix)) continue;
    if (!dayInfo.has(r.key)) {
      dayInfo.set(r.key, { total: 0, entries: [], byArea: { ingles: 0, ejercicio: 0, matematica: 0 } });
    }
    const info = dayInfo.get(r.key);
    info.total += r.secs;
    const a = r.area || "ingles";
    if (info.byArea[a] === undefined) info.byArea[a] = 0;
    info.byArea[a] += r.secs;
    info.entries.push(r);
  }

  const secsOf = (info) => (areaSel ? info?.byArea?.[areaSel] || 0 : info?.total || 0);
  const weekTotal = (row) => row.reduce((acc, c) => acc + (c ? secsOf(dayInfo.get(c.key)) : 0), 0);
  const loading = rows === null && active;
  const isCurrent = prefix === today.slice(0, 7);
  const ramp = RAMPS[areaSel] || RAMP_DEFECTO;

  return (
    <div class="flex flex-col gap-[5px] min-[840px]:gap-2">
      {weeks.map((row, wi) => (
        <div
          key={"w" + wi}
          class="grid grid-cols-7 gap-[5px] min-[840px]:grid-cols-[repeat(7,minmax(0,1fr))_76px] min-[840px]:gap-2"
        >
          {row.map((c, ci) => {
            if (!c) return <div key={"x" + wi + "-" + ci} aria-hidden="true" />;
            if (loading) {
              return (
                <div
                  key={"s" + c.key}
                  aria-hidden="true"
                  class="aspect-square animate-pulse rounded-lg min-[840px]:rounded-xl bg-muted"
                />
              );
            }
            if (c.outside) {
              return (
                <div
                  key={c.key}
                  aria-hidden="true"
                  style={{ background: ramp[0] }}
                  class="relative flex aspect-square flex-col items-start justify-between rounded-lg p-[5px] text-left text-[11px] leading-none text-muted-foreground opacity-[.45] min-[840px]:rounded-xl min-[840px]:p-3 min-[840px]:text-[15px]"
                >
                  <span>{c.day}</span>
                </div>
              );
            }
            const info = dayInfo.get(c.key);
            const secs = secsOf(info);
            const lv = lvlMin(secs / 60);
            const isFuture = isCurrent && c.key > today;
            const isToday = c.key === today;
            const isSel = active && selectedKey === c.key;
            const hasData = secs > 0;
            return (
              <button
                type="button"
                key={c.key}
                disabled={!hasData}
                tabIndex={active ? 0 : -1}
                onClick={() => onDayClick?.(c.key)}
                title={`${c.day}: ${hasData ? fmtTotal(secs) : "sin registro"}`}
                style={{ background: ramp[lv], color: LEVEL_FG[lv] }}
                class={`relative flex aspect-square flex-col items-start justify-between rounded-lg p-[5px] text-left text-[11px] leading-none min-[840px]:rounded-xl min-[840px]:p-3 min-[840px]:text-[15px] ${
                  isFuture ? "pointer-events-none" : ""
                } ${hasData ? "cursor-pointer" : "pointer-events-none cursor-default"} ${
                  isSel ? "shadow-[inset_0_0_0_3px_var(--color-chart-2)]" : ""
                }`}
              >
                {isToday ? (
                  /* El nro no se mueve: placeholder invisible + banderín encima. */
                  <span aria-hidden="true" class="invisible">
                    {c.day}
                  </span>
                ) : (
                  <span>{c.day}</span>
                )}
                <small class="hidden text-[12px] font-medium opacity-85 min-[840px]:block">
                  {hasData ? fmtTotal(secs) : ""}
                </small>
                {isToday && (
                  <span
                    aria-hidden="true"
                    class="absolute left-0 top-0 rounded-tl-lg rounded-br-lg border-b border-r border-chart-2 bg-chart-2 p-[5px] min-[840px]:rounded-tl-xl min-[840px]:rounded-br-2xl min-[840px]:p-3"
                  >
                    <span class="block font-data text-[11px] font-bold leading-none text-[#04140b] min-[840px]:text-[15px]">
                      {c.day}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
          <div class="font-data hidden items-center justify-end pr-2 text-[12px] font-medium whitespace-nowrap text-muted-foreground tabular-nums min-[840px]:flex">
            {rows !== null && weekTotal(row) > 0 ? fmtTotal(weekTotal(row)) : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Graph({ onEdit, onAddToDay, vista = "grilla" }) {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const [areaSel, setAreaSel] = useState(null);
  const [daySelKey, setDaySelKey] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [sheetArea, setSheetArea] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rowError, setRowError] = useState("");
  const [monthly, setMonthly] = useState(null);
  const [pieArea, setPieArea] = useState(null);

  // Badge del filtro activo junto a "Resumen": entra/aparece con fade,
  // y al quitarlo se desvanece antes de desmontarse.
  const [areaBadge, setAreaBadge] = useState(null); // { label, dot }
  const [areaBadgeOut, setAreaBadgeOut] = useState(false);
  useEffect(() => {
    if (areaSel) {
      setAreaBadge({ label: AREA_LABEL[areaSel], dot: `var(--area-${areaSel})` });
      setAreaBadgeOut(false);
    } else if (areaBadge) {
      setAreaBadgeOut(true);
      const t = setTimeout(() => setAreaBadge(null), 150);
      return () => clearTimeout(t);
    }
  }, [areaSel]);
  // Swipe horizontal en la grilla para cambiar de mes (las flechas ya no están).
  const swipeRef = useRef(null);
  const swipedRef = useRef(false);
  const clipRef = useRef(null);
  const trackRef = useRef(null);
  const animRef = useRef(false);

  const month = resolveMonth(search);
  const { rows: apiRows, live, error, retry } = useRows(month);
  // Filas del mes visible: caché (cambio instantáneo) o las recién pedidas.
  const rowsNow = cachedRows(month) ?? apiRows;

  // Mes a mostrar: la grilla se construye del mes activo, no de las filas.
  const now = currentMonth();
  const mv = monthFromKey(month) || now;
  const y = mv.y, m = mv.m;
  const prefix = monthKey(y, m);
  const today = dayKey(new Date());
  const isCurrent = prefix === monthKey(now.y, now.m);
  const daysInMonth = new Date(y, m, 0).getDate();
  // Días transcurridos: en el mes en curso hasta hoy; en uno cerrado, todos.
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : prefix < monthKey(now.y, now.m) ? daysInMonth : 0;

  // Vecinos para el carrusel: se precargan en segundo plano.
  const prevDate = new Date(y, m - 2, 1);
  const nextDate = new Date(y, m, 1);
  const prevKey = monthKey(prevDate.getFullYear(), prevDate.getMonth() + 1);
  const nextKey = monthKey(nextDate.getFullYear(), nextDate.getMonth() + 1);
  const [, setNeighborTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      Promise.all([prefetchRows(prevKey), prefetchRows(nextKey)]).then(() => {
        if (alive) setNeighborTick((v) => v + 1);
      });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [prevKey, nextKey]);

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

  // Totales por mes para la vista pastel, con filtro por área.
  useEffect(() => {
    if (vista !== "pastel") return;
    let alive = true;
    setMonthly(null);
    getMonthlyTotals(pieArea).then((mm) => {
      if (alive) setMonthly(mm);
    }).catch(() => {
      if (alive) setMonthly([]);
    });
    return () => {
      alive = false;
    };
  }, [vista, pieArea]);

  const dayInfo = new Map();
  for (const r of rowsNow || []) {
    if (!r.key?.startsWith(prefix)) continue;
    if (!dayInfo.has(r.key)) {
      dayInfo.set(r.key, { total: 0, entries: [], byArea: { ingles: 0, ejercicio: 0, matematica: 0 } });
    }
    const info = dayInfo.get(r.key);
    info.total += r.secs;
    const a = r.area || "ingles";
    if (info.byArea[a] === undefined) info.byArea[a] = 0;
    info.byArea[a] += r.secs;
    info.entries.push(r);
  }

  const rows = (rowsNow || [])
    .filter((r) => r.key?.startsWith(prefix))
    .sort((a, b) => b.key.localeCompare(a.key));

  const areaTotal = (a) => {
    let t = 0;
    for (const v of dayInfo.values()) t += v.byArea?.[a] || 0;
    return t;
  };
  const daySecs = (info) => (areaSel ? info?.byArea?.[areaSel] || 0 : info?.total || 0);

  const total = areaSel ? areaTotal(areaSel) : [...dayInfo.values()].reduce((acc, v) => acc + v.total, 0);
  const daysActive = [...dayInfo.values()].filter((v) => daySecs(v) > 0).length;
  const avg = daysActive > 0 ? total / daysActive : 0;

  // Racha dentro del mes visible (cortada a los días transcurridos).
  let run = 0;
  let best = 0;
  for (let d = 1; d <= elapsed; d++) {
    const key = `${prefix}-${String(d).padStart(2, "0")}`;
    if (daySecs(dayInfo.get(key)) > 0) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  function toggleArea(a) {
    setAreaSel((cur) => (cur === a ? null : a));
  }

  function shiftMonth(d) {
    const dt = new Date(y, m - 1 + d, 1);
    navigate(`/?month=${monthKey(dt.getFullYear(), dt.getMonth() + 1)}`);
  }

  function onGridPointerDown(e) {
    if (animRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeRef.current = { x: e.clientX, y: e.clientY, horiz: false };
    swipedRef.current = false;
  }

  const slideWidth = () => clipRef.current?.clientWidth || 360;

  /* Mueve el riel por CSS directo: sin re-renderizar el calendario en cada
     píxel (evita el tirón al soltar en el celular). */
  function setDx(px, animate) {
    const t = trackRef.current;
    if (!t) return;
    t.style.transition = animate ? "transform 260ms cubic-bezier(.22,.61,.36,1)" : "none";
    t.style.setProperty("--swipe-dx", `${px}px`);
  }

  function onGridPointerMove(e) {
    const s = swipeRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.horiz) {
      // Recién a los 10px decidimos: vertical (scroll) o horizontal (mes).
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        swipeRef.current = null;
        return;
      }
      s.horiz = true;
      document.activeElement?.blur?.();
    }
    swipedRef.current = true;
    const w = slideWidth();
    setDx(Math.max(-w, Math.min(w, dx)), false);
  }

  function slideTo(dir) {
    const w = slideWidth() + 24; // + gap entre paneles del carrusel
    animRef.current = true;
    // 1) el panel vecino entra completo, como un carrusel.
    setDx(-dir * w, true);
    window.setTimeout(() => {
      // 2) el vecino ya está centrado: cambia el mes y reajusta el riel
      //    sin transición (el panel que se ve es el mismo, sin salto).
      setDx(0, false);
      shiftMonth(dir);
      animRef.current = false;
    }, 270);
  }

  function onGridPointerUp(e) {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s?.horiz) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60) {
      slideTo(dx < 0 ? 1 : -1);
    } else {
      setDx(0, true);
    }
  }

  function onGridPointerCancel() {
    swipeRef.current = null;
    swipedRef.current = false;
    setDx(0, true);
  }

  function openDay(key) {
    // El click que cierra un swipe (o la animación) no abre el día.
    if (swipedRef.current || animRef.current) {
      swipedRef.current = false;
      return;
    }
    setDaySelKey(key);
    setDayOpen(true);
    setSheetArea(null);
  }

  const sel = daySelKey ? dayInfo.get(daySelKey) : null;
  const selDate = daySelKey ? new Date(y, m - 1, Number(daySelKey.slice(8, 10))) : null;
  const selToday = daySelKey === today;
  const selAreas = sel ? AREAS.filter((a) => (sel.byArea?.[a] || 0) > 0 || sel.entries.some((e) => (e.area || "ingles") === a)) : [];
  const selEntries = sel ? sel.entries.filter((e) => !sheetArea || (e.area || "ingles") === sheetArea) : [];
  const queued = month ? pendingCount(month) : 0;

  // Badges de áreas reutilizados como footer de la grilla.
  const badges = AREAS.map((a) => (
    <button
      key={a}
      type="button"
      aria-pressed={areaSel === a}
      onClick={() => toggleArea(a)}
      data-active={areaSel === a || undefined}
      class={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-all duration-200 min-[840px]:min-h-9 min-[840px]:gap-2.5 min-[840px]:rounded-xl min-[840px]:px-2.5 min-[840px]:py-0 min-[840px]:text-[13px] ${
        areaSel === a
          ? "bg-secondary text-secondary-foreground"
          : `bg-muted text-foreground min-[840px]:bg-transparent ${areaSel ? "opacity-40" : ""}`
      }`}
    >
      <i class="size-2.5 shrink-0 rounded-full" style={{ background: `var(--area-${a})` }} />
      <span class="min-w-0 flex-1 truncate text-left">{AREA_LABEL[a]}</span>
      <em class={`font-data shrink-0 not-italic ${areaSel === a ? "" : "text-muted-foreground"}`}>
        {fmtTotal(areaTotal(a))}
      </em>
    </button>
  ));

  // Carrusel: mes anterior, actual y siguiente.
  const panelKeys = [prevKey, month, nextKey];
  const panelRows = (key) => (key === month ? rowsNow : cachedRows(key));

  return (
    <div>
      {apiRows !== null && !live && (
        <button
          type="button"
          onClick={retry}
          class="font-data mb-3 block text-left text-[11px] text-muted-foreground underline underline-offset-4"
        >
          Sin conexión · mostrando lo guardado{queued > 0 ? ` · ${queued} en cola` : ""} · reintentar{error ? ` (${error})` : ""}
        </button>
      )}

      {vista === "grilla" && (
        <div class="flex flex-col gap-8 min-[840px]:grid min-[840px]:grid-cols-[600px_minmax(0,1fr)] min-[840px]:items-start min-[840px]:gap-5">
          <div class="min-w-0">
            <div
              ref={clipRef}
              class="touch-pan-y overflow-hidden select-none"
              onPointerDown={onGridPointerDown}
              onPointerMove={onGridPointerMove}
              onPointerUp={onGridPointerUp}
              onPointerCancel={onGridPointerCancel}
            >
              {/* Cabecera fija; solo se deslizan las semanas. */}
              <div class="grid grid-cols-7 gap-[5px] min-[840px]:grid-cols-[repeat(7,minmax(0,1fr))_76px] min-[840px]:gap-2">
                {WDS.map((w) => (
                  <div key={w} class="font-data pb-1.5 text-center text-[11px] text-muted-foreground min-[840px]:text-xs">
                    {w}
                  </div>
                ))}
                <div class="font-data hidden pb-1.5 pr-2 text-right text-xs text-muted-foreground min-[840px]:block">Sem</div>
              </div>

              <div class="relative overflow-hidden">
                <div
                  ref={trackRef}
                  class="flex gap-6 will-change-transform"
                  style={{ transform: "translateX(calc(-100% - 24px + var(--swipe-dx, 0px)))" }}
                >
                  {panelKeys.map((key) => {
                    const isActive = key === month;
                    return (
                      <div
                        key={key}
                        aria-hidden={!isActive}
                        class={`w-full shrink-0 ${isActive ? "" : "pointer-events-none"}`}
                      >
                        <MonthGrid
                          month={key}
                          rows={panelRows(key)}
                          areaSel={areaSel}
                          today={today}
                          selectedKey={isActive ? (dayOpen ? daySelKey : null) : null}
                          onDayClick={isActive ? openDay : null}
                          active={isActive}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {rowError && <p class="mt-2 text-sm text-destructive">{rowError}</p>}
          </div>

          <aside class="min-w-0">
            <section class="flex flex-col gap-2.5 rounded-[20px] bg-card p-4 min-[840px]:rounded-3xl min-[840px]:p-5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-data text-[11px] uppercase tracking-[.12em] text-muted-foreground">
                  Resumen del mes
                </p>
                <span
                  aria-hidden={!areaSel}
                  class={`font-data inline-flex min-h-4 items-center gap-1.5 rounded-full bg-muted px-2 text-[10px] uppercase tracking-[.12em] text-foreground transition-all duration-150 ${
                    areaSel && !areaBadgeOut ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <i class="size-1.5 shrink-0 rounded-full" style={{ background: areaBadge?.dot ?? "transparent" }} />
                  {areaBadge?.label ?? ""}
                </span>
              </div>
              <p class="font-display text-[30px] font-semibold leading-[34px] tracking-tight min-[840px]:text-[40px] min-[840px]:leading-[44px]">
                {apiRows === null ? (
                  <span class="inline-block h-8 w-32 animate-pulse rounded bg-muted align-middle" />
                ) : (
                  fmtTotal(total)
                )}
                <span class="ml-2 font-sans text-xs font-normal tracking-normal text-muted-foreground">registradas</span>
              </p>
              <div class="grid grid-cols-2 gap-1.5">
                <Kpi value={`${run} días`} label="Racha actual" />
                <Kpi value={`${best} días`} label="Mejor racha" />
                <Kpi value={`${daysActive} / ${elapsed}`} label="Días activos" />
                <Kpi value={daysActive ? fmtTotal(avg) : "—"} label="Promedio por día activo" />
              </div>

              {/* Footer de la card: filtros por área. */}
              {AREAS.length > 0 && (
                <>
                  <hr class="border-border" />
                  <div class={`flex w-full flex-wrap gap-1.5 min-[840px]:flex-col min-[840px]:flex-nowrap min-[840px]:gap-0.5`}>
                    {badges}
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      )}

      {vista === "pastel" && (
        <div key="pastel" class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          {monthly === null ? (
            <div aria-hidden="true" class="rounded-2xl bg-card px-4 py-4">
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

      <Sheet
        open={dayOpen}
        onOpenChange={setDayOpen}
        label={selDate ? `Actividades del ${selDate.getDate()}` : "Actividades del día"}
      >
        {selDate && (
          <div class="pb-4">

            <div class="flex items-end justify-between gap-3">
              <div class="min-w-0">
                <h2 class="font-display text-[22px] font-semibold leading-7 tracking-tight">
                  {(() => {
                    const s = selDate.toLocaleDateString("es", { weekday: "long", day: "numeric" }).replace(",", "");
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}
                </h2>
                <p class="text-sm text-muted-foreground">
                  {MONTH_LABEL(prefix)}
                  {selToday ? " · hoy" : ""}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <b class="font-data block text-[22px] font-semibold leading-7">{sel ? fmtTotal(sel.total) : "0m"}</b>
                <p class="text-xs text-muted-foreground">total del día</p>
              </div>
            </div>

            {sel && sel.total > 0 && (
              <>
                <div class="mt-3 grid grid-cols-3 gap-2">
                  {selAreas.map((a) => {
                    const v = sel.byArea?.[a] || 0;
                    const n = sel.entries.filter((e) => (e.area || "ingles") === a).length;
                    const on = sheetArea === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSheetArea((cur) => (cur === a ? null : a))}
                        style={on ? { background: AREA_TILE[a].bg, color: AREA_TILE[a].fg } : undefined}
                        class="flex min-h-[72px] flex-col justify-between rounded-xl bg-muted p-2.5 text-left transition-colors"
                      >
                        <span class={`flex items-center gap-1.5 text-[12px] font-medium ${on ? "" : "text-muted-foreground"}`}>
                          <AreaIcon area={a} class="size-4" />
                          <span class="truncate">{AREA_LABEL[a]}</span>
                        </span>
                        <b class="font-data text-[17px] font-semibold leading-6">
                          {v > 0 ? fmtTotal(v) : `${n} ${n === 1 ? "sesión" : "sesiones"}`}
                        </b>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <ul class="mt-2 divide-y divide-border">
              {selEntries.map((e, idx) => {
                const a = e.area || "ingles";
                const sub = [e.habilidad, e.recurso && e.recurso !== "—" ? e.recurso : ""].filter(Boolean).join(" · ");
                return (
                  <li key={idx} class="flex items-center gap-3 py-2.5">
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-full"
                      style={{ background: AREA_TILE[a].bg, color: AREA_TILE[a].fg }}
                    >
                      <AreaIcon area={a} class="size-5" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="flex items-center gap-1.5 text-[15px] font-medium leading-5">
                        {e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer"
                            class="truncate text-chart-2 no-underline"
                            title={e.titulo}
                          >
                            {e.titulo}
                          </a>
                        ) : (
                          <span class="truncate" title={e.titulo}>{e.titulo}</span>
                        )}
                      </p>
                      <p class="truncate text-xs text-muted-foreground" title={e.notas || undefined}>{sub}</p>
                    </div>
                    <span class="font-data shrink-0 text-[13px] font-semibold">
                      {e.secs > 0 ? fmtTotal(e.secs) : "—"}
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
                  </li>
                );
              })}
            </ul>
            {selEntries.length === 0 && (
              <p class="py-6 text-center text-sm text-muted-foreground">Sin actividades registradas este día.</p>
            )}

            <button
              type="button"
              onClick={() => {
                const key = daySelKey;
                setDayOpen(false);
                if (key) onAddToDay?.(key);
              }}
              class="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-chart-2 text-sm font-medium text-primary-foreground transition-transform active:scale-[.99]"
            >
              <Plus class="size-5" /> Agregar a este día
            </button>
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
