"use client";

import type { ShadowingAttemptPracticeResponse } from "@kaiwa-app/api-client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getShadowingAttemptPractice } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import {
  SHADOWING_CELEBRATION_STORAGE_PREFIX,
  buildShadowingResultHref,
} from "../_utils/shadowing-routes";
import { ShadowingPracticeScreen } from "./shadowing-practice-screen";

function markShadowingAttemptForCelebration(attemptId: string): void {
  try {
    window.sessionStorage.setItem(`${SHADOWING_CELEBRATION_STORAGE_PREFIX}${attemptId}`, "1");
  } catch {
    // The result remains usable when sessionStorage is unavailable.
  }
}

export function ShadowingPracticeRoute({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [practice, setPractice] = useState<ShadowingAttemptPracticeResponse>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleAttemptNotInProgress = useCallback(() => {
    setIsRedirecting(true);
    router.replace(buildShadowingResultHref(attemptId));
  }, [attemptId, router]);

  const loadPractice = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const response = await protectedRequest(() =>
        getShadowingAttemptPractice({ path: { attempt_id: attemptId } }),
      );
      if (response.data) {
        setPractice(response.data);
        return;
      }

      const failure = parseApiFailure(response);
      if (failure.code === "shadowing_attempt_not_in_progress") {
        handleAttemptNotInProgress();
        return;
      }

      setErrorMessage(
        failure.status === 403 || failure.status === 404
          ? "This Shadowing attempt is unavailable. Return to the lesson library and try again."
          : failure.message,
      );
    } catch {
      setErrorMessage("The Shadowing attempt could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, handleAttemptNotInProgress, protectedRequest]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPractice();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPractice]);

  const handleCompleted = useCallback(
    (completedAttemptId: string) => {
      markShadowingAttemptForCelebration(completedAttemptId);
      router.replace(buildShadowingResultHref(completedAttemptId));
    },
    [router],
  );

  if (isLoading || isRedirecting) {
    return (
      <div
        aria-busy="true"
        className="flex min-h-[calc(100dvh-70px-3rem)] items-center justify-center sm:min-h-[calc(100dvh-70px-4rem)] lg:min-h-[calc(100dvh-70px-5rem)]"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
        <span className="sr-only">Loading Shadowing practice...</span>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to load this attempt</AlertTitle>
          <AlertDescription>{errorMessage ?? "The attempt is unavailable."}</AlertDescription>
        </Alert>
        <Button disabled={isLoading} onClick={() => void loadPractice()} type="button">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ShadowingPracticeScreen
      key={practice.attempt.attempt_id}
      onAttemptCompleted={handleCompleted}
      onAttemptNotInProgress={handleAttemptNotInProgress}
      practice={practice}
    />
  );
}
