import { useState } from "preact/hooks";
import { Check, Pencil, Trash2, X } from "lucide-preact";
import { createSheet, deleteSheet, renameSheet } from "../api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "./ui/alert-dialog";

/* Selector de hoja con gestionar integrado: elegir, crear, renombrar y
   eliminar sin salir del dropdown. La hoja activa lleva filete de tinta
   (chart-2); el resto queda quieto. Copy en voz activa, sentence case. */
export function SheetPicker({ names, sheet, onPick, onListChanged }) {
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = names || [];

  async function create() {
    const clean = newName.trim();
    if (!clean || creating) return;
    if (list.includes(clean)) {
      setCreateError("Ya existe una hoja con ese nombre.");
      return;
    }
    setCreating(true);
    setCreateError("");
    if (!(await createSheet(clean))) {
      setCreating(false);
      setCreateError("No se pudo crear. Reintentá.");
      return;
    }
    setNewName("");
    setCreating(false);
    onListChanged?.();
    onPick?.(clean);
  }

  function startEdit(name) {
    setEditing(name);
    setEditValue(name);
    setEditError("");
  }

  function cancelEdit() {
    if (saving) return;
    setEditing(null);
    setEditError("");
  }

  async function saveEdit() {
    const from = editing;
    const clean = editValue.trim();
    if (!from || saving) return;
    if (!clean) {
      setEditError("Escribí un nombre.");
      return;
    }
    if (clean === from) {
      setEditing(null);
      return;
    }
    if (list.includes(clean)) {
      setEditError("Ya existe una hoja con ese nombre.");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await renameSheet(from, clean);
      setEditing(null);
      onListChanged?.();
      if (sheet === from) onPick?.(clean);
    } catch (e) {
      setEditError(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target || deleting) return;
    setDeleting(true);
    try {
      await deleteSheet(target);
    } finally {
      // Aunque falle la red, lo local ya se limpió: la lista se refresca igual.
    }
    setDeleting(false);
    setPendingDelete(null);
    onListChanged?.();
    if (sheet === target) {
      const next = list.filter((n) => n !== target)[0] || "";
      onPick?.(next);
    }
  }

  if (names === null) {
    return <div aria-hidden="true" class="h-11 w-44 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <div class="w-full">
      <Select value={sheet} onValueChange={onPick}>
        <SelectTrigger className="font-display h-auto w-full gap-2 rounded-md border-0 bg-muted px-4 py-2 text-[17px] font-semibold shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
          <SelectValue>{sheet || "Elegí hoja"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {list.length === 0 && (
            <p class="px-2 py-2.5 text-[13px] text-muted-foreground">Sin hojas. Creá la primera abajo.</p>
          )}
          {list.map((n) => {
            const active = n === sheet;
            if (editing === n) {
              return (
                <div key={n} class="rounded-sm bg-accent/60 p-1">
                  <div class="flex items-center gap-1">
                    <input
                      type="text"
                      value={editValue}
                      maxLength={120}
                      disabled={saving}
                      autoFocus
                      onInput={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Nuevo nombre para "${n}"`}
                      class="h-8 min-w-0 flex-1 rounded-sm bg-background px-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving}
                      title="Guardar"
                      aria-label="Guardar nombre"
                      class="flex size-8 shrink-0 items-center justify-center rounded-sm bg-chart-2 text-background active:opacity-90 disabled:opacity-50"
                    >
                      <Check class="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      title="Cancelar"
                      aria-label="Cancelar"
                      class="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <X class="size-4" />
                    </button>
                  </div>
                  {editError && <p class="px-1 pb-1 pt-1 text-[12px] text-destructive">{editError}</p>}
                </div>
              );
            }
            return (
              <div
                key={n}
                class={`group flex items-center gap-0.5 rounded-sm ${active ? "bg-accent/60" : ""}`}
              >
                <span
                  aria-hidden="true"
                  class={`w-0.5 self-stretch rounded-full ${active ? "bg-chart-2" : "bg-transparent"}`}
                />
                <SelectItem value={n} className="min-w-0 flex-1 py-2.5 text-[15px]">
                  <span class={`block truncate ${active ? "font-display font-semibold" : ""}`}>{n}</span>
                </SelectItem>
                <span class="flex shrink-0 items-center">
                  <button
                    type="button"
                    title={`Cambiar nombre de "${n}"`}
                    aria-label={`Cambiar nombre de "${n}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(n);
                    }}
                    class="rounded-sm p-2 text-muted-foreground opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <Pencil class="size-4" />
                  </button>
                  <button
                    type="button"
                    title={`Eliminar "${n}"`}
                    aria-label={`Eliminar "${n}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(n);
                    }}
                    class="rounded-sm p-2 text-muted-foreground opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </span>
              </div>
            );
          })}
          <div class="mt-1 border-t border-border p-1 pt-2">
            <div class="flex gap-1">
              <input
                type="text"
                value={newName}
                maxLength={120}
                onInput={(e) => {
                  setNewName(e.target.value);
                  if (createError) setCreateError("");
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") create();
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Nueva hoja…"
                aria-label="Nombre de la nueva hoja"
                class="h-8 min-w-0 flex-1 rounded-sm bg-background px-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={create}
                disabled={creating || !newName.trim()}
                class="h-8 shrink-0 rounded-sm bg-chart-2 px-3 text-[13px] font-semibold text-background active:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creando…" : "Añadir"}
              </button>
            </div>
            {createError && <p class="px-1 pt-1 text-[12px] text-destructive">{createError}</p>}
          </div>
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => {
          if (!v && !deleting) setPendingDelete(null);
        }}
        label="Eliminar hoja"
      >
        <AlertDialogTitle>Eliminar hoja</AlertDialogTitle>
        <AlertDialogDescription>
          {pendingDelete
            ? `¿Eliminar "${pendingDelete}"? Se borran también sus registros. Esta acción no se puede deshacer.`
            : ""}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction destructive disabled={deleting} onClick={confirmDelete}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
