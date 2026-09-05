"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiFailure } from "@/lib/api-errors";

import type { DueReview, ReflexLessonList } from "../_lib/reflex-api";

import { listDueReviews, listReflexLessons } from "../_lib/reflex-api";

export type ReflexCatalogState =
  | { dueReviews: DueReview[]; lessons: ReflexLessonList; status: "success" }
  | { message: string; status: "failed" }
  | { status: "loading" };

export function useReflexCatalog() {
  const [state, setState] = useState<ReflexCatalogState>({ status: "loading" });

  const loadCatalog = useCallback(async () => {
    try {
      const [lessonResult, dueResult] = await Promise.all([listReflexLessons(), listDueReviews()]);

      if (!lessonResult.data || !dueResult.data) {
        const failure = parseApiFailure(!lessonResult.data ? lessonResult : dueResult);
        setState({ message: failure.message, status: "failed" });
        return;
      }

      if (!Array.isArray(lessonResult.data.items) || !Array.isArray(dueResult.data.items)) {
        setState({
          message: "The Reflex API returned an outdated response. Restart the API and web servers.",
          status: "failed",
        });
        return;
      }

      setState({ dueReviews: dueResult.data.items, lessons: lessonResult.data, status: "success" });
    } catch {
      setState({
        message: "Unable to load Reflex data. Restart the development servers and try again.",
        status: "failed",
      });
    }
  }, []);

  const handleRetry = () => {
    setState({ status: "loading" });
    void loadCatalog();
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadCatalog]);

  return { handleRetry, state };
}
