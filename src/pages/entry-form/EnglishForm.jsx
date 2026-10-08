import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { DurationField } from "./DurationField.jsx";
import { label } from "./presets.js";
import { listOptions } from "../../activities.js";

/* Inglés: Tipo + Habilidad en selects, duración libre sin chips. */
export function EnglishForm({ preset, habilidad, setHabilidad, recurso, setRecurso, duracion, setDuracion, rows }) {
  const habs = listOptions("ingles", "hab", rows);
  const recs = listOptions("ingles", "rec", rows);
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
    </>
  );
}
