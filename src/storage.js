// Wrapper seguro de localStorage (valores como JSON).
export function get(key, fb) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fb;
    return JSON.parse(raw);
  } catch {
    return fb;
  }
}

// Guarda val como JSON. Devuelve true/false.
export function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

// Borra una clave (no lanza).
export function del(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // sin localStorage disponible
  }
}
