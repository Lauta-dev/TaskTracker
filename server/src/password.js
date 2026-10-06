import { compare, hash } from "bcryptjs";

/* Passwords con bcrypt (lib establecida, JS puro: anda en Workers sin
   WASM ni módulos nativos). Costo 10: ~100ms, solo en setup/login. */
const COST = 10;

export async function hashPassword(password) {
  return hash(password, COST);
}

export async function verifyPassword(password, stored) {
  try {
    return await compare(password, String(stored));
  } catch {
    return false;
  }
}

/* SHA-256 hex para guardar tokens de sesión (si roban la DB no sirven). */
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Token opaco de sesión: 256 bits de entropía en base64url. */
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
