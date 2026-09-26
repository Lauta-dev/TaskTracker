import { fmtTotal } from "../format.js";

/** Pie de la grilla: total, racha, objetivo 2h/día y mejor día. */
export function Stats({ dayInfo, monthTotal, y, m }) {
  const keys = [...dayInfo.keys()].filter((k) => dayInfo.get(k).total > 0).sort();

  // Racha: la racha más larga del mes (días seguidos con registro).
  let racha = 0;
  if (keys.length > 0) {
    const set = new Set(keys);
    let run = 0;
    let [yy, mm, dd] = keys[0].split("-").map(Number);
    const end = keys[keys.length - 1].split("-").map(Number);
    for (;;) {
      const k = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      run = set.has(k) ? run + 1 : 0;
      if (run > racha) racha = run;
      if (yy === end[0] && mm === end[1] && dd === end[2]) break;
      const next = new Date(yy, mm - 1, dd + 1);
      yy = next.getFullYear();
      mm = next.getMonth() + 1;
      dd = next.getDate();
    }
  }

  let best = null;
  for (const [k, v] of dayInfo) {
    if (v.total > 0 && (!best || v.total > best.total)) best = { key: k, total: v.total };
  }

  const now = new Date();
  const daysInMonth = new Date(y, m, 0).getDate();
  const elapsed = y === now.getFullYear() && m === now.getMonth() + 1
    ? Math.min(now.getDate(), daysInMonth)
    : daysInMonth;
  const goal = 2 * 3600 * elapsed;
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthTotal / goal) * 100)) : 0;

  const items = [
    { label: "Total", value: fmtTotal(monthTotal) },
    { label: "Racha", value: racha > 0 ? `${racha}d` : "—" },
    { label: "Mejor día", value: best ? `${best.key.slice(8, 10)} · ${fmtTotal(best.total)}` : "—" },
  ];

  return (
    <div class="col-span-7 grid grid-cols-4 divide-x divide-border overflow-hidden rounded-b-md border-x border-b border-border bg-card">
      {items.slice(0, 2).map((it) => (
        <div key={it.label} class="px-2 py-2">
          <p class="font-data text-[9px] uppercase tracking-widest text-muted-foreground">{it.label}</p>
          <p class="font-data mt-0.5 truncate text-[13px] font-bold">{it.value}</p>
        </div>
      ))}
      <div class="px-2 py-2">
        <p class="font-data text-[9px] uppercase tracking-widest text-muted-foreground">Objetivo · 2h/d</p>
        <p class="font-data mt-0.5 truncate text-[13px] font-bold">
          {monthTotal >= goal ? "¡Listo!" : `${fmtTotal(monthTotal)}/${fmtTotal(goal)}`}
        </p>
        <div class="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-chart-2" style={{ width: goalPct + "%" }} />
        </div>
      </div>
      {items.slice(2).map((it) => (
        <div key={it.label} class="px-2 py-2">
          <p class="font-data text-[9px] uppercase tracking-widest text-muted-foreground">{it.label}</p>
          <p class="font-data mt-0.5 truncate text-[13px] font-bold">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
