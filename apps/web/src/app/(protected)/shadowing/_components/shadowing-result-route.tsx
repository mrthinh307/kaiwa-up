"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getShadowingAttemptReview } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import {
  SHADOWING_CELEBRATION_STORAGE_PREFIX,
  buildShadowingLessonHref,
  buildShadowingPracticeHref,
} from "../_utils/shadowing-routes";
import { ShadowingResult } from "./shadowing-result";

function readAndConsumeCelebration(attemptId: string): boolean {
  try {
    const key = `${SHADOWING_CELEBRATION_STORAGE_PREFIX}${attemptId}`;
    const shouldCelebrate = window.sessionStorage.getItem(key) === "1";
    if (shouldCelebrate) {
      window.sessionStorage.removeItem(key);
    }
    return shouldCelebrate;
  } catch {
    return false;
  }
}

export function ShadowingResultRoute({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [review, setReview] = useState<ShadowingAttemptReviewResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadResult = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const response = await protectedRequest(() =>
        getShadowingAttemptReview({ path: { attempt_id: attemptId } }),
      );
      if (!response.data) {
        const failure = parseApiFailure(response);
        setErrorMessage(
          failure.status === 403 || failure.status === 404
            ? "This Shadowing result is unavailable. Return to the lesson library and try again."
            : failure.message,
        );
        return;
      }

      if (response.data.status === "in_progress") {
        setIsRedirecting(true);
        router.replace(buildShadowingPracticeHref(attemptId));
        return;
      }

      setReview(response.data);
      setShouldCelebrate(readAndConsumeCelebration(attemptId));
    } catch {
      setErrorMessage("The Shadowing result could not be loaded. Please try again.");
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

  if (isLoading || isRedirecting) {
    return (
      <div
        aria-busy="true"
        className="flex min-h-[calc(100dvh-70px-3rem)] items-center justify-center sm:min-h-[calc(100dvh-70px-4rem)] lg:min-h-[calc(100dvh-70px-5rem)]"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
        <span className="sr-only">Loading Shadowing result...</span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to load this result</AlertTitle>
          <AlertDescription>{errorMessage ?? "The result is unavailable."}</AlertDescription>
        </Alert>
        <Button disabled={isLoading} onClick={() => void loadResult()} type="button">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ShadowingResult
      onPracticeAgain={() => router.push(buildShadowingLessonHref(review.content_id))}
      review={review}
      shouldCelebrate={shouldCelebrate}
    />
  );
}
