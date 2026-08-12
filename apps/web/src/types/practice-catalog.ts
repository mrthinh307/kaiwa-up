export const JLPT_DIFFICULTIES = ["N5", "N4", "N3", "N2", "N1"] as const;

export type JlptDifficulty = (typeof JLPT_DIFFICULTIES)[number];

export type PracticeCatalogOption = {
  label: string;
  value: string;
};
