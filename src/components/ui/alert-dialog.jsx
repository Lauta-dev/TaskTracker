import { useEffect, useState } from "preact/hooks";
import { Portal } from "./portal";
import { cn } from "./cn";

/** Overlay + tarjeta con la misma animación que Modal. */
export function AlertDialog({ open, onOpenChange, label, children }) {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open ]);

  useEffect(() => {
    if (!open || !present) return;
    const onKey = (e) => { if (e.key === "Escape") onOpenChange?.(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, present, onOpenChange ]);

  if (!present) return null;
  return (
    <Portal>
      <div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div
          class={cn(
            "absolute inset-0 bg-black/60",
            open ? "animate-in fade-in duration-200" : "animate-out fade-out duration-150",
          )}
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        <div
          role="alertdialog"
          aria-label={label}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !open) setPresent(false);
          }}
          class={cn(
            "relative w-full max-w-[400px] rounded-2xl border border-border bg-card p-4",
            open
              ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
              : "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2 duration-150",
          )}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}

export function AlertDialogTitle({ children, className }) {
  return <h2 class={cn("text-[16px] font-semibold", className)}>{children}</h2>;
}

export function AlertDialogDescription({ children, className }) {
  return <p class={cn("mt-1 text-[14px] text-muted-foreground", className)}>{children}</p>;
}

export function AlertDialogFooter({ children, className }) {
  return <div class={cn("mt-4 grid grid-cols-2 gap-2", className)}>{children}</div>;
}

export function AlertDialogCancel({ onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-[14px] font-medium active:scale-95",
        className,
      )}
    >
      {children || "Cancelar"}
    </button>
  );
}

export function AlertDialogAction({ onClick, destructive, disabled, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      class={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[14px] font-medium active:scale-95 disabled:opacity-50",
        destructive ? "bg-destructive text-white" : "bg-chart-2 text-background",
        className,
      )}
    >
      {children}
    </button>
  );
}
