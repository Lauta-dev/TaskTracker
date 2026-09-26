import { CheckIcon, ChevronDownIcon } from "lucide-preact";
import { createContext } from "preact";
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { cn } from "./cn";

const SelectContext = createContext(null);

function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

export function Select({ value: valueProp, defaultValue = "", onValueChange, children }) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const rootRef = useRef(null);
  const value = valueProp !== undefined ? valueProp : internal;

  function setValue(v) {
    if (valueProp === undefined) setInternal(v);
    onValueChange?.(v);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const ctx = useMemo(
    () => ({ value, setValue, open, setOpen, selectedLabel, setSelectedLabel }),
    [value, open, selectedLabel],
  );

  return (
    <div ref={rootRef} class="relative">
      <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>
    </div>
  );
}

export function SelectTrigger({ class: cls, className, children, ...props }) {
  const { open, setOpen } = useSelect();
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      data-slot="select-trigger"
      data-state={open ? "open" : "closed"}
      onClick={() => setOpen(!open)}
      class={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
        cls,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon class="size-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder, children }) {
  const { value, selectedLabel } = useSelect();
  const shown = children ?? selectedLabel ?? value;
  return (
    <span data-slot="select-value" class={cn("truncate", !shown && "text-muted-foreground")}>
      {shown || placeholder}
    </span>
  );
}

export function SelectContent({ className, children }) {
  const { open } = useSelect();
  const [present, setPresent] = useState(false);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open ]);

  if (!present) return null;
  return (
    <div
      role="listbox"
      data-slot="select-content"
      data-state={open ? "open" : "closed"}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && !open) setPresent(false);
      }}
      class={cn(
        "absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        open ? "animate-in fade-in-0 zoom-in-95" : "animate-out fade-out-0 zoom-out-95",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children }) {
  const select = useSelect();
  const checked = select.value === value;
  return (
    <div
      role="option"
      aria-selected={checked}
      data-slot="select-item"
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => {
        select.setValue(value);
        select.setSelectedLabel(typeof children === "string" ? children : value);
        select.setOpen(false);
      }}
      class={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        checked && "bg-accent/60",
      )}
    >
      <span class="absolute right-2 flex size-3.5 items-center justify-center">
        {checked && <CheckIcon class="size-4" />}
      </span>
      {children}
    </div>
  );
}
