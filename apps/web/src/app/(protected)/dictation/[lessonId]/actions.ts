"use server";

import type {
  DictationCheckResponse,
  DictationCompleteActionResponse,
  DictationPracticeRequest,
  DictationStartActionResponse,
} from "../_types/dictation-practice";

import {
  checkMockDictationSegment,
  completeMockDictationAttempt,
  getMockDictationAttemptReview,
  getMockDictationInProgressAttempt,
  startMockDictationAttempt,
} from "../_utils/dictation-practice-mock";

export async function getDictationInProgressAttemptAction(contentId: string) {
  const inProgressAttempt = getMockDictationInProgressAttempt(contentId);
  return { inProgressAttempt, status: "success" as const };
}

export async function startDictationAttemptAction(
  contentId: string,
): Promise<DictationStartActionResponse> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const attempt = startMockDictationAttempt(contentId);
  if (!attempt) {
    return {
      code: "content_not_found",
      message: "This Dictation lesson is no longer available.",
      status: "error",
    };
  }

  return { attempt, status: "success" };
}

export async function checkDictationSegmentAction(
  request: DictationPracticeRequest,
): Promise<DictationCheckResponse> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const result = checkMockDictationSegment(request);
  if (!result) {
    return {
      code: request.segment_index < 0 ? "invalid_segment_index" : "attempt_not_found",
      message: "This attempt or segment is no longer available. Refresh and start again.",
      status: "error",
    };
  }

  return { result, status: "success" };
}

export async function completeDictationAttemptAction(
  attemptId: string,
): Promise<DictationCompleteActionResponse> {
  await new Promise((resolve) => setTimeout(resolve, 450));

  const completion = completeMockDictationAttempt(attemptId);
  if (!completion) {
    return {
      code: "attempt_not_in_progress",
      message: "This attempt could not be completed. It may already be finished.",
      status: "error",
    };
  }

  const review = getMockDictationAttemptReview(attemptId);
  if (!review) {
    return {
      code: "attempt_not_found",
      message: "The completed attempt review is unavailable.",
      status: "error",
    };
  }

  return { completion, review, status: "success" };
}
