"use client";

import type {
  DictationAttemptPracticeResponse,
  DictationResumeResponse,
  DictationSegmentCheckResponse,
} from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  checkDictationSegment,
  completeDictationAttempt,
  getDictationAttemptPractice,
  restartDictationAttempt,
} from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import type { DictationPracticeContent } from "../_types/dictation-practice";

import { buildDictationPracticeHref } from "../_utils/dictation-routes";

type UseDictationPracticeProps = {
  attemptId: string;
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
};

export function useDictationPractice({
  attemptId,
  onAttemptCompleted,
  onAttemptNotInProgress,
}: UseDictationPracticeProps) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [attempt, setAttempt] = useState<DictationResumeResponse>();
  const [content, setContent] = useState<DictationPracticeContent>();
  const [completeError, setCompleteError] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const [playedSegments, setPlayedSegments] = useState<Set<number>>(() => new Set());
  const [results, setResults] = useState<Record<number, DictationSegmentCheckResponse>>({});
  const [restartError, setRestartError] = useState<string>();
  const [restoreError, setRestoreError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const activeSegment = attempt?.segments.at(activeSegmentIndex);
  const activePrompt = activeSegment
    ? content?.prompts.find((prompt) => prompt.blank_index === activeSegment.segment_index + 1)
    : undefined;
  const activeAnswer = activeSegment ? (answers[activeSegment.segment_index] ?? "") : "";
  const storedResult = activeSegment ? results[activeSegment.segment_index] : undefined;
  const activeResult = storedResult?.user_answer === activeAnswer ? storedResult : undefined;

  const validResults = useMemo(
    () =>
      Object.values(results).filter(
        (result) => answers[result.segment_index] === result.user_answer,
      ),
    [answers, results],
  );
  const checkedCount = validResults.length;
  const correctCount = validResults.filter((result) => result.is_correct).length;
  const storedResultCount = Object.keys(results).length;
  const draftCount = Object.values(results).filter(
    (result) => answers[result.segment_index] !== result.user_answer,
  ).length;
  const isSessionReviewed = Boolean(attempt && checkedCount === attempt.total_segments);

  const hydrateAttempt = useCallback((response: DictationResumeResponse) => {
    const restoredAnswers: Record<number, string> = {};
    const restoredResults: Record<number, DictationSegmentCheckResponse> = {};
    for (const result of response.checked_segments ?? []) {
      restoredAnswers[result.segment_index] = result.user_answer;
      restoredResults[result.segment_index] = result;
    }
    const firstUncheckedPosition = response.segments.findIndex(
      (segment) => restoredResults[segment.segment_index] === undefined,
    );

    setActiveSegmentIndex(firstUncheckedPosition >= 0 ? firstUncheckedPosition : 0);
    setAnswers(restoredAnswers);
    setAttempt(response);
    setCompleteError(undefined);
    setPlayedSegments(new Set());
    setPlaybackRequest(0);
    setResults(restoredResults);
    setSubmitError(undefined);
  }, []);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setRestoreError(undefined);
    setAttempt(undefined);
    setContent(undefined);

    try {
      const response = await protectedRequest(() =>
        getDictationAttemptPractice({ path: { attempt_id: attemptId } }),
      );
      if (response.data) {
        const practiceResponse: DictationAttemptPracticeResponse = response.data;
        setContent(practiceResponse.content);
        hydrateAttempt(practiceResponse.attempt);
        return;
      }

      const failure = parseApiFailure(response);
      if (failure.code === "dictation_attempt_not_in_progress") {
        onAttemptNotInProgress();
        return;
      }

      setRestoreError(
        failure.status === undefined
          ? "The service could not load this saved attempt. Please try again."
          : failure.status === 403 || failure.status === 404
            ? "This Dictation attempt is unavailable. Return to the lesson library and try again."
            : failure.message,
      );
    } catch {
      setRestoreError("The service could not load this saved attempt. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  }, [attemptId, hydrateAttempt, onAttemptNotInProgress, protectedRequest]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void handleRestore();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleRestore]);

  useEffect(() => {
    if (!attempt) {
      return;
    }

    document.getElementById("dictation-segment-answer")?.focus({ preventScroll: true });
  }, [activeSegmentIndex, attempt]);

  const handleReplay = useCallback(() => {
    if (activeSegment) {
      setPlayedSegments((currentSegments) => {
        if (currentSegments.has(activeSegment.segment_index)) {
          return currentSegments;
        }

        const nextSegments = new Set(currentSegments);
        nextSegments.add(activeSegment.segment_index);
        return nextSegments;
      });
    }

    setPlaybackRequest((current) => current + 1);
  }, [activeSegment]);

  const handleAnswerChange = (value: string) => {
    if (!activeSegment) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [activeSegment.segment_index]: value,
    }));
    setSubmitError(undefined);
    setCompleteError(undefined);
  };

  const selectSegment = (segmentIndex: number) => {
    if (!attempt) {
      return;
    }

    const nextPosition = attempt.segments.findIndex(
      (segment) => segment.segment_index === segmentIndex,
    );
    if (nextPosition < 0 || isChecking) {
      return;
    }

    setActiveSegmentIndex(nextPosition);
    setSubmitError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attempt || !activeSegment || !activeAnswer.trim() || isChecking) {
      if (attempt && activeSegment && !activeAnswer.trim()) {
        setSubmitError("Type the Japanese sentence you hear before checking this segment.");
      }
      return;
    }

    setIsChecking(true);
    setSubmitError(undefined);

    try {
      const response = await protectedRequest(() =>
        checkDictationSegment({
          body: {
            attempt_id: attempt.attempt_id,
            segment_index: activeSegment.segment_index,
            user_answer: activeAnswer,
          },
        }),
      );

      if (!response.data) {
        const failure = parseApiFailure(response);
        if (failure.code === "dictation_attempt_not_in_progress") {
          onAttemptNotInProgress();
        } else {
          setSubmitError(failure.message);
        }
        return;
      }

      setResults((currentResults) => ({
        ...currentResults,
        [response.data.segment_index]: response.data,
      }));
      window.requestAnimationFrame(() => {
        const feedback = document.getElementById("dictation-segment-feedback");
        feedback?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        feedback?.focus({ preventScroll: true });
      });
    } catch {
      setSubmitError("We could not check this segment. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = async () => {
    if (!attempt || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setCompleteError(undefined);

    try {
      const response = await protectedRequest(() =>
        completeDictationAttempt({ body: { attempt_id: attempt.attempt_id } }),
      );
      if (!response.data) {
        const failure = parseApiFailure(response);
        if (failure.code === "dictation_attempt_not_in_progress") {
          onAttemptNotInProgress();
        } else {
          setCompleteError(
            failure.status === undefined
              ? "The service could not complete this attempt. Your checked answers are still saved; try again."
              : failure.message,
          );
        }
        return;
      }

      onAttemptCompleted(response.data.attempt_id);
    } catch {
      setCompleteError(
        "The service could not complete this attempt. Your checked answers are still saved; try again.",
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleRestart = async () => {
    if (!attempt || isRestarting || isCompleting) {
      return;
    }

    setIsRestarting(true);
    setRestartError(undefined);

    try {
      const response = await protectedRequest(() =>
        restartDictationAttempt({ path: { attempt_id: attempt.attempt_id } }),
      );
      if (!response.data) {
        const failure = parseApiFailure(response);
        if (failure.code === "dictation_attempt_not_in_progress") {
          onAttemptNotInProgress();
        } else {
          setRestartError(
            failure.status === undefined
              ? "The service could not restart this attempt. Please try again."
              : failure.message,
          );
        }
        return;
      }

      router.replace(buildDictationPracticeHref(response.data.attempt_id));
    } catch {
      setRestartError("The service could not restart this attempt. Please try again.");
    } finally {
      setIsRestarting(false);
    }
  };

  return {
    activeAnswer,
    activePrompt,
    activeResult,
    activeSegment,
    activeSegmentIndex,
    answers,
    attempt,
    checkedCount,
    completeError,
    content,
    correctCount,
    draftCount,
    handleAnswerChange,
    handleComplete,
    handleNext: () => {
      if (activeSegment) {
        selectSegment(activeSegment.segment_index + 1);
      }
    },
    handlePrevious: () => {
      if (activeSegment) {
        selectSegment(activeSegment.segment_index - 1);
      }
    },
    handleRestart,
    hasPlayedActiveSegment: activeSegment ? playedSegments.has(activeSegment.segment_index) : false,
    handleReplay,
    handleRestore,
    handleSubmit,
    isChecking,
    isCompleting,
    isRestarting,
    isRestoring,
    isSessionReviewed,
    playbackRequest,
    restartError,
    results,
    restoreError,
    selectSegment,
    storedResultCount,
    submitError,
  };
}
