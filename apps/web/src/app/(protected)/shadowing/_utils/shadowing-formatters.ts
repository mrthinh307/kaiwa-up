export function getShadowingLessonHref(lessonId: string): string {
  return `/shadowing/${encodeURIComponent(lessonId)}`;
}
