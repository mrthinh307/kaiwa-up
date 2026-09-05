"use client";

import type { TranslationLessonDetail } from "@kaiwa-app/api-client";

import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { parseApiFailure } from "@/lib/api-errors";

import type { TranslationEvaluationViewModel } from "../../_lib/listening-translation-client";

import {
  parseTranslationEvaluation,
  requestListeningTranslationLesson,
  requestTranslationSubmission,
} from "../../_lib/listening-translation-client";

const MAX_TRANSLATION_LENGTH = 2_000;

export function useTranslationPractice(initialLesson: TranslationLessonDetail) {
  const { protectedRequest } = useAuth();
  const [completion, setCompletion] = useState<TranslationEvaluationViewModel | null>(null);
  const [detailSyncError, setDetailSyncError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStoredCompletion, setIsStoredCompletion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lesson, setLesson] = useState(initialLesson);
  const [submittedTranslation, setSubmittedTranslation] = useState("");
  const [translation, setTranslation] = useState("");
  const trimmedTranslation = translation.trim();
  const isTranslationEmpty = trimmedTranslation.length === 0;

  useEffect(() => {
    let isActive = true;

    void protectedRequest(() => requestListeningTranslationLesson(initialLesson.id))
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.data) {
          setLesson(result.data);
          setDetailSyncError(null);
          return;
        }

        setDetailSyncError(parseApiFailure(result).message);
      })
      .catch(() => {
        if (isActive) {
          setDetailSyncError("We could not refresh this lesson from your account.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [initialLesson.id, protectedRequest]);

  const handleTranslationChange = (nextTranslation: string) => {
    setTranslation(nextTranslation);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isTranslationEmpty || isSubmitting || completion) {
      if (isTranslationEmpty) {
        setErrorMessage("Enter a Vietnamese translation before submitting.");
      }
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    const wasAlreadyCompleted = lesson.is_completed;

    try {
      const result = await protectedRequest(() =>
        requestTranslationSubmission(lesson.id, trimmedTranslation),
      );

      if (!result.data) {
        setErrorMessage(parseApiFailure(result).message);
        return;
      }

      const parsedCompletion = parseTranslationEvaluation(result.data);
      if (!parsedCompletion) {
        setErrorMessage(
          "The evaluation request returned an unexpected response. Your translation is still available; check your progress before submitting it again.",
        );
        return;
      }

      setCompletion(parsedCompletion);
      setIsStoredCompletion(wasAlreadyCompleted);
      setLesson((currentLesson) => ({ ...currentLesson, is_completed: true }));
      setSubmittedTranslation(trimmedTranslation);
    } catch {
      setErrorMessage(
        "We could not reach the evaluation service. Your translation is still available so you can try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    completion,
    detailSyncError,
    errorMessage,
    handleSubmit,
    handleTranslationChange,
    isStoredCompletion,
    isSubmitting,
    isTranslationEmpty,
    lesson,
    submittedTranslation,
    translation,
    translationLength: translation.length,
  };
}

export { MAX_TRANSLATION_LENGTH };
