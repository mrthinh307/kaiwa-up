"use server";

import type { DictationAnswerInput, DictationSubmitResponse } from "../_types/dictation-practice";

import {
  getDictationPracticeLesson,
  gradeDictationAttempt,
} from "../_utils/dictation-practice-mock";

export async function submitDictationAttempt({
  answers,
  lessonId,
}: {
  answers: DictationAnswerInput[];
  lessonId: string;
}): Promise<DictationSubmitResponse> {
  const lesson = getDictationPracticeLesson(lessonId);

  if (!lesson) {
    return {
      fieldErrors: {},
      message: "This Dictation lesson is no longer available.",
      status: "error",
    };
  }

  const answersByIndex = new Map(
    answers.map((answer) => [answer.blankIndex, answer.userAnswer] as const),
  );
  const fieldErrors = Object.fromEntries(
    lesson.blanks.flatMap((blank) =>
      answersByIndex.get(blank.blankIndex)?.trim()
        ? []
        : [[blank.blankIndex, "Enter an answer before submitting."]],
    ),
  );

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Complete every blank before checking your answers.",
      status: "error",
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  const result = gradeDictationAttempt(lessonId, answers);

  if (!result) {
    return {
      fieldErrors: {},
      message: "We could not check this attempt. Please try again.",
      status: "error",
    };
  }

  return { result, status: "success" };
}
