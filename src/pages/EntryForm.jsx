import { useState } from "preact/hooks";
import { Link, useLocation, useSearch } from "wouter";
import { DatePicker } from "../components/ui/date-picker";
import { AreaIcon } from "../components/AreaIcon";
import { COLS, AREAS, AREA_LABEL, postEntry, updateCells } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { parseDuration } from "../parse.js";
import { dayKey } from "../dates.js";
import { fmtTotal, normalizeUrl, secsToHMS } from "../format.js";
import { sheetFromSearch } from "../sheet.js";
import { PRESETS, field, label } from "./entry-form/presets.js";
import { EnglishForm } from "./entry-form/EnglishForm.jsx";
import { MathForm } from "./entry-form/MathForm.jsx";
import { WorkoutForm } from "./entry-form/WorkoutForm.jsx";
import { ContentField } from "./entry-form/ContentField.jsx";

const AREA_FORMS = {
  ingles: EnglishForm,
  matematica: MathForm,
  ejercicio: WorkoutForm,
};

/* Shell del formulario: área, día, form específico, contenido+url, nota y submit.
   Cada área vive en su archivo (entry-form/*) para no ensuciar este. */
export function EntryForm({ onSaved, sheet: sheetProp, editing }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sheet = sheetProp || sheetFromSearch(search);
  const { rows } = useRows(sheet);

  const [area, setArea] = useState(
    editing?.area && AREAS.includes(editing.area) ? editing.area : "ingles",
  );
  const preset = PRESETS[area] || PRESETS.ingles;
  const areaRows = (rows || []).filter((r) => (r.area || "ingles") === area);
  const AreaForm = AREA_FORMS[area] || EnglishForm;

  const [dia, setDia] = useState(editing?.key || dayKey(new Date()));
  const [habilidad, setHabilidad] = useState(editing?.habilidad || preset.habs[0]);
  const [recurso, setRecurso] = useState(editing?.recurso || preset.recs[0] || "—");
  const [duracion, setDuracion] = useState(editing ? fmtTotal(editing.secs || 0) : "");
  const [contenido, setContenido] = useState(editing?.titulo || "");
  const [url, setUrl] = useState(editing?.url || "");
  const [nota, setNota] = useState(editing?.notas || "");
  const [submitError, setSubmitError] = useState("");
  const [queuedMsg, setQueuedMsg] = useState("");
  const [sending, setSending] = useState(false);

  const parsed = parseDuration(duracion);
  const durOk = preset.durRequired
    ? !parsed.error && parsed.secs > 0
    : duracion.trim() === "" || (!parsed.error && parsed.secs > 0);
  const canSave =
    /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    durOk &&
    contenido.trim() !== "";

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    setSubmitError("");
    setQueuedMsg("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return setSubmitError("Elegí un día válido.");
    if (!durOk) return setSubmitError(parsed.error || "Duración inválida.");
    if (!contenido.trim()) return setSubmitError("Poné qué hiciste en Contenido.");
    const finalUrl = normalizeUrl(url);
    const finalHora = parsed.secs > 0 ? secsToHMS(parsed.secs) : "";
    const finalRecurso = preset.hideRec ? "—" : recurso;
    setSending(true);
    // Edición: UPDATE solo las columnas que cambiaron.
    if (editing?.row) {
      const changes = [];
      if (dia !== editing.key) changes.push({ col: COLS.fecha, newValue: dia });
      if (area !== (editing.area || "ingles")) changes.push({ col: COLS.area, newValue: area });
      if (habilidad !== editing.habilidad) changes.push({ col: COLS.habilidad, newValue: habilidad });
      if (!preset.hideRec && finalRecurso !== editing.recurso) changes.push({ col: COLS.recurso, newValue: finalRecurso });
      if (contenido.trim() !== editing.titulo || finalUrl !== editing.url) {
        changes.push({ col: COLS.contenido, newValue: { title: contenido.trim(), url: finalUrl } });
      }
      if (finalHora !== secsToHMS(editing.secs || 0) && !(finalHora === "" && !editing.secs)) {
        changes.push({ col: COLS.hora, newValue: finalHora });
      }
      if (nota.trim() !== (editing.notas || "")) changes.push({ col: COLS.nota, newValue: nota.trim() });
      updateCells(sheet, editing.row, changes).then(() => {
        window.dispatchEvent(new Event("tt:rows"));
        if (onSaved) onSaved();
        else navigate(`/?sheet=${encodeURIComponent(sheet)}`);
      }).catch(() => {
        setSending(false);
        setSubmitError("Sin conexión: no se pudo guardar el cambio.");
      });
      return;
    }
    postEntry({
      fecha: dia,
      area,
      habilidad,
      recurso: finalRecurso,
      contenido: contenido.trim(),
      link: finalUrl,
      hora: finalHora,
      nota: nota.trim(),
      sheet,
    }).then((res) => {
      if (res === "queued") {
        setSending(false);
        setQueuedMsg("Sin conexión: quedó en cola, se manda solo.");
        return;
      }
      window.dispatchEvent(new Event("tt:rows"));
      if (onSaved) onSaved();
      else navigate(`/?sheet=${encodeURIComponent(sheet)}`);
    });
  }

  if (!sheet) {
    return (
      <div>
        <h1 class="font-display text-[24px] font-semibold">Registrar</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Elegí una hoja primero. <Link href="/hojas" class="underline">Ir a Hojas</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div class="mb-4">
        <h1 class="font-display text-[24px] font-semibold leading-tight md:text-[30px]">{editing ? "Editar" : "Registrar"}</h1>
        <p class="mt-0.5 text-[14px] text-muted-foreground md:text-[16px]">{sheet}</p>
      </div>

      <form onSubmit={onSubmit} class="rounded-xl border border-border bg-card p-4">
        <div class="mb-4" role="group" aria-label="Área">
          <div class="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setArea(a);
                  const p = PRESETS[a];
                  setHabilidad(p.habs[0]);
                  setRecurso(p.recs?.[0] || "—");
                }}
                aria-pressed={area === a}
                class={`flex h-9 items-center justify-center gap-1.5 rounded-sm text-[13px] font-semibold transition-colors ${area === a ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <AreaIcon area={a} class="size-4" />
                {AREA_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
        <div class="mb-4">
          <span class={label} id="f-dia-label">Día</span>
          <DatePicker
            value={dia ? new Date(dia + "T12:00:00") : undefined}
            onValueChange={(d) => { if (d) setDia(dayKey(d)); }}
            placeholder="Elegí el día"
            aria-labelledby="f-dia-label"
          />
        </div>

        <AreaForm
          preset={preset}
          habilidad={habilidad}
          setHabilidad={setHabilidad}
          recurso={recurso}
          setRecurso={setRecurso}
          duracion={duracion}
          setDuracion={setDuracion}
          rows={areaRows}
        />

        <ContentField
          value={contenido}
          onChange={setContenido}
          url={url}
          onUrlChange={setUrl}
          placeholder={preset.contentPh}
        />

        <div class="mb-5">
          <label class={label} for="f-nota">Nota</label>
          <textarea
            id="f-nota" rows={3} value={nota} onInput={(e) => setNota(e.target.value)}
            placeholder="…" class={field}
          />
        </div>

        {submitError && <p class="mb-3 text-sm text-destructive">{submitError}</p>}
        {queuedMsg && <p class="mb-3 text-sm text-chart-2">{queuedMsg}</p>}

        <button
          type="submit"
          disabled={!canSave || sending}
          class="h-11 w-full rounded-md bg-chart-2 text-sm font-semibold text-background transition-opacity active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
