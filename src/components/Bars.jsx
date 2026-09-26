import { fmtTotal, level } from "../format.js";

const OPACITY = [0.18, 0.4, 0.62, 0.84, 1];

/**
 * Barras horizontales: una fila por día, scroll vertical natural.
 * series: [{ label, color (css), days: [{ day, total }] }] — 1 o 2 series.
 */
export function Bars({ series = [] }) {
  if (series.length === 0) return null;
  const n = series.length;
  const len = Math.max(1, ...series.map((s) => s.days.length));
  const max = Math.max(1, ...series.flatMap((s) => s.days.map((d) => d.total)));
  const barH = n > 1 ? 16 : 22;
  const valSize = n > 1 ? "text-[12px]" : "text-[13px]";

  return (
    <div>
      {n > 1 && (
        <div class="mb-2 flex gap-4">
          {series.map((s) => (
            <span key={s.label} class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span
                class="size-2.5 rounded-sm"
                style={{ background: s.color }}
              />
              <span class="max-w-[38vw] truncate">{s.label}</span>
            </span>
          ))}
        </div>
      )}
      <div class="rounded-md border border-border bg-card px-3 py-3">
        <div class="grid" style={{ gridTemplateColumns: "26px 1fr" }}>
          <div />
          <div class="relative mb-1 h-4">
            {[0, 25, 50, 75, 100].map((g) => (
              <span
                key={g}
                class="font-data absolute text-[12px] text-muted-foreground"
                style={{ left: g + "%", transform: g === 100 ? "translateX(-100%)" : g === 0 ? "none" : "translateX(-50%)" }}
              >
                {fmtTotal((max * g) / 100)}
              </span>
            ))}
          </div>
        </div>
        {Array.from({ length: len }, (_, i) => {
          const day = i + 1;
          return (
            <div key={day} class="grid items-center gap-2 py-[3px]" style={{ gridTemplateColumns: "26px 1fr" }}>
              <span class="font-data text-right text-[13px] text-muted-foreground">{day}</span>
              <div class="flex min-w-0 flex-col justify-center gap-[4px]">
                {series.map((s) => {
                  const total = s.days[i]?.total || 0;
                  const pct = total > 0 ? Math.max(2, (total / max) * 100) : 0;
                  // Etiqueta siempre a la derecha: en su color, salvo que caiga
                  // sobre relleno sólido (barra ancha) donde va oscuro.
                  const onSolid = pct >= 90;
                  return (
                    <div
                      key={s.label}
                      title={`${s.label} día ${day}: ${fmtTotal(total)}`}
                      class="relative rounded-sm bg-muted"
                      style={{ height: barH + "px" }}
                    >
                      {pct > 0 && (
                        <div
                          class="h-full rounded-sm"
                          style={{
                            width: pct + "%",
                            background: s.color,
                            opacity: OPACITY[level(total / max)],
                          }}
                        />
                      )}
                      <span
                        class={`font-data absolute right-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap font-bold leading-none ${valSize} ${
                          onSolid ? "text-background" : ""
                        }`}
                        style={onSolid ? undefined : { color: s.color }}
                      >
                        {total > 0 ? fmtTotal(total) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
