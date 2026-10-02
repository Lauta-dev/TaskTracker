import { useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { ChartColumn, ChartPie, LayoutGrid, Plus, Table } from "lucide-preact";
import { useSheets } from "./hooks/useSheets";
import { saveLastSheet, USE_MOCK } from "./api.js";
import { Graph } from "./pages/Graph";
import { Registro } from "./pages/Registro";
import { Modal } from "./components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { SheetPicker } from "./components/SheetPicker";
import { resolveSheet } from "./sheet";

const VISTAS = [
  { value: "grilla", label: "Grilla", Icon: LayoutGrid },
  { value: "barras", label: "Barras", Icon: ChartColumn },
  { value: "pastel", label: "Pastel", Icon: ChartPie },
  { value: "tabla", label: "Tabla", Icon: Table },
];

export function App() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sheets = useSheets();
  // Prueba: FAB que abre el Registro en modal.
  const [regOpen, setRegOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [vista, setVista] = useState("grilla");
  const current = VISTAS.find((v) => v.value === vista) || VISTAS[0];

  // La lista se pide una sola vez acá y baja por props.
  const sheet = resolveSheet(search, sheets.names || []);

  function pick(name) {
    saveLastSheet(name);
    navigate(`/?sheet=${encodeURIComponent(name)}`);
  }

  function openNew() {
    setEditing(null);
    setRegOpen(true);
  }

  function openEdit(entry) {
    setEditing(entry);
    setRegOpen(true);
  }

  function closeReg() {
    setRegOpen(false);
    setEditing(null);
  }

  function pick(name) {
    saveLastSheet(name);
    navigate(`/?sheet=${encodeURIComponent(name)}`);
  }

  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto w-full max-w-[680px] px-4 pb-10 pt-8">
        <header class="mb-5 space-y-2">
          <div class="flex items-center justify-between gap-2">
          <div class="flex shrink-0 items-center gap-2.5">
            <img src="/icons.svg" alt="Tinta" class="size-7 rounded-md" />
            <p class="font-display text-[17px] font-semibold tracking-tight">Tinta</p>
            {USE_MOCK && (
              <span class="font-data rounded-full bg-chart-2/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
                mock
              </span>
            )}
          </div>
          <SheetPicker names={sheets.names} sheet={sheet} onPick={pick} onListChanged={sheets.retry} />
          </div>
          <Select value={vista} onValueChange={setVista}>
            <SelectTrigger aria-label="Vista" className="font-display h-auto w-full gap-2 rounded-md border-0 bg-muted px-4 py-2 text-[15px] font-semibold shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
              <SelectValue>
                <span class="flex items-center gap-2">
                  <current.Icon class="size-4 text-muted-foreground" />
                  {current.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VISTAS.map((v) => (
                <SelectItem key={v.value} value={v.value} className="py-2.5 text-[15px]">
                  <v.Icon class="size-4 text-muted-foreground" />
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>
        <Graph names={sheets.names} vista={vista} onEdit={openEdit} />
      </div>
      <button
        type="button"
        onClick={openNew}
        title="Registrar"
        aria-label="Registrar"
        class="fixed bottom-8 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-chart-2 text-background shadow-lg transition-transform duration-150 active:scale-80"
      >
        <Plus class="size-6" />
      </button>
      <Modal open={regOpen} onClose={closeReg} label={editing ? "Editar" : "Registrar"}>
        {regOpen && <Registro key={editing?.row || "new"} sheet={sheet} editing={editing} onSaved={closeReg} />}
      </Modal>
    </div>
  );
}
