import { useState } from "preact/hooks";
import { fmtTotal } from "../format.js";

const COLORS = [
  "oklch(0.63 0.17 150)", // verde (acento de la app)
  "oklch(0.55 0.22 292)", // violeta
  "oklch(0.65 0.14 190)", // teal
  "oklch(0.7 0.15 80)", // ámbar
  "oklch(0.6 0.17 255)", // azul
  "oklch(0.63 0.2 25)", // coral
];

const CX = 100;
const CY = 100;
const R = 88;
const LABEL_R = 57;

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Torta: sector entre a0 y a1 (grados) desde el centro. */
function piePath(a0, a1) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(CX, CY, R, a0);
  const [x1, y1] = polar(CX, CY, R, a1);
  return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

/**
 * Torta SVG pura: duraciones totales por mes.
 * data: [{ label, total }] — total en segundos.
 * Checkbox por mes para activar/desactivar; clic en slice o fila para detalle.
 */
export function Pie({ data = [] }) {
  const [sel, setSel] = useState(null);
  const [off, setOff] = useState([]);
  const items = (data || [])
    .filter((d) => d && typeof d.total === "number" && d.total > 0)
    .map((d, i) => ({ ...d, color: d.color || COLORS[i % COLORS.length] }));

  if (items.length === 0) {
    return <p class="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">Sin datos por mes.</p>;
  }

  const isOn = (label) => !off.includes(label);
  const active = items.filter((d) => isOn(d.label));
  const grand = active.reduce((a, d) => a + d.total, 0);

  let acc = 0;
  const segs = active.map((d) => {
    const a0 = grand > 0 ? (acc / grand) * 360 : 0;
    acc += d.total;
    const a1 = grand > 0 ? (acc / grand) * 360 : 0;
    return { ...d, a0, a1, pct: grand > 0 ? (d.total / grand) * 100 : 0 };
  });
  const current = sel !== null ? segs.find((d) => d.label === sel) || null : null;

  function toggle(label) {
    setSel((cur) => (cur === label ? null : label));
  }

  function toggleActive(label) {
    setOff((cur) => (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]));
    setSel((cur) => (cur === label ? null : cur));
  }

  return (
    <div class="rounded-md border border-border bg-card px-4 py-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
      <div class="mx-auto w-full max-w-[260px] sm:mx-0 sm:w-[220px] sm:shrink-0">
        {active.length === 0 ? (
          <div class="flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-border px-6 text-center">
            <p class="text-sm text-muted-foreground">Activá al menos un mes.</p>
          </div>
        ) : (
        <>
        <svg viewBox="0 0 200 200" role="img" aria-label="Duraciones totales por mes" class="block w-full">
          {segs.length === 1 ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill={segs[0].color}
            >
              <title>{`${segs[0].label}: ${fmtTotal(segs[0].total)} (100%)`}</title>
            </circle>
          ) : (
            <>
            {segs.map((s) => (
              <path
                key={s.label}
                d={piePath(s.a0, s.a1)}
                fill={s.color}
                tabindex="0"
                role="button"
                aria-pressed={sel === s.label}
                aria-label={`${s.label}: ${fmtTotal(s.total)} (${Math.round(s.pct)}%)`}
                onClick={() => toggle(s.label)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(s.label);
                  }
                }}
                style={{ opacity: sel === null || sel === s.label ? 1 : 0.35, transition: "opacity 200ms", cursor: "pointer", outline: "none" }}
              >
                <title>{`${s.label}: ${fmtTotal(s.total)} (${Math.round(s.pct)}%)`}</title>
              </path>
            ))}
            {segs.filter((s) => s.pct >= 12).map((s) => {
              const mid = (s.a0 + s.a1) / 2;
              const [tx, ty] = polar(CX, CY, LABEL_R, mid);
              return (
                <text
                  key={"t-" + s.label}
                  x={tx}
                  y={ty}
                  text-anchor="middle"
                  dominant-baseline="central"
                  pointer-events="none"
                  fill="#fff"
                  font-size="13"
                  font-weight="700"
                  opacity={sel === null || sel === s.label ? 1 : 0.35}
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.65)", strokeWidth: "4px", strokeLinejoin: "round", transition: "opacity 200ms" }}
                >
                  {Math.round(s.pct)}%
                </text>
              );
            })}
            </>
          )}
        </svg>
        </>
        )}
      </div>
      <ul class="mt-3 w-full space-y-1 sm:mt-0 sm:min-w-0 sm:flex-1">
        {items.map((d) => {
          const on = isOn(d.label);
          const seg = segs.find((s) => s.label === d.label);
          return (
          <li key={d.label} class={`flex items-center gap-1 rounded-sm transition-opacity ${sel !== null && sel !== d.label ? "opacity-40" : ""} ${sel === d.label && on ? "bg-muted" : ""}`}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggleActive(d.label)}
              aria-label={`Mostrar ${d.label}`}
              class="ml-2 size-4 shrink-0 accent-[var(--color-chart-2)]"
            />
            <button
              type="button"
              onClick={() => on && toggle(d.label)}
              aria-pressed={sel === d.label}
              disabled={!on}
              class={`flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left text-[13px] transition-colors md:py-2 md:text-[15px] ${
                on ? "" : "opacity-45"
              } ${on ? "cursor-pointer" : "cursor-default"}`}
            >
              <span class="size-3 shrink-0 rounded-[4px] ring-1 ring-black/10" style={{ background: d.color }} />
              <span class="min-w-0 flex-1 truncate font-medium">{d.label}</span>
              <span class="font-data shrink-0 text-muted-foreground">{on && seg ? `${Math.round(seg.pct)}%` : "—"}</span>
              <span class="font-data w-16 shrink-0 text-right font-bold">{fmtTotal(d.total)}</span>
            </button>
          </li>
          );
        })}
      </ul>
      </div>
      {active.length > 0 && (
        <div class="-mx-4 -mb-4 mt-4 flex items-baseline justify-between gap-2 rounded-b-md border-t border-border bg-muted/50 px-4 py-3">
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 font-data text-[10px] uppercase tracking-widest text-muted-foreground">
              {current && <span class="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: current.color }} />}
              <span class="truncate">{current ? current.label : "Total"}</span>
            </p>
            <p class="font-data text-[20px] font-bold leading-tight md:text-[26px]">
              {fmtTotal(current ? current.total : grand)}
            </p>
          </div>
          <p class="font-data shrink-0 text-[12px] text-muted-foreground">
            {current ? `${Math.round(current.pct)}% del total` : `${active.length} ${active.length === 1 ? "mes" : "meses"}`}
          </p>
        </div>
      )}
    </div>
  );
}
