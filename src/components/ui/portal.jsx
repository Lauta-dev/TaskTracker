import { createPortal, useLayoutEffect, useState } from "preact/compat";

export function Portal({ container, children }) {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  const target = container || (mounted ? globalThis?.document?.body : null);
  if (!target) return null;
  return createPortal(children, target);
}
