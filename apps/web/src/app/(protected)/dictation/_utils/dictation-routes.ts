export const DICTATION_CELEBRATION_STORAGE_PREFIX = "kaiwa:dictation:celebrate:";

export const buildDictationPracticeHref = (attemptId: string) =>
  `/dictation/attempts/${encodeURIComponent(attemptId)}/practice`;

export const buildDictationResultHref = (attemptId: string) =>
  `/dictation/attempts/${encodeURIComponent(attemptId)}/result`;
