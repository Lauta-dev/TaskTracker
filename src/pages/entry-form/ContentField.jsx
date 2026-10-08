import { useState } from "preact/hooks";
import { Link2 } from "lucide-preact";
import { field, label } from "./presets.js";

/* Un solo input que alterna Contenido ↔ URL con el iconito.
   Los valores viven separados; el toggle solo cambia cuál se edita. */
export function ContentField({ value, onChange, url, onUrlChange, placeholder }) {
  const [mode, setMode] = useState("content");
  const isUrl = mode === "url";
  const other = isUrl ? value : url;

  return (
    <div class="mb-4">
      <label class={label} for="f-cont">{isUrl ? "Url" : "Contenido"}</label>
      <div class="relative">
        <input
          id="f-cont"
          type="text"
          value={isUrl ? url : value}
          onInput={(e) => (isUrl ? onUrlChange(e.target.value) : onChange(e.target.value))}
          placeholder={isUrl ? "youtube.com/…" : placeholder}
          inputmode={isUrl ? "url" : undefined}
          class={`${field} pr-10 ${isUrl ? "font-data" : ""}`}
        />
        <button
          type="button"
          onClick={() => setMode(isUrl ? "content" : "url")}
          aria-pressed={isUrl}
          aria-label={isUrl ? "Editar contenido" : "Editar URL"}
          title={isUrl ? "Editar contenido" : "Editar URL"}
          class={`absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors ${isUrl ? "text-chart-2" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Link2 class="size-4" />
        </button>
      </div>
      {String(other || "").trim() !== "" && (
        <p class="mt-1.5 truncate text-[12px] text-muted-foreground" aria-live="polite">
          {isUrl ? "Se fija a: " : "URL: "}{String(other).trim()}
        </p>
      )}
    </div>
  );
}
