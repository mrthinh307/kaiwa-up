"use client";

import {
  getListeningTranslationLesson,
  listListeningTranslationLessons,
  submitListeningTranslation,
} from "@/lib/api-client";

export type TranslationEvaluationViewModel = {
  attemptId: string;
  coveredIdeas: string[];
  evaluationId: string;
  expEarned: number;
  feedback: string;
  isAcceptable: boolean;
  missingIdeas: string[];
  referenceTranslationVi: string;
  score: number;
  status: string;
  suggestions: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseTranslationEvaluation(value: unknown): TranslationEvaluationViewModel | null {
  if (!isRecord(value)) {
    return null;
  }

  const attemptId = value.attempt_id;
  const coveredIdeas = value.covered_ideas;
  const evaluationId = value.evaluation_id;
  const expEarned = value.exp_earned;
  const feedback = value.feedback;
  const isAcceptable = value.is_acceptable;
  const missingIdeas = value.missing_ideas;
  const referenceTranslationVi = value.reference_translation_vi;
  const score = value.score;
  const status = value.status;
  const suggestions = value.suggestions;

  if (
    typeof attemptId !== "string" ||
    !isStringArray(coveredIdeas) ||
    typeof evaluationId !== "string" ||
    typeof expEarned !== "number" ||
    !Number.isFinite(expEarned) ||
    expEarned < 0 ||
    typeof feedback !== "string" ||
    typeof isAcceptable !== "boolean" ||
    !isStringArray(missingIdeas) ||
    typeof referenceTranslationVi !== "string" ||
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100 ||
    typeof status !== "string" ||
    !isStringArray(suggestions)
  ) {
    return null;
  }

  return {
    attemptId,
    coveredIdeas,
    evaluationId,
    expEarned,
    feedback,
    isAcceptable,
    missingIdeas,
    referenceTranslationVi,
    score,
    status,
    suggestions,
  };
}

export function requestListeningTranslationLessons() {
  return listListeningTranslationLessons({ query: { page: 1, page_size: 20 } });
}

export function requestListeningTranslationLesson(lessonId: string) {
  return getListeningTranslationLesson({ path: { lesson_id: lessonId } });
}

export function requestTranslationSubmission(lessonId: string, translationVi: string) {
  return submitListeningTranslation({
    body: { translation_vi: translationVi },
    path: { lesson_id: lessonId },
  });
}
