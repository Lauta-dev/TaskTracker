import { useEffect, useRef, useState } from "preact/hooks";
import { useSearch } from "wouter";
import { Check, LogOut, Plus } from "lucide-preact";
import { authStatus, logout, saveLastMonth, USE_MOCK } from "./api.js";
import { MONTH_LABEL } from "./dates.js";
import { resolveMonth } from "./month.js";
import { LockScreen } from "./components/LockScreen";
import { Graph } from "./pages/Graph";
import { Activities } from "./pages/Activities";
import { EntryForm } from "./pages/EntryForm";
import { Modal } from "./components/ui/modal";

const VISTAS = [
  { value: "grilla", label: "Grilla" },
  { value: "pastel", label: "Pastel" },
  { value: "tabla", label: "Tabla" },
  { value: "actividades", label: "Actividades" },
];

export function App() {
  const search = useSearch();
  // FAB que abre el EntryForm en modal.
  const [regOpen, setRegOpen] = useState(false);
  const [regDay, setRegDay] = useState(null);
  const [editing, setEditing] = useState(null);
  const [vista, setVista] = useState("grilla");
  // Auth: checking → setup (sin cuenta) / login (sin sesión) / app.
  const [auth, setAuth] = useState({ state: USE_MOCK ? "app" : "checking" });
  const authRef = useRef(auth.state);
  authRef.current = auth.state;

  // Mes activo: ?month= → último visto → mes actual del dispositivo.
  const month = resolveMonth(search);

  // El mes activo es el último usado: persiste en localStorage para que el
  // próximo arranque (y el fetch de filas) lo reutilice si existe.
  useEffect(() => {
    if (month) saveLastMonth(month);
  }, [month]);

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

  function openNew(day = null) {
    setEditing(null);
    setRegDay(typeof day === "string" ? day : null);
    setRegOpen(true);
  }

  function openEdit(entry) {
    setRegDay(null);
    setEditing(entry);
    setRegOpen(true);
  }

  function closeReg() {
    setRegOpen(false);
    setEditing(null);
    setRegDay(null);
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
    <div class="min-h-dvh bg-background text-foreground">
      <div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 px-4 pb-4 pt-3 min-[840px]:max-w-[1180px] min-[840px]:gap-4 min-[840px]:px-0 min-[840px]:pb-10 min-[840px]:pt-8">
        <header class="flex h-11 shrink-0 items-center gap-2 min-[840px]:h-12 min-[840px]:gap-3">
          <div
            aria-hidden="true"
            class="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-sans text-[15px] leading-none text-chart-2 min-[840px]:size-10 min-[840px]:text-lg"
          >
            語
          </div>
          <h1 class="font-display min-w-0 flex-1 truncate text-[18px] font-semibold capitalize leading-6 tracking-tight min-[840px]:text-2xl">
            {MONTH_LABEL(month)}
          </h1>
          {USE_MOCK && (
            <span class="font-data rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              mock
            </span>
          )}
          {!USE_MOCK && (
            <button
              type="button"
              onClick={onLogout}
              title="Salir"
              aria-label="Salir"
              class="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
            >
              <LogOut class="size-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openNew()}
            class="hidden h-[34px] shrink-0 items-center gap-2 rounded-full bg-chart-2 pl-3 pr-4 text-[13px] font-medium text-primary-foreground transition-transform active:scale-95 min-[840px]:flex"
          >
            <Plus class="size-4" /> Registrar
          </button>
        </header>

        <nav
          aria-label="Vista"
          class="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[840px]:mx-0 min-[840px]:px-0"
        >
          {VISTAS.map((v) => {
            const active = vista === v.value;
            return (
              <button
                key={v.value}
                type="button"
                aria-pressed={active}
                onClick={() => setVista(v.value)}
                class={`flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent bg-secondary pl-2 pr-3 text-secondary-foreground"
                    : "border-border px-3 text-muted-foreground active:bg-muted"
                }`}
              >
                {active && <Check class="size-4" />}
                {v.label}
              </button>
            );
          })}
        </nav>

        <main class="min-h-0 flex-1">
          {vista === "actividades" ? (
            <Activities month={month} />
          ) : (
            <Graph vista={vista} onEdit={openEdit} onAddToDay={(day) => openNew(day)} />
          )}
        </main>

        <div class="sticky bottom-3 z-30 mt-auto flex justify-end min-[840px]:hidden">
          <button
            type="button"
            onClick={() => openNew()}
            class="flex h-12 items-center gap-2 rounded-2xl bg-chart-2 pl-3 pr-4 text-sm font-medium text-primary-foreground shadow-lg shadow-black/40 transition-transform active:scale-95"
          >
            <Plus class="size-5" /> Registrar
          </button>
        </div>
      </div>

      <Modal open={regOpen} onClose={closeReg} label={editing ? "Editar" : "Registrar"}>
        {regOpen && (
          <EntryForm
            key={editing?.row || regDay || "new"}
            month={month}
            editing={editing}
            defaultDay={regDay}
            onSaved={closeReg}
          />
        )}
      </Modal>
    </div>
  );
}
