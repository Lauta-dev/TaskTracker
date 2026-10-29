import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { DurationField } from "./DurationField.jsx";
import { FIELD_BOX, SELECT_TRIGGER, label } from "./presets.js";
import { listOptions } from "../../activities.js";

/* Ejercicio: Disciplina por parte del cuerpo (sin Lugar),
   duración opcional con chips. */
export function WorkoutForm({ preset, habilidad, setHabilidad, duracion, setDuracion, rows }) {
  const habs = listOptions("ejercicio", "hab", rows);
  return (
    <>
      <div class={`mb-3 ${FIELD_BOX}`}>
        <label class={label} for="f-hab">{preset.habLabel}</label>
        <Select value={habilidad} onValueChange={setHabilidad}>
          <SelectTrigger id="f-hab" className={SELECT_TRIGGER}><SelectValue placeholder="Elegí…" /></SelectTrigger>
          <SelectContent>
            {habs.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DurationField value={duracion} onChange={setDuracion} required={preset.durRequired} chips={preset.chips} />
    </>
  );
}
