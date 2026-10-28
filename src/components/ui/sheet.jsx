import { useEffect, useRef, useState } from "preact/hooks";
import { cn } from "./cn";
import { Portal } from "./portal";

/* Drawer inferior con gesto de arrastre para cerrar. Sin barrita visible:
   un tap seco en la franja de gesto cerraba y volvía a abrir; ahora solo
   un arrastre real (cliente Y > 8px) mueve al panel, >110px descarta. */
export function Sheet({ open, onOpenChange, label, children }) {
  const [present, setPresent] = useState(false);
  const [dragY, setDragY] = useState(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startY = useRef(0);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  useEffect(() => {
    if (!open || !present) return;
    function onKey(e) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, present, onOpenChange]);

  function dismissByDrag() {
    const h = panelRef.current?.offsetHeight ?? 400;
    dragging.current = false;
    setDragY(h);
    setTimeout(() => {
      setPresent(false);
      setDragY(null);
      onOpenChange(false);
    }, 300);
  }

  function onPointerDown(e) {
    startY.current = e.clientY;
    moved.current = false;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    // Tap: sin movimiento real no se mueve nada (evita el cerrar/reabrir).
    if (!moved.current && dy < 8) return;
    moved.current = true;
    setDragY(Math.max(0, dy));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current && (dragY ?? 0) > 110) {
      dismissByDrag();
    } else if (moved.current) {
      setDragY(0);
      setTimeout(() => setDragY((v) => (v === 0 ? null : v)), 250);
    }
    /* Tap sin arrastre: la hoja sigue abierta; el click no se traslada al
       overlay ni dispara acciones del contenido. */
  }

  if (!present) return null;

  return (
    <Portal>
      <div class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
        <div
          data-state={open ? "open" : "closed"}
          onClick={() => onOpenChange(false)}
          class={cn(
            "absolute inset-0 bg-black/60",
            open ? "animate-in fade-in-0" : "animate-out fade-out-0",
          )}
        />
        <div
          ref={panelRef}
          data-state={open ? "open" : "closed"}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !open && dragY == null) setPresent(false);
          }}
          style={
            dragY != null
              ? { transform: `translateY(${dragY}px)`, transition: dragging.current ? "none" : "transform 0.25s ease-out" }
              : undefined
          }
          class={cn(
            "absolute inset-x-2 bottom-2 mx-auto max-h-[88dvh] w-auto max-w-[560px] overflow-auto rounded-[28px] bg-card text-card-foreground",
            open && dragY == null ? "animate-in slide-in-from-bottom" : "",
            !open && dragY == null ? "animate-out slide-out-to-bottom" : "",
          )}
        >
          {/* Franja de gesto (invisible): reemplaza a la barrita '--'. */}
          <div
            data-drag-handle
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: "none" }}
            class="h-9 shrink-0 select-none"
            aria-hidden="true"
          />
          <div class="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
