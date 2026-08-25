"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type PracticePreviewContextValue = {
  activeLessonId: string | null;
  activatePreview: (lessonId: string) => void;
  deactivatePreview: (lessonId: string) => void;
};

const PracticePreviewContext = createContext<PracticePreviewContextValue | null>(null);

type PracticePreviewProviderProps = {
  children: ReactNode;
};

export function PracticePreviewProvider({ children }: PracticePreviewProviderProps) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const activatePreview = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const deactivatePreview = useCallback((lessonId: string) => {
    setActiveLessonId((currentLessonId) => (currentLessonId === lessonId ? null : currentLessonId));
  }, []);

  const value = useMemo(
    () => ({ activeLessonId, activatePreview, deactivatePreview }),
    [activeLessonId, activatePreview, deactivatePreview],
  );

  return (
    <PracticePreviewContext.Provider value={value}>{children}</PracticePreviewContext.Provider>
  );
}

export function usePracticePreview(): PracticePreviewContextValue {
  const context = useContext(PracticePreviewContext);

  if (!context) {
    throw new Error("usePracticePreview must be used within PracticePreviewProvider");
  }

  return context;
}
