import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
import { ChartColumn, ChartPie, LayoutGrid, LogOut, Plus, Table } from "lucide-preact";
import { useSheets } from "./hooks/useSheets";
import { authStatus, logout, saveLastSheet, USE_MOCK } from "./api.js";
import { LockScreen } from "./components/LockScreen";
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
      <div class="mx-auto w-full max-w-[680px] px-4 pb-10 pt-8">
        <header class="mb-4 flex items-center gap-2">
          <div class="flex min-w-0 shrink-0 items-center gap-2">
            <img src="/icons.svg" alt="Tinta" class="size-7 rounded-md" />
            <p class="font-display truncate text-[17px] font-semibold tracking-tight">Tinta</p>
            {USE_MOCK && (
              <span class="font-data rounded-full bg-chart-2/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
                mock
              </span>
            )}
          </div>
          <div class="ml-auto flex shrink-0 items-center gap-2">
            <Select value={vista} onValueChange={setVista}>
              <SelectTrigger aria-label="Vista" className="font-display h-10 w-auto shrink-0 gap-2 rounded-full border-0 bg-muted px-4 text-[15px] font-semibold shadow-none focus-visible:ring-2 [&_[data-slot=select-value]]:min-w-0">
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
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-2 text-background shadow transition-transform duration-150 active:scale-90"
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
        </header>
        <div class="mb-5">
          <SheetPicker names={sheets.names} sheet={sheet} onPick={pick} onListChanged={sheets.retry} />
        </div>
        <Graph names={sheets.names} vista={vista} onEdit={openEdit} />
      </div>
      <Modal open={regOpen} onClose={closeReg} label={editing ? "Editar" : "Registrar"}>
        {regOpen && <Registro key={editing?.row || "new"} sheet={sheet} editing={editing} onSaved={closeReg} />}
      </Modal>
    </div>
  );
}
