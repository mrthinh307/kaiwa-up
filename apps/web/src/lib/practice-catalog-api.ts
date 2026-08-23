import "server-only";

import type { LearningContentItem } from "@kaiwa-app/api-client";

import { client, listLearningContents } from "@kaiwa-app/api-client";

import type { JlptDifficulty } from "@/types/practice-catalog";

import { getServerApiBaseUrl } from "@/lib/server-api-base-url";

export const PRACTICE_MODES = ["shadowing", "dictation"] as const;

export type PracticeMode = (typeof PRACTICE_MODES)[number];
export type PracticeLearningStatus = "learned" | "not_learned";

export type LessonModeProgress = {
  attemptCount: number;
  mode: PracticeMode;
};

export type PracticeCatalogLesson = {
  audioDurationMs: number;
  difficulty: JlptDifficulty;
  id: string;
  modes: LessonModeProgress[];
  shortDescription: string;
  title: string;
  topic: string;
  youtubeVideoId: string | null;
};

export type PracticeCatalogViewModel = {
  items: PracticeCatalogLesson[];
  page: number;
  pageSize: number;
  pages: number;
  total: number;
};

type PracticeCatalogQuery = {
  difficulty?: JlptDifficulty;
  learningStatus?: PracticeLearningStatus;
  page: number;
  searchQuery?: string;
  topic?: string;
};

const PAGE_SIZE = 9;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function extractYouTubeVideoId(audioUrl: string | null | undefined): string | null {
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

function toPracticeLesson(content: LearningContentItem): PracticeCatalogLesson {
  return {
    audioDurationMs: Math.round((content.duration_seconds ?? 0) * 1000),
    difficulty: content.difficulty,
    id: content.id,
    modes: PRACTICE_MODES.map((mode) => ({ attemptCount: 0, mode })),
    shortDescription:
      content.description ?? "Practice Japanese listening with timestamped video captions.",
    title: content.title,
    topic: content.topic ?? "Japanese listening",
    youtubeVideoId: extractYouTubeVideoId(content.audio_url),
  };
}

export async function getPracticeCatalogFromApi({
  difficulty,
  learningStatus,
  page,
  searchQuery,
  topic,
}: PracticeCatalogQuery): Promise<{
  catalog: PracticeCatalogViewModel;
  topics: string[];
}> {
  client.setConfig({
    baseUrl: getServerApiBaseUrl(),
  });

  const result = await listLearningContents({
    query: { page: 1, page_size: 100, type: "shadowing_dictation" },
  });
  if (!result.data) {
    throw new Error(
      `Learning content API failed with status ${result.response?.status ?? "unknown"}`,
    );
  }

  const lessons = result.data.items.map(toPracticeLesson);
  const topics = [...new Set(lessons.map((lesson) => lesson.topic))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const normalizedSearchQuery = searchQuery?.toLocaleLowerCase("en");
  const normalizedTopic = topic?.toLocaleLowerCase("en");
  const filteredLessons = lessons.filter(
    (lesson) =>
      (!difficulty || lesson.difficulty === difficulty) &&
      (!normalizedTopic || lesson.topic.toLocaleLowerCase("en") === normalizedTopic) &&
      (!normalizedSearchQuery ||
        lesson.title.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        lesson.topic.toLocaleLowerCase("en").includes(normalizedSearchQuery) ||
        lesson.shortDescription.toLocaleLowerCase("en").includes(normalizedSearchQuery)) &&
      (!learningStatus || learningStatus === "not_learned"),
  );
  const total = filteredLessons.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const safePage = pages === 0 ? 1 : Math.min(Math.max(page, 1), pages);
  const startIndex = (safePage - 1) * PAGE_SIZE;

  return {
    catalog: {
      items: filteredLessons.slice(startIndex, startIndex + PAGE_SIZE),
      page: safePage,
      pageSize: PAGE_SIZE,
      pages,
      total,
    },
    topics,
  };
}
