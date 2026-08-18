import type { ErrorResponse, JlptLevel } from "@kaiwa-app/api-client";

import { client } from "@/lib/api-client";

export type ReflexLessonSummary = {
  difficulty: JlptLevel;
  id: string;
  is_completed: boolean;
  title: string;
};

export type ReflexLessonList = {
  items: ReflexLessonSummary[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type ReflexLesson = {
  audio_url: string;
  id: string;
  prompt_ja: string;
  response_start_limit_seconds: number;
  scenario_ja: string;
  title: string;
};

export type ReflexEvaluation = {
  ai_feedback: {
    naturalness_evaluation: string;
    suggestions: string;
    transcribed_text: string;
  };
  ai_score: number;
  attempt_id: string;
  exp_earned: number;
  is_on_time: boolean;
  lesson_id: string;
  next_review_at: string;
  next_review_days: number;
  response_start_ms: number;
};

export type DueReview = {
  due_at: string;
  last_score: number;
  lesson_id: string;
  lesson_title: string;
};

type DueReviewList = { due_count: number; items: DueReview[] };

export async function listReflexLessons() {
  return client.get<{ 200: ReflexLessonList }, ErrorResponse>({
    url: "/api/v1/reflex/lessons",
  });
}

export async function getReflexLesson(lessonId: string) {
  return client.get<{ 200: ReflexLesson }, ErrorResponse>({
    path: { lesson_id: lessonId },
    url: "/api/v1/reflex/lessons/{lesson_id}",
  });
}

export async function listDueReviews() {
  return client.get<{ 200: DueReviewList }, ErrorResponse>({ url: "/api/v1/review/due" });
}

export async function evaluateReflexLesson(
  lessonId: string,
  audioFile: Blob,
  responseStartMs: number,
) {
  const body = new FormData();
  body.append(
    "audio_file",
    audioFile,
    `reflex-answer.${audioFile.type.includes("ogg") ? "ogg" : "webm"}`,
  );
  body.append("response_start_ms", String(responseStartMs));

  return client.post<{ 200: ReflexEvaluation }, ErrorResponse>({
    body,
    headers: { "Content-Type": null },
    path: { lesson_id: lessonId },
    url: "/api/v1/reflex/lessons/{lesson_id}/evaluate",
  });
}
