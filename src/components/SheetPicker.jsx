import { useEffect, useState } from "preact/hooks";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-preact";
import { createSheet, deleteSheet, renameSheet } from "../api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Modal } from "./ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "./ui/alert-dialog";

/* Selector de hoja con gestionar integrado: elegir, crear, renombrar y
   eliminar. Cada fila lleva un ⋮ compacto que despliega un submenú inline
   (Cambiar nombre / Eliminar) dentro del propio dropdown. La hoja activa
   lleva filete de tinta (chart-2); el resto queda quieto.
   Copy en voz activa, sentence case. */
export function SheetPicker({ names, sheet, onPick, onListChanged }) {
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const list = names || [];

  // El menú flotante se cierra al scrollear o rotar, como el del drawer.
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuFor]);

  function pick(name) {
    setMenuFor(null);
    onPick?.(name);
  }

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
    pick(clean);
  }

  function startRename(name) {
    setMenuFor(null);
    setRenaming(name);
    setRenameValue(name);
    setRenameError("");
  }

  function cancelRename() {
    if (saving) return;
    setRenaming(null);
    setRenameError("");
  }

  async function saveRename() {
    const from = renaming;
    const clean = renameValue.trim();
    if (!from || saving) return;
    if (!clean) {
      setRenameError("Escribí un nombre.");
      return;
    }
    if (clean === from) {
      setRenaming(null);
      return;
    }
    if (list.includes(clean)) {
      setRenameError("Ya existe una hoja con ese nombre.");
      return;
    }
    setSaving(true);
    setRenameError("");
    try {
      await renameSheet(from, clean);
      setRenaming(null);
      onListChanged?.();
      if (sheet === from) pick(clean);
    } catch (e) {
      setRenameError(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(name) {
    setMenuFor(null);
    setPendingDelete(name);
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
      pick(next);
    }
  }

  if (names === null) {
    return <div aria-hidden="true" class="h-11 w-44 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <div class="w-full">
      <Select value={sheet} onValueChange={pick}>
        <SelectTrigger className="font-display h-auto w-full gap-2 rounded-md border-0 bg-muted px-4 py-2 text-[17px] font-semibold shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
          <SelectValue>{sheet || "Elegí hoja"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {list.length === 0 && (
            <p class="px-2 py-2.5 text-[13px] text-muted-foreground">Sin hojas. Creá la primera abajo.</p>
          )}
          {list.map((n) => {
            const active = n === sheet;
            const menuOpen = menuFor === n;
            return (
              <div key={n} class={`relative rounded-sm ${active ? "bg-accent/60" : ""}`}>
                <div class="flex items-center gap-0.5">
                  <span
                    aria-hidden="true"
                    class={`w-0.5 self-stretch rounded-full ${active ? "bg-chart-2" : "bg-transparent"}`}
                  />
                  <SelectItem value={n} className="min-w-0 flex-1 py-2.5 text-[15px]">
                    <span class={`block truncate ${active ? "font-display font-semibold" : ""}`}>{n}</span>
                  </SelectItem>
                  <button
                    type="button"
                    title={`Opciones de "${n}"`}
                    aria-label={`Opciones de "${n}"`}
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (menuOpen) {
                        setMenuFor(null);
                        return;
                      }
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenuPos({
                        top: Math.min(r.bottom + 6, window.innerHeight - 140),
                        right: Math.max(8, window.innerWidth - r.right),
                      });
                      setMenuFor(n);
                    }}
                    class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted hover:text-foreground"
                  >
                    <EllipsisVertical class="size-4" />
                  </button>
                </div>
                {menuOpen && (
                  <div
                    role="menu"
                    aria-label={`Opciones de "${n}"`}
                    style={{ position: "fixed", top: menuPos?.top ?? 0, right: menuPos?.right ?? 8 }}
                    class="z-[60] w-52 rounded-xl border border-border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startRename(n)}
                      class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-medium text-foreground active:bg-muted"
                    >
                      <Pencil class="size-5" /> Cambiar nombre
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => askDelete(n)}
                      class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-medium text-destructive active:bg-muted"
                    >
                      <Trash2 class="size-5" /> Eliminar
                    </button>
                  </div>
                )}
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

      <Modal open={renaming !== null} onClose={cancelRename} label="Cambiar nombre">
        <h2 class="font-display text-[17px] font-semibold tracking-tight">Cambiar nombre</h2>
        <p class="mt-0.5 truncate text-[13px] text-muted-foreground">{renaming}</p>
        <input
          type="text"
          value={renameValue}
          maxLength={120}
          disabled={saving}
          autoFocus
          onInput={(e) => {
            setRenameValue(e.target.value);
            if (renameError) setRenameError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
          }}
          aria-label="Nuevo nombre de la hoja"
          class="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        {renameError && <p class="pt-1 text-[12px] text-destructive">{renameError}</p>}
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancelRename}
            disabled={saving}
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-[14px] font-medium active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveRename}
            disabled={saving || !renameValue.trim()}
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-chart-2 px-4 text-[14px] font-medium text-background active:scale-95 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </Modal>

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
