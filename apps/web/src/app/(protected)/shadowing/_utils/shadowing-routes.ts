export const SHADOWING_CELEBRATION_STORAGE_PREFIX = "kaiwa:shadowing:celebrate:";

export const buildShadowingLessonHref = (contentId: string) =>
  `/shadowing/${encodeURIComponent(contentId)}`;

export const buildShadowingPracticeHref = (attemptId: string) =>
  `/shadowing/attempts/${encodeURIComponent(attemptId)}/practice`;

export const buildShadowingResultHref = (attemptId: string) =>
  `/shadowing/attempts/${encodeURIComponent(attemptId)}/result`;
