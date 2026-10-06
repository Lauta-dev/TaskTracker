import { useState } from "preact/hooks";
import { login, setup } from "../api.js";
import { get, set } from "../storage.js";

/* Bloqueo: setup (crear LA cuenta, solo primera vez) o login.
   El user se recuerda en local (no sensible) para prellenarlo. */
const LAST_USER_KEY = "tt-user";

export function LockScreen({ mode, onDone }) {
  const [username, setUsername] = useState(() => get(LAST_USER_KEY, ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSetup = mode === "setup";

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (isSetup && password !== confirm) {
      setError("Las claves no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const name = username.trim();
      if (isSetup) await setup(name, password);
      else await login(name, password);
      set(LAST_USER_KEY, name);
      onDone?.();
    } catch (err) {
      setError(err?.status === 401 ? "Usuario o clave incorrectos." : (err?.message ?? "Error."));
    } finally {
      setBusy(false);
    }
  }

  const valid = username.trim() !== "" && password !== "" && (!isSetup || confirm !== "");

  return (
    <div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={submit} class="w-full max-w-[320px]">
        <div class="mb-5 flex items-center gap-2">
          <img src="/icons.svg" alt="Tinta" class="size-7 rounded-md" />
          <p class="font-display text-[17px] font-semibold tracking-tight">Tinta</p>
        </div>
        <p class="font-data mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
          {isSetup ? "Crear cuenta" : "Entrar"}
        </p>
        <label
          htmlFor="tt-username"
          class="font-data mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground"
        >
          Usuario
        </label>
        <input
          id="tt-username"
          type="text"
          value={username}
          onInput={(e) => setUsername(e.target.value)}
          autocomplete="username"
          autofocus={username === ""}
          class="h-11 w-full rounded-md border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <label
          htmlFor="tt-password"
          class="font-data mb-1.5 mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground"
        >
          Contraseña{isSetup && " (mínimo 8)"}
        </label>
        <input
          id="tt-password"
          type="password"
          value={password}
          onInput={(e) => setPassword(e.target.value)}
          autocomplete={isSetup ? "new-password" : "current-password"}
          autofocus={username !== ""}
          class="h-11 w-full rounded-md border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isSetup && (
          <>
            <label
              htmlFor="tt-confirm"
              class="font-data mb-1.5 mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Repetir contraseña
            </label>
            <input
              id="tt-confirm"
              type="password"
              value={confirm}
              onInput={(e) => setConfirm(e.target.value)}
              autocomplete="new-password"
              class="h-11 w-full rounded-md border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        )}
        {error && <p class="mt-2 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy || !valid}
          class="mt-3 h-11 w-full rounded-md bg-chart-2 text-sm font-semibold text-background transition-opacity active:opacity-90 disabled:opacity-40"
        >
          {busy ? "Verificando…" : isSetup ? "Crear y entrar" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
