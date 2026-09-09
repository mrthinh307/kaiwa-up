"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ShadowingProcessingStatusProps = {
  review: ShadowingAttemptReviewResponse;
  isRetrying: boolean;
  errorMessage?: string;
  onRetry: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function ShadowingProcessingStatus({
  review,
  isRetrying,
  errorMessage,
  onRetry,
  onRefresh,
}: ShadowingProcessingStatusProps) {
  const instanceId = useId();
  const toastId = `${instanceId}-${review.attempt_id}`;
  const isDismissed = useRef(false);
  const hasShownToast = useRef(false);
  const progress = review.transcription;
  const hasPending = progress?.status === "queued" || progress?.status === "processing";
  const failed = (progress?.failed ?? 0) + (progress?.unavailable ?? 0);
  const needsAttention = failed + (progress?.not_evaluable ?? 0);
  const processed =
    (progress?.completed ?? 0) +
    (progress?.no_speech ?? 0) +
    failed +
    (progress?.not_evaluable ?? 0);
  const recorded =
    progress?.recorded ||
    (review.mode === "continuous"
      ? Number(Boolean(review.user_continuous_recording_url))
      : review.segments.filter((segment) => segment.recorded).length);
  const needsInitialComparison =
    (progress?.not_requested ?? 0) > 0 ||
    (review.reference_version === "legacy_reference_unversioned" &&
      recorded > 0 &&
      processed === 0);

  const title = hasPending ? "Comparing transcripts…" : "Comparison complete";
  const description = `${processed}/${recorded} recordings processed.${
    hasPending && progress?.is_delayed ? " Taking longer than usual." : ""
  }`;

  useEffect(() => {
    isDismissed.current = false;
    return () => {
      if (hasShownToast.current) toast.dismiss(toastId);
      hasShownToast.current = false;
    };
  }, [toastId]);

  useEffect(() => {
    if (isDismissed.current || recorded === 0 || needsInitialComparison) return;

    // Wait until the Toaster subscribes and Strict Mode finishes replaying effects.
    const timeoutId = setTimeout(() => {
      hasShownToast.current = true;
      toast(title, {
        id: toastId,
        description,
        duration: hasPending ? Infinity : 5000,
        dismissible: true,
        icon: hasPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4 text-status-correct-text" />
        ),
        onDismiss: () => {
          isDismissed.current = true;
        },
        onAutoClose: () => {
          isDismissed.current = true;
        },
      });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [description, hasPending, needsInitialComparison, recorded, title, toastId]);

  if (needsAttention === 0 && !needsInitialComparison && !errorMessage) return null;

  return (
    <section
      aria-label="Transcript comparison"
      id="shadowing-transcript-processing"
      tabIndex={-1}
      className="scroll-mt-24 space-y-2 rounded-base border-2 border-border bg-secondary-background p-4 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {needsAttention > 0 && (
        <p className="text-xs text-foreground">
          {needsAttention} recordings could not be compared. This is not a speaking score.
        </p>
      )}
      {(needsAttention > 0 || needsInitialComparison) && (
        <Button
          disabled={isRetrying || hasPending}
          onClick={() => {
            isDismissed.current = false;
            void onRetry();
          }}
          size="sm"
          type="button"
          variant="neutral"
        >
          {isRetrying
            ? "Requesting comparison..."
            : needsInitialComparison
              ? "Compare saved recordings"
              : "Retry failed comparisons"}
        </Button>
      )}
      {needsInitialComparison && (
        <p className="text-xs text-foreground/75">
          This older result has no current comparison. Requesting one uses speech recognition and
          the available lesson reference.
        </p>
      )}
      {errorMessage && (
        <div className="space-y-2" role="alert">
          <p className="text-xs text-destructive">{errorMessage}</p>
          <Button onClick={() => void onRefresh()} size="sm" type="button" variant="neutral">
            Refresh progress
          </Button>
        </div>
      )}
    </section>
  );
}
