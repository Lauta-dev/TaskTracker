import { parseDuration } from "../../parse.js";
import { fmtTotal } from "../../format.js";
import { field, label } from "./presets.js";

/* Duración con chips de un toque + ayuda en vivo.
   required: true la exige; false la deja opcional (ejercicio). */
export function DurationField({ value, onChange, required, chips = [] }) {
  const parsed = parseDuration(value);
  return (
    <div class="mb-4">
      <label class={label} for="f-dur">Duración{required ? "" : " (opcional)"}</label>
      <input
        id="f-dur" type="text" value={value} onInput={(e) => onChange(e.target.value)}
        placeholder="25m · 1h 30m · 1:00:00 · =25/1440" class={`${field} font-data`}
      />
      {chips.length > 0 && (
        <div class="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-pressed={value === c}
              class={`h-8 rounded-full px-3 font-data text-[12px] font-semibold transition-colors active:scale-95 ${value === c ? "bg-chart-2 text-background" : "bg-muted text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <p class="font-data mt-1.5 text-[12px]" aria-live="polite">
        {value.trim() === "" ? (
          <span class="text-muted-foreground">Acepta fórmulas (=24*2/1440) o 2m, 1h 30m…</span>
        ) : parsed.error ? (
          <span class="text-destructive">{parsed.error}</span>
        ) : (
          <span class="text-chart-2">→ {fmtTotal(parsed.secs)}</span>
        )}
      </p>
    </div>
  );
}
