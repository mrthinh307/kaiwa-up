import { JLPT_DIFFICULTIES, type JlptDifficulty } from "@/types/practice-catalog";

import {
  PRACTICE_MODES,
  type PracticeLearningStatus,
  type PracticeMode,
} from "./practice-catalog-mock";

export type PracticeCatalogQueryParams = Readonly<Record<string, number | string | undefined>>;

export function buildPracticeCatalogHref({
  basePath,
  params,
}: {
  basePath: string;
  params: PracticeCatalogQueryParams;
}): string {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });

  const query = searchParams.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export function parseCatalogPage(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsedPage = Number.parseInt(value, 10);

  return Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

export function parseCatalogSearchQuery(value: string | undefined): string | undefined {
  const normalizedQuery = value?.trim().replace(/\s+/g, " ");

  return normalizedQuery ? normalizedQuery.slice(0, 100) : undefined;
}

export function parseJlptDifficulty(value: string | undefined): JlptDifficulty | undefined {
  return JLPT_DIFFICULTIES.find((difficulty) => difficulty === value);
}

export function parsePracticeModes(value: string | undefined): PracticeMode[] {
  if (!value) {
    return [...PRACTICE_MODES];
  }

  const requestedModes = new Set(value.split(","));
  const selectedModes = PRACTICE_MODES.filter((mode) => requestedModes.has(mode));

  return selectedModes.length > 0 ? [...selectedModes] : [...PRACTICE_MODES];
}

export function parsePracticeLearningStatus(
  value: string | undefined,
): PracticeLearningStatus | undefined {
  return value === "learned" || value === "not_learned" ? value : undefined;
}

export function serializePracticeModes(modes: readonly PracticeMode[]): string | undefined {
  const selectedModes = PRACTICE_MODES.filter((mode) => modes.includes(mode));

  return selectedModes.length === PRACTICE_MODES.length
    ? undefined
    : selectedModes.length > 0
      ? selectedModes.join(",")
      : undefined;
}
