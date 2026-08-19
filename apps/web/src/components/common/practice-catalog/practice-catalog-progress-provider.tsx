"use client";

import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getProgressSummary, listProgressAttempts } from "@/lib/api-client";

const ATTEMPT_HISTORY_PAGE_SIZE = 100;

type PracticeCatalogProgressContextValue = {
  dictationAttemptCounts: ReadonlyMap<string, number>;
  inProgressDictationContentIds: ReadonlySet<string>;
  isLoading: boolean;
};

const PracticeCatalogProgressContext = createContext<PracticeCatalogProgressContextValue>({
  dictationAttemptCounts: new Map(),
  inProgressDictationContentIds: new Set(),
  isLoading: false,
});

export function PracticeCatalogProgressProvider({ children }: { children: ReactNode }) {
  const { protectedRequest } = useAuth();
  const [dictationAttemptCounts, setDictationAttemptCounts] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const [inProgressDictationContentIds, setInProgressDictationContentIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadProgress = async () => {
      try {
        const summaryResponse = await protectedRequest(() => getProgressSummary());
        if (!summaryResponse.data) {
          throw new Error("Progress summary is unavailable");
        }

        const attemptCounts = new Map<string, number>();
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
              attemptCounts.set(
                attempt.content_id,
                Math.max(attemptCounts.get(attempt.content_id) ?? 0, attempt.attempt_number),
              );
            }

            totalPages = attemptsResponse.data.total_pages;
            page += 1;
          }
        } catch {
          attemptCounts.clear();
        }

        if (!isActive) {
          return;
        }

        setDictationAttemptCounts(attemptCounts);
        setInProgressDictationContentIds(
          new Set(
            (summaryResponse.data.in_progress_lessons ?? [])
              .filter((lesson) => lesson.content_type === "shadowing_dictation")
              .map((lesson) => lesson.content_id),
          ),
        );
      } catch {
        if (isActive) {
          setDictationAttemptCounts(new Map());
          setInProgressDictationContentIds(new Set());
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
      value={{ dictationAttemptCounts, inProgressDictationContentIds, isLoading }}
    >
      {children}
    </PracticeCatalogProgressContext.Provider>
  );
}

export function usePracticeCatalogProgress(): PracticeCatalogProgressContextValue {
  return useContext(PracticeCatalogProgressContext);
}
