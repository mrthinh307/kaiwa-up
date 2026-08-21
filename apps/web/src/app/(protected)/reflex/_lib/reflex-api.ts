import type {
  DueReviewItem,
  ReflexEvaluationResponse,
  ReflexLessonDetail,
  ReflexLessonListResponse,
} from "@kaiwa-app/api-client";

import {
  evaluateReflexLesson as evaluateReflexLessonRequest,
  getReflexLesson as getReflexLessonRequest,
  listDueReviews as listDueReviewsRequest,
  listReflexLessons as listReflexLessonsRequest,
} from "@/lib/api-client";

export type DueReview = DueReviewItem;
export type ReflexEvaluation = ReflexEvaluationResponse;
export type ReflexLesson = ReflexLessonDetail;
export type ReflexLessonList = ReflexLessonListResponse;

export function listReflexLessons() {
  return listReflexLessonsRequest();
}

export function getReflexLesson(lessonId: string) {
  return getReflexLessonRequest({ path: { lesson_id: lessonId } });
}

export function listDueReviews() {
  return listDueReviewsRequest();
}

export function evaluateReflexLesson(lessonId: string, audioFile: File, responseStartMs: number) {
  return evaluateReflexLessonRequest({
    body: { audio_file: audioFile, response_start_ms: responseStartMs },
    path: { lesson_id: lessonId },
  });
}
