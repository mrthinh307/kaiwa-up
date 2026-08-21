import "server-only";

import type {
  LearningContentDetail,
  LearningContentItem,
  TranslationLessonDetail,
  TranslationLessonItem,
} from "@kaiwa-app/api-client";

import { client, getLearningContent, listLearningContents } from "@kaiwa-app/api-client";
import { connection } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const CATALOG_PAGE_SIZE = 20;

function configureServerClient(): void {
  client.setConfig({ baseUrl: API_BASE_URL });
}

export async function listListeningTranslationLessons(): Promise<TranslationLessonItem[]> {
  await connection();
  configureServerClient();
  const result = await listLearningContents({
    query: { page: 1, page_size: CATALOG_PAGE_SIZE, type: "listening_translation" },
  });

  if (!result.data) {
    throw new Error(
      `Listening Translation catalog request failed with status ${result.response?.status ?? "unknown"}`,
    );
  }

  return result.data.items.flatMap((lesson): TranslationLessonItem[] => {
    if (lesson.content_type !== "listening_translation" || !lesson.audio_url) {
      return [];
    }

    return [toTranslationLesson(lesson)];
  });
}

export async function getListeningTranslationLesson(
  lessonId: string,
): Promise<TranslationLessonDetail | null> {
  await connection();
  configureServerClient();
  const result = await getLearningContent({ path: { content_id: lessonId } });

  if (result.response?.status === 404) {
    return null;
  }

  if (!result.data) {
    throw new Error(
      `Listening Translation lesson request failed with status ${result.response?.status ?? "unknown"}`,
    );
  }

  if (result.data.content_type !== "listening_translation" || !result.data.audio_url) {
    return null;
  }

  return toTranslationLesson(result.data);
}

function toTranslationLesson(
  lesson: LearningContentDetail | LearningContentItem,
): TranslationLessonDetail {
  if (!lesson.audio_url) {
    throw new Error("Listening Translation lesson audio is unavailable.");
  }

  return {
    audio_url: lesson.audio_url,
    description: lesson.description,
    difficulty: lesson.difficulty,
    duration_seconds: lesson.duration_seconds,
    id: lesson.id,
    is_completed: false,
    title: lesson.title,
    topic: lesson.topic,
  };
}
