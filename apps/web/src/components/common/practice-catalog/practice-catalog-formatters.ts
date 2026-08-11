export function formatPracticeDuration(durationMs: number): string {
  const safeDurationSeconds = Math.max(Math.floor(durationMs / 1000), 0);
  const minutes = Math.floor(safeDurationSeconds / 60);
  const seconds = safeDurationSeconds % 60;

  if (minutes === 0) {
    return `${seconds} sec`;
  }

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} sec`;
}
