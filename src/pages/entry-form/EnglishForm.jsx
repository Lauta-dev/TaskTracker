import { useEffect, useRef, useState } from "preact/hooks";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { DurationField } from "./DurationField.jsx";
import { label } from "./presets.js";
import { listOptions } from "../../activities.js";
import { fetchVideoInfo, parseYouTubeId } from "../../yt.js";

/* Inglés: Tipo + Habilidad en selects, duración libre sin chips.
   Si la URL es de YouTube, trae título y duración y sobrescribe
   Contenido, Duración, Tipo (YT) y Habilidad (Listening). */
export function EnglishForm({ preset, habilidad, setHabilidad, recurso, setRecurso, duracion, setDuracion, rows, url, contenido, setContenido }) {
  const habs = listOptions("ingles", "hab", rows);
  const recs = listOptions("ingles", "rec", rows);
  const [ytState, setYtState] = useState("idle"); // idle | loading | done | error

  const reqId = useRef(0);
  const mountUrl = useRef(url);

  useEffect(() => {
    if (!parseYouTubeId(url)) {
      reqId.current += 1;
      setYtState("idle");
      return;
    }
    /* URL inicial del mount = edición sin cambios: no tocar nada. */
    if (url === mountUrl.current) return;
    const n = ++reqId.current;
    setYtState("loading");
    const t = setTimeout(async () => {
      const info = await fetchVideoInfo(url).catch(() => null);
      if (reqId.current !== n || !info) {
        if (reqId.current === n) setYtState("error");
        return;
      }
      let applied = false;
      if (info.title) {
        setContenido(info.title);
        applied = true;
      }
      if (info.minutes > 0) {
        setDuracion(`${info.minutes}m`);
        applied = true;
      }
      setRecurso("YT");
      setHabilidad("Listening");
      setYtState(applied ? "done" : "error");
    }, 500);
    return () => clearTimeout(t);
  }, [url]);

  return (
    <>
      <div class="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label class={label} for="f-rec">{preset.recLabel}</label>
          <Select value={recurso} onValueChange={setRecurso}>
            <SelectTrigger id="f-rec"><SelectValue placeholder="Elegí…" /></SelectTrigger>
            <SelectContent>
              {recs.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label class={label} for="f-hab">{preset.habLabel}</label>
          <Select value={habilidad} onValueChange={setHabilidad}>
            <SelectTrigger id="f-hab"><SelectValue placeholder="Elegí…" /></SelectTrigger>
            <SelectContent>
              {habs.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DurationField value={duracion} onChange={setDuracion} required={preset.durRequired} chips={preset.chips} />
      {ytState !== "idle" && (
        <p class="font-data -mt-2.5 mb-4 text-[12px]" aria-live="polite">
          {ytState === "loading" && <span class="text-muted-foreground">Leyendo el video…</span>}
          {ytState === "done" && <span class="text-chart-2">Datos del video aplicados.</span>}
          {ytState === "error" && <span class="text-destructive">No se pudo leer el video; cargalo manual.</span>}
        </p>
      )}
    </>
  );
}
