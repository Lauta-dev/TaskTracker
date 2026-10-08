// Parsea matriz con header a filas normalizadas.
import { dateKey } from "./dates.js";

export function parseRows(m) {
  if (!Array.isArray(m) || m.length < 2) return [];
  const out = [];
  for (let i = 1; i < m.length; i++) {
    const row = m[i];
    if (!Array.isArray(row)) continue;
    const rawFecha = row[0];
    if (rawFecha === "Hora") continue;
    // Día calendario: el date-only va literal (UTC-midnight lo corría un día).
    const key = dateKey(rawFecha);
    if (!key) continue;
    const habilidad = row[1] ? String(row[1]) : "—";
    const recurso = row[2] ? String(row[2]) : "—";
    let titulo = "Sin título";
    let url = "";
    const c = row[3];
    if (c !== null && c !== undefined) {
      if (typeof c === "object") {
        titulo = c.title ? String(c.title) : "Sin título";
        url = c.url ? String(c.url) : "";
      } else {
        const t = String(c).trim();
        titulo = t ? t : "Sin título";
      }
    }
    const secs = parseSheetDuration(row[4]);
    const notas = row[5] ? String(row[5]) : "";
    // Área en columna 7 (hojas mixtas); default 'ingles' para filas viejas.
    const rawArea = row[7] === null || row[7] === undefined ? "" : String(row[7]).trim().toLowerCase();
    const area = rawArea === "ejercicio" || rawArea === "matematica" ? rawArea : "ingles";
    // sheetRow: índice 1-based en la pestaña (para UPDATE/DELETE). Null si no viene.
    const num = typeof row[6] === "number" ? row[6] : null;
    out.push({ key, area, secs, habilidad, recurso, titulo, url, notas, row: num });
  }
  return out;
}

// Duración de planilla/API: "H:MM:SS" | "MM:SS" | "N min" | "N" | "".
export function parseSheetDuration(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (s === "") return 0;
  if (s.includes(":")) {
    const p = s.split(":").map((x) => Number(x.trim()));
    if (p.some((n) => !Number.isFinite(n) || n < 0)) return 0;
    if (p.length === 3) return Math.round(p[0] * 3600 + p[1] * 60 + p[2]);
    if (p.length === 2) return Math.round(p[0] * 60 + p[1]);
    return 0;
  }
  // "N min" o "N" (= N minutos).
  const low = s.toLowerCase().replace(/mins?\.?$/, "").trim();
  const num = Number(low.replace(/min$/, "").trim());
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 60);
}

// Input humano del formulario -> {secs, error}.
export function parseDuration(s) {
  if (s === null || s === undefined) return { secs: 0, error: "Ingresá una duración." };
  let t = String(s).trim();
  if (t === "") return { secs: 0, error: "Ingresá una duración." };

  // Fórmula = fracción de día (solo números y +-*/()).
  if (t.startsWith("=")) {
    const body = t.slice(1).trim();
    if (body === "" || !/^[0-9+\-*/().\s]+$/.test(body)) {
      return { secs: 0, error: "Fórmula inválida." };
    }
    let days;
    try {
      days = Function('"use strict";return(' + body + ")")();
    } catch {
      return { secs: 0, error: "Fórmula inválida." };
    }
    if (!Number.isFinite(days)) return { secs: 0, error: "Fórmula inválida." };
    return checkRange(Math.round(days * 86400));
  }

  // "H:MM:SS" | "MM:SS".
  if (t.includes(":")) {
    const p = t.split(":").map((x) => x.trim());
    const nums = p.map(Number);
    if (p.length === 3) {
      const [h, mi, se] = nums;
      if (!validHMS(h, mi, se)) return { secs: 0, error: "Duración inválida." };
      return checkRange(Math.round(h * 3600 + mi * 60 + se));
    }
    if (p.length === 2) {
      const [mi, se] = nums;
      if (!Number.isFinite(mi) || !Number.isFinite(se) || mi < 0 || se < 0 || se >= 60) {
        return { secs: 0, error: "Duración inválida." };
      }
      return checkRange(Math.round(mi * 60 + se));
    }
    return { secs: 0, error: "Duración inválida." };
  }

  const low = t.toLowerCase().trim().replace(",", ".");

  // Formas con h/m: "1h", "1.5h", "25m", "30 min", "1h30", "1h 30m".
  const hMatch = low.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+(?:\.\d+)?)?\s*(m(?:in(?:s)?)?)?\s*$/);
  if (hMatch) {
    const h = Number(hMatch[1]);
    const mi = hMatch[2] === undefined || hMatch[2] === "" ? 0 : Number(hMatch[2]);
    if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || mi < 0) {
      return { secs: 0, error: "Duración inválida." };
    }
    return checkRange(Math.round(h * 3600 + mi * 60));
  }
  const mMatch = low.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:s)?)?\s*$/);
  if (mMatch) {
    const mi = Number(mMatch[1]);
    if (!Number.isFinite(mi)) return { secs: 0, error: "Duración inválida." };
    return checkRange(Math.round(mi * 60));
  }

  // Número solo = minutos.
  if (/^\d+(?:\.\d+)?$/.test(low)) {
    return checkRange(Math.round(Number(low) * 60));
  }

  return { secs: 0, error: "Duración inválida." };
}

function validHMS(h, mi, se) {
  if (!Number.isFinite(h) || !Number.isFinite(mi) || !Number.isFinite(se)) return false;
  if (h < 0 || mi < 0 || se < 0) return false;
  if (mi >= 60 || se >= 60) return false;
  return true;
}

// Valida 0 < secs <= 86400.
function checkRange(secs) {
  if (!Number.isFinite(secs) || secs <= 0 || secs > 86400) {
    return { secs: 0, error: "La duración debe ser mayor a 0 y de hasta 24 horas." };
  }
  return { secs, error: null };
}
