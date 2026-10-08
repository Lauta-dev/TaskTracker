import { get, set } from "./storage.js";
import { PRESETS } from "./pages/entry-form/presets.js";

/* Listas propias por área (disciplinas, temas, tipos…).
   Viven en localStorage: los valores por defecto + lo usado en filas
   siempre se muestran; acá solo se gestionan los agregados por el usuario. */

const CUSTOM_KEY = "tt-custom-v1";

function all() {
  const v = get(CUSTOM_KEY, {});
  return v && typeof v === "object" ? v : {};
}

function norm(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

/** Customs de un área: { hab: [], rec: [] }. */
export function getCustom(area) {
  const a = all()[area];
  return {
    hab: Array.isArray(a?.hab) ? a.hab.filter((x) => typeof x === "string") : [],
    rec: Array.isArray(a?.rec) ? a.rec.filter((x) => typeof x === "string") : [],
  };
}

function save(area, custom) {
  const data = all();
  data[area] = custom;
  set(CUSTOM_KEY, data);
}

function exists(list, name) {
  return list.some((x) => x.toLowerCase() === name.toLowerCase());
}

export function addCustom(area, kind, name) {
  const clean = norm(name).slice(0, 40);
  if (!clean) return "Escribí un nombre.";
  const c = getCustom(area);
  const preset = (kind === "rec" ? PRESETS[area]?.recs : PRESETS[area]?.habs) || [];
  if (exists([...preset, ...c[kind]], clean)) return "Ya existe.";
  c[kind] = [...c[kind], clean];
  save(area, c);
  return "";
}

export function renameCustom(area, kind, from, name) {
  const clean = norm(name).slice(0, 40);
  if (!clean) return "Escribí un nombre.";
  const c = getCustom(area);
  if (!c[kind].includes(from)) return "No existe.";
  const preset = (kind === "rec" ? PRESETS[area]?.recs : PRESETS[area]?.habs) || [];
  if (clean !== from && exists([...preset, ...c[kind]], clean)) return "Ya existe.";
  c[kind] = c[kind].map((x) => (x === from ? clean : x));
  save(area, c);
  return "";
}

export function removeCustom(area, kind, name) {
  const c = getCustom(area);
  c[kind] = c[kind].filter((x) => x !== name);
  save(area, c);
}

/** Lista final para los forms: defaults + customs + usados en filas. */
export function listOptions(area, kind, rows) {
  const preset = (kind === "rec" ? PRESETS[area]?.recs : PRESETS[area]?.habs) || [];
  const c = getCustom(area)[kind] || [];
  const used = (rows || []).map((r) => (kind === "rec" ? r.recurso : r.habilidad)).filter(Boolean);
  return [...new Set([...preset, ...c, ...used])];
}
