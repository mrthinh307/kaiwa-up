"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import {
  DICTATION_CELEBRATION_STORAGE_PREFIX,
  buildDictationResultHref,
} from "../_utils/dictation-routes";
import { DictationPracticeScreen } from "./dictation-practice-screen";

export function markDictationAttemptForCelebration(attemptId: string): void {
  try {
    window.sessionStorage.setItem(`${DICTATION_CELEBRATION_STORAGE_PREFIX}${attemptId}`, "1");
  } catch {
    // The result remains usable when sessionStorage is unavailable.
  }
}

export function DictationPracticeRoute({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const handleCompleted = useCallback(
    (completedAttemptId: string) => {
      markDictationAttemptForCelebration(completedAttemptId);
      router.replace(buildDictationResultHref(completedAttemptId));
    },
    [router],
  );
  const handleAttemptNotInProgress = useCallback(() => {
    router.replace(buildDictationResultHref(attemptId));
  }, [attemptId, router]);

  return (
    <main className="px-3 py-2 sm:px-4 sm:py-2.5 lg:py-3">
      <div className="mx-auto w-full max-w-[1300px]">
        <DictationPracticeScreen
          attemptId={attemptId}
          onAttemptCompleted={handleCompleted}
          onAttemptNotInProgress={handleAttemptNotInProgress}
        />
      </div>
    </main>
  );
}
