"use client";

import type {
  ShadowingContentDetail,
  ShadowingMode,
  ShadowingResumeResponse,
} from "@kaiwa-app/api-client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getInProgressShadowingAttempt, startShadowingAttempt } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import { buildShadowingPracticeHref } from "../_utils/shadowing-routes";
import { ShadowingStartPanel } from "./shadowing-start-panel";

export function ShadowingStartScreen({ lesson }: { lesson: ShadowingContentDetail }) {
  const router = useRouter();
  const { protectedRequest } = useAuth();
  const [inProgressAttempt, setInProgressAttempt] = useState<ShadowingResumeResponse | null>(null);
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
        getInProgressShadowingAttempt({ path: { content_id: lesson.id } }),
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
  }, [lesson.id, protectedRequest]);

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
      router.push(buildShadowingPracticeHref(inProgressAttempt.attempt_id));
      return;
    }

    void handleRestore();
  }, [handleRestore, inProgressAttempt, router]);

  const handleStart = useCallback(
    async (mode: ShadowingMode) => {
      if (isRestoring || isStarting) return;

      setIsStarting(true);
      setStartError(undefined);
      setRestoreError(undefined);

      try {
        const response = await protectedRequest(() =>
          startShadowingAttempt({
            body: { mode },
            path: { content_id: lesson.id },
          }),
        );
        if (!response.data) {
          const failure = parseApiFailure(response);
          setStartError(failure.message);
          if (failure.code === "attempt_already_in_progress") {
            await handleRestore();
          }
          return;
        }

        router.push(buildShadowingPracticeHref(response.data.attempt_id));
      } catch {
        setStartError("We could not start this attempt. Please try again.");
      } finally {
        setIsStarting(false);
      }
    },
    [handleRestore, isRestoring, isStarting, lesson.id, protectedRequest, router],
  );

  return (
    <ShadowingStartPanel
      inProgressAttempt={inProgressAttempt}
      isRestoring={isRestoring}
      isStarting={isStarting}
      lesson={lesson}
      onRestore={() => void handleRestore()}
      onResume={handleResume}
      onStart={(mode) => void handleStart(mode)}
      restoreError={restoreError}
      startError={startError}
      totalAttempts={totalAttempts}
    />
  );
}
