"use client";

import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getProgressSummary, listProgressAttempts } from "@/lib/api-client";

const ATTEMPT_HISTORY_PAGE_SIZE = 100;

type PracticeCatalogProgressContextValue = {
  attemptCounts: ReadonlyMap<string, number>;
  dictationAttemptCounts: ReadonlyMap<string, number>;
  inProgressContentIds: ReadonlySet<string>;
  inProgressDictationContentIds: ReadonlySet<string>;
  isLoading: boolean;
};

const PracticeCatalogProgressContext = createContext<PracticeCatalogProgressContextValue>({
  attemptCounts: new Map(),
  dictationAttemptCounts: new Map(),
  inProgressContentIds: new Set(),
  inProgressDictationContentIds: new Set(),
  isLoading: false,
});

export function PracticeCatalogProgressProvider({ children }: { children: ReactNode }) {
  const { protectedRequest } = useAuth();
  const [attemptCounts, setAttemptCounts] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [inProgressContentIds, setInProgressContentIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadProgress = async () => {
      try {
        const summaryResponse = await protectedRequest(() => getProgressSummary());
        if (!summaryResponse.data) {
          throw new Error("Progress summary is unavailable");
        }

        const counts = new Map<string, number>();
        let page = 1;
        let totalPages = 1;

        try {
          while (page <= totalPages) {
            const attemptsResponse = await protectedRequest(() =>
              listProgressAttempts({
                query: {
                  content_type: "shadowing_dictation",
                  page,
                  page_size: ATTEMPT_HISTORY_PAGE_SIZE,
                },
              }),
            );
            if (!attemptsResponse.data) {
              throw new Error("Attempt history is unavailable");
            }

            for (const attempt of attemptsResponse.data.items) {
              counts.set(
                attempt.content_id,
                Math.max(counts.get(attempt.content_id) ?? 0, attempt.attempt_number),
              );
            }

            totalPages = attemptsResponse.data.total_pages;
            page += 1;
          }
        } catch {
          counts.clear();
        }

        if (!isActive) {
          return;
        }

        setAttemptCounts(counts);
        setInProgressContentIds(
          new Set(
            (summaryResponse.data.in_progress_lessons ?? [])
              .filter((lesson) => lesson.content_type === "shadowing_dictation")
              .map((lesson) => lesson.content_id),
          ),
        );
      } catch {
        if (isActive) {
          setAttemptCounts(new Map());
          setInProgressContentIds(new Set());
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProgress();

    return () => {
      isActive = false;
    };
  }, [protectedRequest]);

  return (
    <PracticeCatalogProgressContext.Provider
      value={{
        attemptCounts,
        dictationAttemptCounts: attemptCounts,
        inProgressContentIds,
        inProgressDictationContentIds: inProgressContentIds,
        isLoading,
      }}
    >
      {children}
    </PracticeCatalogProgressContext.Provider>
  );
}

export function usePracticeCatalogProgress(): PracticeCatalogProgressContextValue {
  return useContext(PracticeCatalogProgressContext);
}
