"use client";

import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getProgressSummary } from "@/lib/api-client";

type PracticeCatalogProgressContextValue = {
  inProgressDictationContentIds: ReadonlySet<string>;
  isLoading: boolean;
};

const PracticeCatalogProgressContext = createContext<PracticeCatalogProgressContextValue>({
  inProgressDictationContentIds: new Set(),
  isLoading: false,
});

export function PracticeCatalogProgressProvider({ children }: { children: ReactNode }) {
  const { protectedRequest } = useAuth();
  const [inProgressDictationContentIds, setInProgressDictationContentIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadProgress = async () => {
      try {
        const response = await protectedRequest(() => getProgressSummary());
        if (!isActive || !response.data) {
          return;
        }

        setInProgressDictationContentIds(
          new Set(
            (response.data.in_progress_lessons ?? [])
              .filter((lesson) => lesson.content_type === "shadowing_dictation")
              .map((lesson) => lesson.content_id),
          ),
        );
      } catch {
        if (isActive) {
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
    <PracticeCatalogProgressContext.Provider value={{ inProgressDictationContentIds, isLoading }}>
      {children}
    </PracticeCatalogProgressContext.Provider>
  );
}

export function usePracticeCatalogProgress(): PracticeCatalogProgressContextValue {
  return useContext(PracticeCatalogProgressContext);
}
