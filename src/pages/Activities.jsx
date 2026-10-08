import { useState } from "preact/hooks";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-preact";
import { AREAS, AREA_LABEL } from "../api.js";
import { useRows } from "../hooks/useRows.js";
import { AreaIcon } from "../components/AreaIcon";
import { AREA_COLOR, PRESETS } from "./entry-form/presets.js";
import { addCustom, getCustom, removeCustom, renameCustom } from "../activities.js";

/* Vista para crear y gestionar actividades propias por área
   (disciplinas, temas, tipos, fuentes). Los defaults van fijos;
   lo usado en registros aparece solo como referencia. */

function Group({ area, kind, title, rows, refresh }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirming, setConfirming] = useState(null);

  const preset = (kind === "rec" ? PRESETS[area]?.recs : PRESETS[area]?.habs) || [];
  const customs = getCustom(area)[kind] || [];
  const used = [...new Set((rows || []).map((r) => (kind === "rec" ? r.recurso : r.habilidad)).filter(Boolean))]
    .filter((x) => !preset.includes(x) && !customs.includes(x));

  function create() {
    const err = addCustom(area, kind, draft);
    if (err) {
      setError(err);
      return;
    }
    setDraft("");
    setError("");
    refresh();
  }

  function saveEdit(name) {
    const err = renameCustom(area, kind, name, editValue);
    if (err) {
      setError(err);
      return;
    }
    setEditing(null);
    setError("");
    refresh();
  }

  function remove(name) {
    if (confirming !== name) {
      setConfirming(name);
      return;
    }
    removeCustom(area, kind, name);
    setConfirming(null);
    refresh();
  }

  return (
    <div class="mt-3">
      <p class="font-data px-1 text-[10px] uppercase tracking-widest text-muted-foreground md:text-[11px]">
        {title}
      </p>
      {preset.length > 0 && (
        <div class="mt-2 flex flex-wrap gap-1.5 px-1">
          {preset.map((p) => (
            <span key={p} class="rounded-full bg-muted px-3 py-1 text-[12px] text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
      )}
      {customs.length > 0 && (
        <ul class="mt-1 divide-y divide-border px-1">
          {customs.map((name) => (
            <li key={name} class="flex min-h-11 items-center gap-2 py-1.5">
              {editing === name ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    maxLength={40}
                    autoFocus
                    onInput={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(name);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    aria-label={`Nuevo nombre para ${name}`}
                    class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(name)}
                    aria-label="Guardar"
                    class="flex size-9 shrink-0 items-center justify-center rounded-md text-chart-2 active:bg-muted"
                  >
                    <Check class="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    aria-label="Cancelar"
                    class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted"
                  >
                    <X class="size-5" />
                  </button>
                </>
              ) : (
                <>
                  <span class="min-w-0 flex-1 truncate text-[14px] font-medium">{name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(name);
                      setEditValue(name);
                      setError("");
                    }}
                    aria-label={`Editar ${name}`}
                    class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted"
                  >
                    <Pencil class="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(name)}
                    aria-label={confirming === name ? `Confirmar eliminar ${name}` : `Eliminar ${name}`}
                    class={`flex h-9 shrink-0 items-center justify-center rounded-md px-2 text-[13px] font-medium transition-colors ${confirming === name ? "bg-destructive/15 text-destructive" : "text-muted-foreground active:bg-muted"}`}
                  >
                    {confirming === name ? "¿Sí?" : <Trash2 class="size-4" />}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {used.length > 0 && (
        <p class="mt-1 px-1 text-[12px] text-muted-foreground">
          En uso: {used.join(" · ")}
        </p>
      )}
      <div class="mt-2 flex gap-1.5 px-1">
        <input
          type="text"
          value={draft}
          maxLength={40}
          onInput={(e) => {
            setDraft(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
          placeholder="Nueva…"
          aria-label={`Nueva en ${title}`}
          class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={create}
          disabled={!draft.trim()}
          class="flex h-9 shrink-0 items-center gap-1 rounded-md bg-chart-2 px-3 text-[13px] font-semibold text-background active:opacity-90 disabled:opacity-50"
        >
          <Plus class="size-4" /> Añadir
        </button>
      </div>
      {error && <p class="mt-1 px-1 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export function Activities({ sheet }) {
  const [, setTick] = useState(0);
  const { rows } = useRows(sheet);
  const refresh = () => setTick((t) => t + 1);

  return (
    <div class="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div class="mb-2 px-1">
        <h1 class="font-display flex items-center gap-2 text-[20px] font-semibold tracking-tight md:text-[24px]">
          <Tags class="size-5 text-muted-foreground" /> Actividades
        </h1>
        <p class="mt-0.5 text-[13px] text-muted-foreground md:text-[14px]">
          Tus listas por área. Lo usado en registros se sugiere solo.
        </p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 md:items-start">
      {AREAS.map((a) => {
        const preset = PRESETS[a];
        const areaRows = (rows || []).filter((r) => (r.area || "ingles") === a);
        return (
          <section key={a} class="overflow-hidden rounded-md border border-border bg-card p-4">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold md:text-[16px]">
              <span style={{ color: AREA_COLOR[a] }}>
                <AreaIcon area={a} class="size-5" />
              </span>
              {AREA_LABEL[a]}
            </h2>
            <Group area={a} kind="hab" title={preset.habLabel} rows={areaRows} refresh={refresh} />
            {!preset.hideRec && (
              <Group area={a} kind="rec" title={preset.recLabel} rows={areaRows} refresh={refresh} />
            )}
          </section>
        );
      })}
      </div>
      <div aria-hidden="true" class="h-8" />
    </div>
  );
}
