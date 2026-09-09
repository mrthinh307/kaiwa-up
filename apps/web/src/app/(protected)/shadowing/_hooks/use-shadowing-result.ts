"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  getShadowingAttemptReview,
  requestShadowingAiReview,
  requestShadowingTranscriptions,
} from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

export function useShadowingResult(initialReview: ShadowingAttemptReviewResponse) {
  const { protectedRequest } = useAuth();
  const [review, setReview] = useState(initialReview);
  const [refreshError, setRefreshError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [aiError, setAiError] = useState<string>();
  const [isRequestingAi, setIsRequestingAi] = useState(false);
  const [isRetryingTranscriptions, setIsRetryingTranscriptions] = useState(false);
  const latestReviewRef = useRef(initialReview);
  const isMountedRef = useRef(true);
  const refreshRef = useRef<Promise<void> | null>(null);
  const actionRef = useRef(false);
  const attemptId = initialReview.attempt_id;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyReview = useCallback(
    (next: ShadowingAttemptReviewResponse) => {
      if (!isMountedRef.current || next.attempt_id !== attemptId) return;
      if ((next.review_revision ?? 0) < (latestReviewRef.current.review_revision ?? 0)) return;
      latestReviewRef.current = next;
      setReview(next);
    },
    [attemptId],
  );

  const refresh = useCallback((): Promise<void> => {
    if (refreshRef.current) return refreshRef.current;
    const pending = (async () => {
      try {
        const response = await protectedRequest(() =>
          getShadowingAttemptReview({ path: { attempt_id: attemptId } }),
        );
        if (!isMountedRef.current) return;
        if (response.data) {
          applyReview(response.data);
          setRefreshError(undefined);
        } else {
          setRefreshError(parseApiFailure(response).message);
        }
      } catch {
        if (isMountedRef.current)
          setRefreshError("Progress could not be refreshed. Your recordings are saved.");
      }
    })();
    refreshRef.current = pending;
    return pending.finally(() => {
      if (refreshRef.current === pending) refreshRef.current = null;
    });
  }, [applyReview, attemptId, protectedRequest]);

  const hasPendingWork =
    review.transcription?.status === "queued" ||
    review.transcription?.status === "processing" ||
    review.ai_review?.status === "queued" ||
    review.ai_review?.status === "processing";

  useEffect(() => {
    if (!hasPendingWork) return;
    let isCancelled = false;
    let isPolling = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;
    const poll = async () => {
      if (isCancelled || document.hidden || isPolling) return;
      isPolling = true;
      const previousRevision = latestReviewRef.current.review_revision;
      await refresh();
      isPolling = false;
      delay =
        latestReviewRef.current.review_revision === previousRevision
          ? Math.min(delay + 1000, 5000)
          : 2000;
      if (!isCancelled && !document.hidden)
        timer = setTimeout(() => {
          void poll();
        }, delay);
    };
    const handleVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) void poll();
    };
    timer = setTimeout(() => {
      void poll();
    }, delay);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [hasPendingWork, refresh]);

  const requestAiReview = useCallback(
    async (allowPartial = false) => {
      if (actionRef.current) return;
      actionRef.current = true;
      setIsRequestingAi(true);
      setAiError(undefined);
      try {
        const response = await protectedRequest(() =>
          requestShadowingAiReview({
            path: { attempt_id: attemptId },
            body: {
              review_revision: latestReviewRef.current.review_revision ?? 0,
              allow_partial: allowPartial,
            },
          }),
        );
        if (!isMountedRef.current) return;
        if (response.data) {
          applyReview({
            ...latestReviewRef.current,
            review_revision: response.data.review_revision,
            ai_review: response.data.ai_review,
            ai_feedback: response.data.ai_feedback,
          });
        } else {
          setAiError(parseApiFailure(response).message);
        }
        await refresh();
      } catch {
        if (isMountedRef.current)
          setAiError("AI feedback could not be requested. Please try again.");
      } finally {
        actionRef.current = false;
        if (isMountedRef.current) setIsRequestingAi(false);
      }
    },
    [applyReview, attemptId, protectedRequest, refresh],
  );

  const retryTranscriptions = useCallback(async () => {
    if (actionRef.current) return;
    actionRef.current = true;
    setIsRetryingTranscriptions(true);
    setActionError(undefined);
    try {
      const response = await protectedRequest(() =>
        requestShadowingTranscriptions({
          path: { attempt_id: attemptId },
          body: {},
        }),
      );
      if (!isMountedRef.current) return;
      if (response.data) {
        applyReview({
          ...latestReviewRef.current,
          review_revision: response.data.review_revision,
          transcription: response.data.transcription,
        });
      } else {
        setActionError(parseApiFailure(response).message);
      }
      await refresh();
    } catch {
      if (isMountedRef.current)
        setActionError("Transcript comparison could not be requested. Please try again.");
    } finally {
      actionRef.current = false;
      if (isMountedRef.current) setIsRetryingTranscriptions(false);
    }
  }, [applyReview, attemptId, protectedRequest, refresh]);

  return {
    review,
    refresh,
    refreshError,
    actionError,
    aiError,
    isRequestingAi,
    isRetryingTranscriptions,
    requestAiReview,
    retryTranscriptions,
  };
}
