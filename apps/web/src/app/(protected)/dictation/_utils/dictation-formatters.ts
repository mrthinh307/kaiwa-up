export function formatDictationDuration(durationSeconds: number): string {
  const roundedSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDictationTimestamp(timeMs: number): string {
  const minutes = Math.floor(timeMs / 60_000);
  const seconds = Math.floor((timeMs % 60_000) / 1_000);
  const milliseconds = timeMs % 1_000;

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

export function getYouTubeVideoId(audioUrl: string): string | undefined {
  try {
    const url = new URL(audioUrl);
    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean).at(0);
    }

    if (url.hostname.endsWith("youtube.com")) {
      return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1);
    }
  } catch {
    return undefined;
  }

  return undefined;
}
