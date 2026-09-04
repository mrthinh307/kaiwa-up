"use client";

import type { DictationResumeResponse } from "@kaiwa-app/api-client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getInProgressDictationAttempt, startDictationAttempt } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import type { DictationPracticeContent } from "../_types/dictation-practice";

const buildPracticeHref = (attemptId: string) =>
  `/dictation/attempts/${encodeURIComponent(attemptId)}/practice`;

export function useDictationStart({ content }: { content: DictationPracticeContent }) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [inProgressAttempt, setInProgressAttempt] = useState<DictationResumeResponse | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [restoreError, setRestoreError] = useState<string>();
  const [startError, setStartError] = useState<string>();
  const [totalAttempts, setTotalAttempts] = useState(0);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setRestoreError(undefined);
    setStartError(undefined);

    try {
      const response = await protectedRequest(() =>
        getInProgressDictationAttempt({ path: { content_id: content.id } }),
      );
      if (response.data) {
        setInProgressAttempt(response.data);
        setTotalAttempts(response.data.total_attempts ?? 0);
        return;
      }

      setInProgressAttempt(null);
      const failure = parseApiFailure(response);
      if (failure.status !== 404) {
        setRestoreError(
          failure.status === undefined
            ? "The service could not check your saved attempt. Please try again."
            : failure.message,
        );
      }
    } catch {
      setRestoreError("The service could not check your saved attempt. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  }, [content.id, protectedRequest]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void handleRestore();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleRestore]);

  const handleResume = useCallback(() => {
    if (inProgressAttempt) {
      router.push(buildPracticeHref(inProgressAttempt.attempt_id));
      return;
    }

    void handleRestore();
  }, [handleRestore, inProgressAttempt, router]);

  const handleStart = useCallback(async () => {
    if (isRestoring || isStarting) {
      return;
    }

    setIsStarting(true);
    setStartError(undefined);
    setRestoreError(undefined);

    try {
      const response = await protectedRequest(() =>
        startDictationAttempt({ path: { content_id: content.id } }),
      );
      if (!response.data) {
        const failure = parseApiFailure(response);
        setStartError(failure.message);
        if (failure.code === "attempt_already_in_progress") {
          await handleRestore();
        }
        return;
      }

      router.push(buildPracticeHref(response.data.attempt_id));
    } catch {
      setStartError("We could not start this attempt. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }, [content.id, handleRestore, isRestoring, isStarting, protectedRequest, router]);

  return {
    handleRestore,
    handleResume,
    handleStart,
    inProgressAttempt,
    inProgressAttemptId: inProgressAttempt?.attempt_id,
    isRestoring,
    isStarting,
    restoreError,
    startError,
    totalAttempts,
  };
}
