import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { DurationField } from "./DurationField.jsx";
import { field, label } from "./presets.js";
import { listOptions } from "../../activities.js";

/* Matemática: Tema libre con sugerencias (los temas son infinitos),
   Fuente en select, duración con chips. */
export function MathForm({ preset, habilidad, setHabilidad, recurso, setRecurso, duracion, setDuracion, rows }) {
  const temas = listOptions("matematica", "hab", rows);
  const recs = listOptions("matematica", "rec", rows);
  return (
    <>
      <div class="mb-4">
        <label class={label} for="f-hab">{preset.habLabel}</label>
        <input
          id="f-hab" type="text" value={habilidad} list="f-temas"
          onInput={(e) => setHabilidad(e.target.value)}
          placeholder="¿Qué tema fue?" class={field}
        />
        <datalist id="f-temas">
          {temas.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>

      <div class="mb-4">
        <label class={label} for="f-rec">{preset.recLabel}</label>
        <Select value={recurso} onValueChange={setRecurso}>
          <SelectTrigger id="f-rec"><SelectValue placeholder="Elegí…" /></SelectTrigger>
          <SelectContent>
            {recs.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DurationField value={duracion} onChange={setDuracion} required={preset.durRequired} chips={preset.chips} />
    </>
  );
}
