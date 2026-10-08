import { cn } from "./ui/cn";

/* Iconos por área: 3 trazos inline estilo lucide (24×24, stroke 2).
   Inline a propósito: cero dependencias y ~500 bytes en total. */
const PATHS = {
  ingles: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  ejercicio: (
    <>
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3.5 9v6" />
      <path d="M20.5 9v6" />
      <path d="M6.5 12h11" />
    </>
  ),
  matematica: (
    <>
      <path d="M18 6H6l6 6-6 6h12" />
    </>
  ),
};

export function AreaIcon({ area, class: cls, className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      class={cn("size-4 shrink-0", className, cls)}
      {...props}
    >
      {PATHS[area] || PATHS.ingles}
    </svg>
  );
}
