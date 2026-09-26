import { useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { Plus } from "lucide-preact";
import { useSheets } from "./hooks/useSheets";
import { saveLastSheet, USE_MOCK } from "./api.js";
import { Graph } from "./pages/Graph";
import { Registro } from "./pages/Registro";
import { Modal } from "./components/ui/modal";
import { SheetPicker } from "./components/SheetPicker";
import { resolveSheet } from "./sheet";

export function App() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sheets = useSheets();
  // Prueba: FAB que abre el Registro en modal.
  const [regOpen, setRegOpen] = useState(false);

  // La lista se pide una sola vez acá y baja por props.
  const sheet = resolveSheet(search, sheets.names || []);

  function pick(name) {
    saveLastSheet(name);
    navigate(`/?sheet=${encodeURIComponent(name)}`);
  }

  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto w-full max-w-[680px] px-4 pb-10 pt-8">
        <header class="mb-5 flex items-center justify-between gap-2">
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
        </header>
        <Graph names={sheets.names} />
      </div>
      <button
        type="button"
        onClick={() => setRegOpen(true)}
        title="Registrar"
        aria-label="Registrar"
        class="fixed bottom-8 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-chart-2 text-background shadow-lg transition-transform duration-150 active:scale-80"
      >
        <Plus class="size-6" />
      </button>
      <Modal open={regOpen} onClose={() => setRegOpen(false)} label="Registrar">
        <Registro sheet={sheet} onSaved={() => setRegOpen(false)} />
      </Modal>
    </div>
  );
}
