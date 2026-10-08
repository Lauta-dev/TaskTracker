import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { ChartColumn, ChartPie, LayoutGrid, LogOut, Plus, Table, Tags } from "lucide-preact";
import { useSheets } from "./hooks/useSheets";
import { authStatus, logout, saveLastSheet, USE_MOCK } from "./api.js";
import { LockScreen } from "./components/LockScreen";
import { Graph } from "./pages/Graph";
import { Activities } from "./pages/Activities";
import { EntryForm } from "./pages/EntryForm";
import { Modal } from "./components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { SheetPicker } from "./components/SheetPicker";
import { resolveSheet } from "./sheet";

const VISTAS = [
  { value: "grilla", label: "Grilla", Icon: LayoutGrid },
  { value: "barras", label: "Barras", Icon: ChartColumn },
  { value: "pastel", label: "Pastel", Icon: ChartPie },
  { value: "tabla", label: "Tabla", Icon: Table },
  { value: "actividades", label: "Actividades", Icon: Tags },
];

export function App() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sheets = useSheets();
  // FAB que abre el EntryForm en modal.
  const [regOpen, setRegOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [vista, setVista] = useState("grilla");
  // Auth: checking → setup (sin cuenta) / login (sin sesión) / app.
  const [auth, setAuth] = useState({ state: USE_MOCK ? "app" : "checking" });
  const authRef = useRef(auth.state);
  authRef.current = auth.state;
  const current = VISTAS.find((v) => v.value === vista) || VISTAS[0];

  // La lista se pide una sola vez acá y baja por props.
  // Se pasa `names` sin forzar []: null = aún cargando (resolveSheet usa
  // ?sheet=/última para mostrar datos enseguida).
  const sheet = resolveSheet(search, sheets.names);

  // La resuelta es la última usada: persiste en localStorage para que el
  // próximo arranque (y el fetch de filas) la reutilice si existe.
  useEffect(() => {
    if (sheet) saveLastSheet(sheet);
  }, [sheet]);

  // El 401 (sesión vencida/inválida) re-chequea solo si estábamos en la app:
  // si ya muestra el lock, no hace nada (evita loop de reintentos).
  useEffect(() => {
    if (USE_MOCK) return;
    let alive = true;
    async function check() {
      try {
        const s = await authStatus();
        if (!alive) return;
        setAuth(s.setupRequired ? { state: "setup" } : s.username ? { state: "app" } : { state: "login" });
      } catch {
        if (alive && authRef.current === "checking") setAuth({ state: "login" });
      }
    }
    function onAuth() {
      if (authRef.current === "app") check();
    }
    check();
    window.addEventListener("tt:auth", onAuth);
    return () => {
      alive = false;
      window.removeEventListener("tt:auth", onAuth);
    };
  }, []);

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

  async function onLogout() {
    await logout();
    setAuth({ state: "login" });
  }

  if (auth.state !== "app") {
    if (auth.state === "checking") return null;
    return <LockScreen mode={auth.state} onDone={() => setAuth({ state: "app" })} />;
  }

  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto w-full max-w-[680px] px-4 pb-10 pt-8 md:max-w-[1020px]">
        <header class="mb-5 flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-4">
          <div class="order-1 flex min-w-0 shrink-0 items-center gap-2">
            <img src="/icons.svg" alt="Tinta" class="size-7 rounded-md" />
            <p class="font-display truncate text-[17px] font-semibold tracking-tight md:text-[21px]">Tinta</p>
            {USE_MOCK && (
              <span class="font-data rounded-full bg-chart-2/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
                mock
              </span>
            )}
          </div>
          <div class="order-2 ml-auto flex shrink-0 items-center gap-2 md:order-3 md:ml-0">
            <Select value={vista} onValueChange={setVista}>
              <SelectTrigger aria-label="Vista" className="font-display h-10 w-auto shrink-0 gap-2 rounded-md border-0 bg-muted px-4 text-[15px] font-semibold shadow-none focus-visible:ring-2 md:h-11 md:px-5 md:text-[16px] [&_[data-slot=select-value]]:min-w-0">
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
            <button
              type="button"
              onClick={openNew}
              title="Registrar"
              aria-label="Registrar"
              class="flex size-10 shrink-0 items-center justify-center rounded-md bg-chart-2 text-background transition-transform duration-150 active:scale-90"
            >
              <Plus class="size-5" />
            </button>
            {!USE_MOCK && (
              <button
                type="button"
                onClick={onLogout}
                title="Salir"
                aria-label="Salir"
                class="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
              >
                <LogOut class="size-5" />
              </button>
            )}
          </div>
          <div class="order-3 w-full min-w-0 md:order-2 md:w-auto md:flex-1 md:px-2">
            <div class="w-full md:mx-auto md:max-w-[380px]">
              <SheetPicker names={sheets.names} sheet={sheet} onPick={pick} onListChanged={sheets.retry} />
            </div>
          </div>
        </header>
        {vista === "actividades" ? (
          <Activities sheet={sheet} />
        ) : (
          <Graph names={sheets.names} vista={vista} onEdit={openEdit} />
        )}
      </div>
      <Modal open={regOpen} onClose={closeReg} label={editing ? "Editar" : "Registrar"}>
        {regOpen && <EntryForm key={editing?.row || "new"} sheet={sheet} editing={editing} onSaved={closeReg} />}
      </Modal>
    </div>
  );
}
