import { useEffect, useState } from "preact/hooks";
import { X } from "lucide-preact";
import { Portal } from "./portal";
import { cn } from "./cn";

/** Modal centrado de prueba para el Registro, con animación in/out. */
export function Modal({ open, onClose, label, children }) {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open ]);

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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class={cn(
            "absolute inset-0 bg-black/60",
            open ? "animate-in fade-in duration-200" : "animate-out fade-out duration-150",
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
            "relative max-h-[85dvh] w-full max-w-[480px] overflow-hidden rounded-2xl border border-border bg-card",
            open
              ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
              : "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2 duration-150",
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
          <div class="max-h-[85dvh] overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
