import { useEffect, useRef, useState } from "preact/hooks";
import { EllipsisVertical } from "lucide-preact";
import { Portal } from "./portal";
import { cn } from "./cn";

/**
 * Menú desplegable estilo shadcn (Trigger + contenido en Portal).
 * Se cierra al elegir, tocar fuera, Escape o hacer scroll.
 */
export function DropdownMenu({ label, triggerLabel, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      top: Math.min(r.bottom + 6, window.innerHeight - 140),
      right: Math.max(8, window.innerWidth - r.right),
    });
    setOpen(true);
    // Cierra cualquier otro menú abierto.
    window.dispatchEvent(new CustomEvent("tt:menu"));
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("tt:menu", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("tt:menu", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={triggerLabel || "Opciones"}
        aria-label={triggerLabel || "Opciones"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        class="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground active:bg-muted hover:text-foreground"
      >
        <EllipsisVertical class="size-4" />
      </button>
      {open && (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            style={{ top: pos.top, right: pos.right }}
            class="fixed z-[60] w-52 rounded-xl border border-border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {children}
          </div>
        </Portal>
      )}
    </>
  );
}

export function DropdownMenuItem({ onClick, destructive, children, className }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        window.dispatchEvent(new CustomEvent("tt:menu"));
        onClick?.(e);
      }}
      class={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[14px] font-medium active:bg-muted",
        destructive ? "text-destructive" : "text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
