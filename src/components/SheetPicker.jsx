import { useState } from "preact/hooks";
import { Trash2 } from "lucide-preact";
import { createSheet, deleteSheet, localSheets } from "../api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function SheetPicker({ names, sheet, onPick, onListChanged }) {
  const [newName, setNewName] = useState("");
  const list = names || [];
  const locals = localSheets();

  async function create() {
    const clean = newName.trim();
    if (!clean) return;
    if (!(await createSheet(clean))) return;
    setNewName("");
    onListChanged();
    onPick(clean);
  }

  async function removeLocal(name) {
    if (!window.confirm(`¿Eliminar "${name}" de este dispositivo?`)) return;
    await deleteSheet(name);
    onListChanged();
  }

  if (names === null) {
    return <div aria-hidden="true" class="h-11 w-44 animate-pulse rounded-md bg-muted" />;
  }
  if (list.length === 0) {
    return <p class="text-sm text-muted-foreground">Sin hojas.</p>;
  }
  return (
    <div class="w-full">
    <Select value={sheet} onValueChange={onPick}>
      <SelectTrigger className="font-display h-auto w-full gap-2 rounded-md border-0 bg-muted px-4 py-2 text-[17px] font-semibold shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
        <SelectValue>{sheet || "Elegí hoja"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((n) => (
          <div key={n} class="flex items-center gap-1">
            <SelectItem value={n} className="flex-1 py-2.5 text-[15px]">{n}</SelectItem>
            {locals.includes(n) && (
              <button
                type="button"
                title={`Eliminar "${n}"`}
                aria-label={`Eliminar "${n}"`}
                onClick={() => removeLocal(n)}
                class="shrink-0 rounded-sm p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 class="size-4" />
              </button>
            )}
          </div>
        ))}
        <div class="mt-1 flex gap-1 border-t border-border p-1 pt-2">
          <input
            type="text"
            value={newName}
            onInput={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
            placeholder="Nueva hoja…"
            class="h-8 min-w-0 flex-1 rounded-sm bg-background px-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={create}
            class="h-8 shrink-0 rounded-sm bg-chart-2 px-3 text-[13px] font-semibold text-background active:opacity-90"
          >
            Añadir
          </button>
        </div>
      </SelectContent>
    </Select>
    </div>
  );
}
