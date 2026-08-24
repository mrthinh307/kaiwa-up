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

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(audioUrl: string | null | undefined): string | null {
  if (!audioUrl) {
    return null;
  }

  try {
    const url = new URL(audioUrl);
    const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}
