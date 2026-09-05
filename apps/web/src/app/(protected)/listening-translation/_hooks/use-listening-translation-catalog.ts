"use client";

import type { TranslationLessonItem } from "@kaiwa-app/api-client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { parseApiFailure } from "@/lib/api-errors";

import { requestListeningTranslationLessons } from "../_lib/listening-translation-client";

export function useListeningTranslationCatalog(initialLessons: TranslationLessonItem[]) {
  const { protectedRequest } = useAuth();
  const [lessons, setLessons] = useState(initialLessons);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void protectedRequest(requestListeningTranslationLessons)
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.data) {
          setLessons(result.data.items);
          setSyncError(null);
          return;
        }

        setSyncError(parseApiFailure(result).message);
      })
      .catch(() => {
        if (isActive) {
          setSyncError("We could not refresh your completion status.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [protectedRequest]);

  return { lessons, syncError };
}
