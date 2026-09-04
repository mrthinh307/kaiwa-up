"use client";

import type {
  DictationAttemptReviewResponse,
  DictationCompleteResponse,
  DictationStartResponse,
} from "@kaiwa-app/api-client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getDictationAttempt, startDictationAttempt } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import {
  DICTATION_CELEBRATION_STORAGE_PREFIX,
  buildDictationPracticeHref,
} from "../_utils/dictation-routes";
import { DictationResult } from "./dictation-result";

function readAndConsumeCelebration(attemptId: string): boolean {
  try {
    const key = `${DICTATION_CELEBRATION_STORAGE_PREFIX}${attemptId}`;
    const shouldCelebrate = window.sessionStorage.getItem(key) === "1";
    if (shouldCelebrate) {
      window.sessionStorage.removeItem(key);
    }
    return shouldCelebrate;
  } catch {
    return false;
  }
}

function buildAttempt(result: DictationAttemptReviewResponse): DictationStartResponse {
  return {
    attempt_id: result.attempt_id,
    content_id: result.content.id,
    attempt_number: result.attempt_number,
    audio_url: result.content.audio_url ?? "",
    total_segments: result.total_count,
    segments: result.segments,
  };
}

function buildCompletion(result: DictationAttemptReviewResponse): DictationCompleteResponse {
  return {
    attempt_id: result.attempt_id,
    status: result.status,
    score: result.score ?? 0,
    correct_count: result.correct_count,
    total_count: result.total_count,
    earned_exp: result.earned_exp,
    completed_at: result.completed_at ?? new Date(0).toISOString(),
  };
}

export function DictationResultRoute({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [result, setResult] = useState<DictationAttemptReviewResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [startError, setStartError] = useState<string>();

  const loadResult = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const response = await protectedRequest(() =>
        getDictationAttempt({ path: { attempt_id: attemptId } }),
      );
      if (!response.data) {
        const failure = parseApiFailure(response);
        setErrorMessage(
          failure.status === 403 || failure.status === 404
            ? "This Dictation result is unavailable. Return to the lesson library and try again."
            : failure.message,
        );
        return;
      }

      if (response.data.status === "in_progress") {
        setIsRedirecting(true);
        router.replace(buildDictationPracticeHref(attemptId));
        return;
      }

      setResult(response.data);
      setShouldCelebrate(readAndConsumeCelebration(attemptId));
    } catch {
      setErrorMessage("The Dictation result could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, protectedRequest, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResult();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadResult]);

  const handleTryAgain = useCallback(async () => {
    if (!result || isStarting) {
      return;
    }

    setIsStarting(true);
    setStartError(undefined);

    try {
      const response = await protectedRequest(() =>
        startDictationAttempt({ path: { content_id: result.content.id } }),
      );
      if (!response.data) {
        setStartError(parseApiFailure(response).message);
        return;
      }

      router.push(buildDictationPracticeHref(response.data.attempt_id));
    } catch {
      setStartError("We could not start another attempt. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, protectedRequest, result, router]);

  if (isLoading || isRedirecting) {
    return (
      <div
        aria-busy="true"
        className="flex min-h-[calc(100dvh-70px-3rem)] items-center justify-center sm:min-h-[calc(100dvh-70px-4rem)] lg:min-h-[calc(100dvh-70px-5rem)]"
        role="status"
      >
        <span className="sr-only">Loading Dictation result...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Alert variant="destructive">
          <AlertTitle>Unable to load this result</AlertTitle>
          <AlertDescription>{errorMessage ?? "The result is unavailable."}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button disabled={isLoading} onClick={() => void loadResult()} type="button">
            Try again
          </Button>
          <Button onClick={() => router.push("/lessons")} type="button" variant="neutral">
            Back to lessons
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DictationResult
      attempt={buildAttempt(result)}
      completion={buildCompletion(result)}
      content={result.content}
      isStarting={isStarting}
      onTryAgain={() => void handleTryAgain()}
      review={result}
      shouldCelebrate={shouldCelebrate}
      startError={startError}
    />
  );
}
