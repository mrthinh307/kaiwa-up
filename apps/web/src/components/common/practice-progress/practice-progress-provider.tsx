"use client";

import type { PracticeMethod } from "@kaiwa-app/api-client";
import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getProgressSummary } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

export type LessonPracticeMethod = Extract<PracticeMethod, "dictation" | "shadowing">;

export type LessonPracticeProgress = {
  activeMethods: readonly LessonPracticeMethod[];
  hasLegacyInProgress: boolean;
};

type PracticeProgressContextValue = {
  errorMessage: string | null;
  isLoading: boolean;
  progressByContentId: ReadonlyMap<string, LessonPracticeProgress>;
};

const PracticeProgressContext = createContext<PracticeProgressContextValue | null>(null);

export function PracticeProgressProvider({ children }: { children: ReactNode }) {
  const { protectedRequest } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressByContentId, setProgressByContentId] = useState<
    ReadonlyMap<string, LessonPracticeProgress>
  >(() => new Map());

  useEffect(() => {
    let isActive = true;

    const loadProgress = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await protectedRequest(() => getProgressSummary());
        if (!response.data) {
          throw new Error(parseApiFailure(response).message);
        }

        const mutableProgress = new Map<
          string,
          { activeMethods: Set<LessonPracticeMethod>; hasLegacyInProgress: boolean }
        >();

        for (const lesson of response.data.in_progress_lessons ?? []) {
          if (lesson.content_type !== "shadowing_dictation") {
            continue;
          }

          const current = mutableProgress.get(lesson.content_id) ?? {
            activeMethods: new Set<LessonPracticeMethod>(),
            hasLegacyInProgress: false,
          };
          if (lesson.practice_method === "shadowing" || lesson.practice_method === "dictation") {
            current.activeMethods.add(lesson.practice_method);
          } else if (lesson.practice_method === null) {
            current.hasLegacyInProgress = true;
          }
          mutableProgress.set(lesson.content_id, current);
        }

        if (!isActive) {
          return;
        }

        setProgressByContentId(
          new Map(
            [...mutableProgress].map(([contentId, progress]) => [
              contentId,
              {
                activeMethods: [...progress.activeMethods],
                hasLegacyInProgress: progress.hasLegacyInProgress,
              },
            ]),
          ),
        );
      } catch (error) {
        if (isActive) {
          setProgressByContentId(new Map());
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Practice progress is temporarily unavailable.",
          );
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

  const value = useMemo(
    () => ({ errorMessage, isLoading, progressByContentId }),
    [errorMessage, isLoading, progressByContentId],
  );

  return (
    <PracticeProgressContext.Provider value={value}>{children}</PracticeProgressContext.Provider>
  );
}

export function usePracticeProgress(): PracticeProgressContextValue {
  const context = useContext(PracticeProgressContext);
  if (!context) {
    throw new Error("usePracticeProgress must be used within PracticeProgressProvider");
  }
  return context;
}
