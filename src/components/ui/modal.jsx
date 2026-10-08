import { useEffect, useState } from "preact/hooks";
import { X } from "lucide-preact";
import { Portal } from "./portal";
import { cn } from "./cn";

/** Modal centrado en mobile, panel lateral derecho en desktop. */
export function Modal({ open, onClose, label, children }) {
  const [present, setPresent] = useState(open);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open ]);

  // Fallback: si el animationend no dispara (clase faltante, pestaña
  // oculta, reduced-motion), desmonta igual tras la animación.
  useEffect(() => {
    if (open || !present) return;
    const t = setTimeout(() => setPresent(false), 200);
    return () => clearTimeout(t);
  }, [open, present]);

  useEffect(() => {
    if (!open || !present) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, present, onClose ]);

  if (!present) return null;
  return (
    <Portal>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 md:items-stretch md:justify-end md:p-0">
        <div
          class={cn(
            "absolute inset-0 bg-black/60 motion-reduce:animate-none",
            open ? "animate-in fade-in duration-150" : "animate-out fade-out duration-100",
          )}
          onClick={() => onClose?.()}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-label={label}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !open) setPresent(false);
          }}
          class={cn(
            "relative flex max-h-[85dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card motion-reduce:animate-none md:ml-auto md:h-full md:max-h-none md:min-h-dvh md:w-[440px] md:max-w-[440px] md:rounded-none md:rounded-l-2xl md:border-y-0 md:border-r-0",
            open
              ? "animate-in fade-in-0 slide-in-from-bottom-2 duration-150 md:slide-in-from-bottom-0 md:slide-in-from-right"
              : "animate-out fade-out-0 slide-out-to-bottom-2 duration-100 md:slide-out-to-bottom-0 md:slide-out-to-right",
          )}
        >
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            class="absolute right-3 top-3 z-10 rounded-md bg-card p-1 text-muted-foreground hover:text-foreground"
          >
            <X class="size-5" />
          </button>
          <div class="max-h-[85dvh] overflow-y-auto p-4 md:max-h-none md:flex-1 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
