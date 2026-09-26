import { useState } from "preact/hooks";
import { Link, useLocation, useSearch } from "wouter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { DatePicker } from "../components/ui/date-picker";
import { postEntry } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { parseDuration } from "../parse.js";
import { dayKey } from "../dates.js";
import { fmtTotal, normalizeUrl, secsToHMS } from "../format.js";
import { sheetFromSearch } from "../sheet.js";

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring";
const label =
  "font-data mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground";

const DEFAULT_HABS = ["Listening", "Vocabulary", "Reading", "Grammar"];
const DEFAULT_RECS = ["Anki", "YT", "Serie", "Anime", "Movie"];

export function Registro({ onSaved, sheet: sheetProp }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sheet = sheetProp || sheetFromSearch(search);
  const { rows } = useRows(sheet);

  const habs = [...new Set([...DEFAULT_HABS, ...(rows || []).map((r) => r.habilidad)])];
  const recs = [...new Set([...DEFAULT_RECS, ...(rows || []).map((r) => r.recurso)])];

  const [dia, setDia] = useState(dayKey(new Date()));
  const [habilidad, setHabilidad] = useState(habs[0]);
  const [recurso, setRecurso] = useState(recs[0]);
  const [duracion, setDuracion] = useState("");
  const [contenido, setContenido] = useState("");
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [queuedMsg, setQueuedMsg] = useState("");
  const [sending, setSending] = useState(false);

  const parsed = parseDuration(duracion);
  const canSave =
    /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    !parsed.error && parsed.secs > 0 &&
    contenido.trim() !== "";

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    setSubmitError("");
    setQueuedMsg("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return setSubmitError("Elegí un día válido.");
    if (parsed.error || !parsed.secs) return setSubmitError(parsed.error || "Duración inválida.");
    if (!contenido.trim()) return setSubmitError("Poné qué hiciste en Contenido.");
    const finalUrl = normalizeUrl(url);
    setSending(true);
    postEntry({
      fecha: `${dia}T12:00:00.000Z`,
      habilidad,
      recurso,
      contenido: contenido.trim(),
      link: finalUrl,
      hora: secsToHMS(parsed.secs),
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
        <h1 class="font-display text-[24px] font-semibold leading-tight">Registrar</h1>
        <p class="mt-0.5 text-[14px] text-muted-foreground">{sheet}</p>
      </div>

      <form onSubmit={onSubmit} class="rounded-xl border border-border bg-card p-4">
        <div class="mb-4">
          <span class={label} id="f-dia-label">Día</span>
          <DatePicker
            value={dia ? new Date(dia + "T12:00:00") : undefined}
            onValueChange={(d) => { if (d) setDia(dayKey(d)); }}
            placeholder="Elegí el día"
            aria-labelledby="f-dia-label"
          />
        </div>

        <div class="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label class={label} for="f-rec">Tipo</label>
            <Select value={recurso} onValueChange={setRecurso}>
              <SelectTrigger id="f-rec"><SelectValue placeholder="Elegí…" /></SelectTrigger>
              <SelectContent>
                {recs.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label class={label} for="f-hab">Habilidad</label>
            <Select value={habilidad} onValueChange={setHabilidad}>
              <SelectTrigger id="f-hab"><SelectValue placeholder="Elegí…" /></SelectTrigger>
              <SelectContent>
                {habs.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="mb-4">
          <label class={label} for="f-dur">Duración</label>
          <input
            id="f-dur" type="text" value={duracion} onInput={(e) => setDuracion(e.target.value)}
            placeholder="25m · 1h 30m · 1:00:00 · =25/1440" class={`${field} font-data`}
          />
          <p class="font-data mt-1.5 text-[12px]" aria-live="polite">
            {duracion.trim() === "" ? (
              <span class="text-muted-foreground">Acepta fórmulas (=24*2/1440) o 2m, 1h 30m…</span>
            ) : parsed.error ? (
              <span class="text-destructive">{parsed.error}</span>
            ) : (
              <span class="text-chart-2">→ {fmtTotal(parsed.secs)}</span>
            )}
          </p>
        </div>

        <div class="mb-4">
          <label class={label} for="f-cont">Contenido</label>
          <input
            id="f-cont" type="text" value={contenido} onInput={(e) => setContenido(e.target.value)}
            placeholder="The Office S01 E05" class={field}
          />
        </div>

        <div class="mb-4">
          <label class={label} for="f-url">Url <span class="normal-case">(opcional, se fija al contenido)</span></label>
          <input
            id="f-url" type="text" inputmode="url" value={url} onInput={(e) => setUrl(e.target.value)}
            placeholder="youtube.com/…" class={`${field} font-data`}
          />
        </div>

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
          {sending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
