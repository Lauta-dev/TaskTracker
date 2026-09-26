import { useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { createSheet, deleteSheet, localSheets, saveLastSheet } from "../api.js";
import { sheetFromSearch } from "../sheet.js";

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring";

function Radio({ checked, title, onPick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      title={title}
      onClick={onPick}
      class={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
        checked ? "border-chart-2" : "border-muted-foreground"
      }`}
    >
      {checked && <span class="size-2.5 rounded-full bg-chart-2" />}
    </button>
  );
}

export function Hojas({ names, error, retry }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState("");
  const [locals, setLocals] = useState(() => localSheets());

  const active = sheetFromSearch(search);

  function go(name) {
    saveLastSheet(name);
    navigate(`/?sheet=${encodeURIComponent(name)}`);
  }

  function create() {
    const clean = newName.trim();
    if (!clean) {
      setFormError("Poné un nombre.");
      return;
    }
    if (!createSheet(clean)) {
      setFormError("No se pudo guardar: almacenamiento bloqueado.");
      return;
    }
    setFormError("");
    setNewName("");
    setLocals(localSheets());
    retry();
    go(clean);
  }

  function remove(name) {
    if (!window.confirm(`¿Eliminar "${name}" de este dispositivo?`)) return;
    deleteSheet(name);
    setLocals(localSheets());
    retry();
  }

  const isLocal = (n) => locals.includes(n);

  return (
    <div>
      <div class="mb-4">
        <h1 class="font-display text-[24px] font-semibold">Hojas</h1>
        <p class="mt-1 text-[13px] text-muted-foreground">La elegida alimenta la grilla.</p>
      </div>

      {error ? (
        <button
          type="button"
          onClick={retry}
          class="text-sm text-destructive underline underline-offset-4"
        >
          No pude cargar las hojas · reintentar
        </button>
      ) : names === null ? (
        <div class="space-y-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} class="h-12 animate-pulse rounded-[20px] bg-muted" />
          ))}
        </div>
      ) : (
        <div class="space-y-2">
          {names.map((n) => (
            <div key={n} class="flex items-center gap-3 rounded-[20px] bg-muted px-4 py-3">
              <Radio
                checked={active === n}
                title={active === n ? "Hoja activa" : "Usar para la grilla"}
                onPick={() => go(n)}
              />
              <p class="min-w-0 flex-1 truncate text-[14px] font-medium">{n}</p>
              {isLocal(n) && (
                <button
                  type="button"
                  onClick={() => remove(n)}
                  class="rounded-md px-2 py-1 text-[12px] font-medium text-destructive hover:bg-accent"
                >
                  Borrar
                </button>
              )}
            </div>
          ))}
          {names.length === 0 && (
            <p class="text-sm text-muted-foreground">No hay hojas. Creá una abajo.</p>
          )}
        </div>
      )}

      <p class="font-data mb-2 mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">
        Nueva hoja
      </p>
      <div class="mb-3 flex gap-2">
        <input
          type="text" value={newName} onInput={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la hoja" class={field}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
        />
        <button
          type="button" onClick={create}
          class="h-9 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
        >
          Crear
        </button>
      </div>
      {formError && <p class="mb-3 text-sm text-destructive">{formError}</p>}
    </div>
  );
}
