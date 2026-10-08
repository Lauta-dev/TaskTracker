import { useEffect, useRef, useState } from "preact/hooks";
import { cn } from "./cn";
import { Portal } from "./portal";

export function Sheet({ open, onOpenChange, label, children }) {
  const [present, setPresent] = useState(false);
  const [dragY, setDragY] = useState(null);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setDragY(null);
    }
  }, [open ]);

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
  }, [open, present, onOpenChange ]);

  function close() {
    onOpenChange(false);
  }

  function dismissByDrag() {
    const h = panelRef.current?.offsetHeight ?? 400;
    setDragging(false);
    setDragY(h);
    setTimeout(() => {
      setPresent(false);
      setDragY(null);
      onOpenChange(false);
    }, 300);
  }

  function onPointerDown(e) {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }

  function onPointerUp() {
    if (!dragging) return;
    if ((dragY ?? 0) > 110) dismissByDrag();
    else {
      setDragging(false);
      setDragY(0);
      setTimeout(() => setDragY((v) => (v === 0 ? null : v)), 250);
    }
  }

  if (!present) return null;

  return (
    <Portal>
    <div class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <div
        data-state={open ? "open" : "closed"}
        onClick={close}
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
            ? { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.25s ease-out" }
            : undefined
        }
        class={cn(
          "absolute inset-x-3 bottom-0 mx-auto max-h-[80dvh] w-auto max-w-[680px] overflow-auto rounded-t-2xl bg-popover text-popover-foreground",
          open && dragY == null ? "animate-in slide-in-from-bottom" : "",
          !open && dragY == null ? "animate-out slide-out-to-bottom" : "",
        )}
      >
        <div
          data-drag-handle
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
          class="cursor-grab pt-3 pb-1 active:cursor-grabbing"
          aria-hidden="true"
        >
          <div class="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/40" />
        </div>
        <div class="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
    </Portal>
  );
}
