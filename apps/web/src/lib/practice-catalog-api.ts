import "server-only";

import type { LearningContentItem } from "@kaiwa-app/api-client";

import { client, listLearningContents } from "@kaiwa-app/api-client";

import type { JlptDifficulty } from "@/types/practice-catalog";

import { getServerApiBaseUrl } from "@/lib/server-api-base-url";

export const PRACTICE_MODES = ["shadowing", "dictation"] as const;
import { extractYouTubeVideoId } from "@/components/common/practice-catalog/practice-catalog-formatters";

export type PracticeLearningStatus = "learned" | "not_learned";

export type PracticeCatalogLesson = {
  audioDurationMs: number;
  difficulty: JlptDifficulty;
  id: string;
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
function toPracticeLesson(content: LearningContentItem): PracticeCatalogLesson {
  return {
    audioDurationMs: Math.round((content.duration_seconds ?? 0) * 1000),
    difficulty: content.difficulty,
    id: content.id,
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
