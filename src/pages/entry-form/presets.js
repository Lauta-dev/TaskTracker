/* Subformularios por área: caja FIELD_BOX + trigger de select transparente. */
export const SELECT_TRIGGER =
  "h-11 border-0 bg-transparent px-0 text-[15px] font-medium text-foreground focus-visible:ring-0 justify-between [&>svg]:opacity-60";
export const AREA_COLOR = {
  ingles: "var(--area-ingles)",
  ejercicio: "var(--area-ejercicio)",
  matematica: "var(--area-matematica)",
};

/* Par container/on-container para tiles y chips por área. */
export const AREA_TILE = {
  ingles: { bg: "var(--area-ingles-container)", fg: "var(--area-ingles-on-container)" },
  ejercicio: { bg: "var(--area-ejercicio-container)", fg: "var(--area-ejercicio-on-container)" },
  matematica: { bg: "var(--area-matematica-container)", fg: "var(--area-matematica-on-container)" },
};

/* Caja de campo estilo Tinta: label mono chico adentro, control sin borde.
   El focus iluminado vive en la caja (focus-within), no en el control. */
export const FIELD_BOX =
  "rounded-xl bg-muted px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-ring";
export const field =
  "w-full border-0 bg-transparent px-0 py-0.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0";
export const label =
  "font-data block text-[10px] uppercase tracking-[.14em] text-muted-foreground";

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
