"use client";

import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
  DictationSegmentCheckResponse,
  DictationStartResponse,
} from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  DictationInProgressInfo,
  DictationPracticeContent,
} from "../_types/dictation-practice";

import {
  checkDictationSegmentAction,
  completeDictationAttemptAction,
  getDictationInProgressAttemptAction,
  startDictationAttemptAction,
} from "../[lessonId]/actions";

type UseDictationPracticeProps = {
  content: DictationPracticeContent;
};

export function useDictationPractice({ content }: UseDictationPracticeProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [attempt, setAttempt] = useState<DictationStartResponse>();
  const [completeError, setCompleteError] = useState<string>();
  const [completion, setCompletion] = useState<DictationCompleteResponse>();
  const [inProgressInfo, setInProgressInfo] = useState<DictationInProgressInfo>();
  const [isChecking, setIsChecking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const [playedSegments, setPlayedSegments] = useState<Set<number>>(() => new Set());
  const [results, setResults] = useState<Record<number, DictationSegmentCheckResponse>>({});
  const [review, setReview] = useState<DictationAttemptReviewResponse>();
  const [startError, setStartError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    void getDictationInProgressAttemptAction(content.id).then((response) => {
      if (isMounted && response.inProgressAttempt) {
        setInProgressInfo(response.inProgressAttempt);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [content.id]);

  const activeSegment = attempt?.segments.at(activeSegmentIndex);
  const activePrompt = activeSegment
    ? content.prompts.find((prompt) => prompt.blank_index === activeSegment.segment_index + 1)
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

  const scrollToPracticeStart = useCallback(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("dictation-practice-screen")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

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

  const handleResume = () => {
    if (!inProgressInfo) {
      return;
    }

    const previousAnswers: Record<number, string> = {};
    for (const result of Object.values(inProgressInfo.results)) {
      previousAnswers[result.segment_index] = result.user_answer;
    }

    const firstUnfinishedIndex = inProgressInfo.attempt.segments.findIndex(
      (segment) => !inProgressInfo.results[segment.segment_index]?.is_correct,
    );

    setActiveSegmentIndex(firstUnfinishedIndex >= 0 ? firstUnfinishedIndex : 0);
    setAnswers(previousAnswers);
    setAttempt(inProgressInfo.attempt);
    setPlayedSegments(new Set());
    setResults(inProgressInfo.results);
    setPlaybackRequest(0);
    setCompleteError(undefined);
    setCompletion(undefined);
    setReview(undefined);
    setSubmitError(undefined);
    scrollToPracticeStart();
  };

  const handleStart = async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    setStartError(undefined);

    try {
      const response = await startDictationAttemptAction(content.id);
      if (response.status === "error") {
        setStartError(response.message);
        return;
      }

      setActiveSegmentIndex(0);
      setAnswers({});
      setAttempt(response.attempt);
      setPlayedSegments(new Set());
      setPlaybackRequest(0);
      setCompleteError(undefined);
      setCompletion(undefined);
      setInProgressInfo(undefined);
      setResults({});
      setReview(undefined);
      setSubmitError(undefined);
      scrollToPracticeStart();
    } catch {
      setStartError("We could not start this attempt. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

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
      const response = await checkDictationSegmentAction({
        attempt_id: attempt.attempt_id,
        segment_index: activeSegment.segment_index,
        user_answer: activeAnswer,
      });

      if (response.status === "error") {
        setSubmitError(response.message);
        return;
      }

      setResults((currentResults) => ({
        ...currentResults,
        [response.result.segment_index]: response.result,
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
      const response = await completeDictationAttemptAction(attempt.attempt_id);
      if (response.status === "error") {
        setCompleteError(response.message);
        return;
      }

      setCompletion(response.completion);
      setReview(response.review);
    } catch {
      setCompleteError("We could not complete this attempt. Please try again.");
    } finally {
      setIsCompleting(false);
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
    completion,
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
    hasPlayedActiveSegment: activeSegment ? playedSegments.has(activeSegment.segment_index) : false,
    handleReplay,
    handleResume,
    handleStart,
    handleSubmit,
    inProgressInfo,
    isChecking,
    isCompleting,
    isSessionReviewed,
    isStarting,
    playbackRequest,
    results,
    review,
    selectSegment,
    startError,
    storedResultCount,
    submitError,
  };
}
