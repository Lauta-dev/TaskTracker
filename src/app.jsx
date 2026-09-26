import { useEffect, useRef, useState } from "preact/hooks";
import { Link, useLocation, useSearch } from "wouter";
import { LayoutGrid, Layers, Plus } from "lucide-preact";
import { useSheets } from "./hooks/useSheets";
import { Graph } from "./pages/Graph";
import { Registro } from "./pages/Registro";
import { Hojas } from "./pages/Hojas";
import { resolveSheet } from "./sheet";

function Tab({ href, active, icon, label }) {
  const Icon = icon;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      class={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon class="size-4" />
      {label}
    </Link>
  );
}

function View({ name, sheets }) {
  if (name === "/registro") return <Registro />;
  if (name === "/hojas") return <Hojas names={sheets.names} error={sheets.error} retry={sheets.retry} />;
  if (name === "/") return <Graph names={sheets.names} refreshList={sheets.retry} />;
  return <p class="text-sm text-muted-foreground">No existe esa página. <Link href="/" class="underline">Volver</Link></p>;
}

export function App() {
  const [path] = useLocation();
  const search = useSearch();
  const sheets = useSheets();
  const idRef = useRef(0);
  const [views, setViews] = useState([{ id: 0, key: path }]);

  // La lista se pide una sola vez acá y baja por props.
  const sheet = resolveSheet(search, sheets.names || []);
  const suffix = sheet ? `?sheet=${encodeURIComponent(sheet)}` : "";
  const viewKey = `${path}|${search || ""}`;

  useEffect(() => {
    setViews((cur) => {
      if (cur[cur.length - 1].key === viewKey) return cur;
      idRef.current += 1;
      return [...cur, { id: idRef.current, key: viewKey }];
    });
    const t = setTimeout(() => setViews((cur) => cur.slice(-1)), 280);
    return () => clearTimeout(t);
  }, [viewKey ]);

  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto w-full max-w-[680px] px-4 pb-28 pt-8">
        <header class="mb-5 flex items-center gap-2.5">
          <img src="/icons.svg" alt="Tinta" class="size-7 rounded-md" />
          <p class="font-display text-[17px] font-semibold tracking-tight">Tinta</p>
        </header>
        <div class="grid">
          {views.map((v, i) => (
            <div
              key={v.id}
              aria-hidden={i < views.length - 1}
              class={i < views.length - 1 ? "view-exit [grid-area:1/1]" : "view-enter [grid-area:1/1]"}
            >
              <View name={v.key.split("|")[0]} sheets={sheets} />
            </div>
          ))}
        </div>
      </div>
      <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background">
        <div class="mx-auto grid w-full max-w-[680px] grid-cols-3 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Tab href={`/${suffix}`} active={path === "/"} icon={LayoutGrid} label="Gráfico" />
          <Tab href={`/registro${suffix}`} active={path.startsWith("/registro")} icon={Plus} label="Registro" />
          <Tab href="/hojas" active={path === "/hojas"} icon={Layers} label="Hojas" />
        </div>
      </nav>
    </div>
  );
}
