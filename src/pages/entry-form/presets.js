/* Un color por área (grilla, drawer, pie y vista Activities). */
export const AREA_COLOR = {
  ingles: "var(--color-chart-2)",
  ejercicio: "var(--color-chart-4)",
  matematica: "oklch(0.7 0.16 255)",
};

export const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring";
export const label =
  "font-data mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground";

export const PRESETS = {
  ingles: {
    habLabel: "Habilidad",
    recLabel: "Tipo",
    habs: ["Listening", "Vocabulary", "Reading", "Grammar"],
    recs: ["Anki", "YT", "Serie", "Anime", "Movie"],
    contentPh: "The Office S01 E05",
    durRequired: true,
    chips: [],
  },
  matematica: {
    habLabel: "Tema",
    freeHab: true,
    recLabel: "Fuente",
    habs: ["Álgebra", "Cálculo", "Geometría", "Probabilidad"],
    recs: ["Libro", "Curso", "Videos", "Práctica"],
    contentPh: "Integrales por partes, cap. 4",
    durRequired: true,
    chips: ["25m", "50m", "1h", "2h"],
  },
  ejercicio: {
    habLabel: "Disciplina",
    hideRec: true,
    habs: ["Pierna", "Torso", "Brazo", "Core", "Cardio"],
    recs: [],
    contentPh: "Sentadilla 4x8 60kg",
    durRequired: false,
    chips: ["30m", "45m", "1h"],
  },
};
