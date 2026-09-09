"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { ChevronUp, Eye, LoaderCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type ShadowingAiFeedbackCardProps = {
  review: ShadowingAttemptReviewResponse;
  isRequesting: boolean;
  errorMessage?: string;
  refreshError?: string;
  onRefresh: () => Promise<void>;
  onPracticeAgain: () => void;
  onRequest: (allowPartial?: boolean) => Promise<void>;
  onSelectSegment: (index: number, source: HTMLButtonElement) => void;
};

const controlClassName =
  "h-auto min-h-11 whitespace-normal focus-visible:ring-ring motion-reduce:transition-none";

export function ShadowingAiFeedbackCard({
  review,
  isRequesting,
  errorMessage,
  refreshError,
  onRefresh,
  onPracticeAgain,
  onRequest,
  onSelectSegment,
}: ShadowingAiFeedbackCardProps) {
  const feedback = review.ai_feedback;
  const state = review.ai_review;
  const status = state?.status ?? (feedback ? "completed" : "not_requested");
  const isPending = isRequesting || status === "queued" || status === "processing";
  const transcription = review.transcription;
  const isTranscribing =
    transcription?.status === "queued" || transcription?.status === "processing";
  const hasPartialFailure =
    (transcription?.failed ?? 0) +
      (transcription?.unavailable ?? 0) +
      (transcription?.not_evaluable ?? 0) >
    0;
  const recognizedCount = transcription?.completed ?? 0;
  const needsComparison = (transcription?.not_requested ?? 0) > 0;
  const canRequest = !isPending && !isTranscribing && !needsComparison && recognizedCount > 0;
  const hasRecordings =
    review.mode === "continuous"
      ? Boolean(review.user_continuous_recording_url)
      : review.segments.some((segment) => segment.recorded);
  const [isOpen, setIsOpen] = useState(true);
  const [isAssessmentExpanded, setIsAssessmentExpanded] = useState(false);
  const [areHintsExpanded, setAreHintsExpanded] = useState(false);
  const [areCorrectionsExpanded, setAreCorrectionsExpanded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStatusRef = useRef(status);
  const toastId = `shadowing-ai-feedback-${review.attempt_id}`;
  const handleViewFeedback = useCallback(() => {
    setIsOpen(true);
    headingRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    if (previousStatus === status || status !== "completed" || !feedback) return;
    const bounds = headingRef.current?.getBoundingClientRect();
    if (bounds && (bounds.top < 80 || bounds.bottom > window.innerHeight)) {
      toast.success("Your AI feedback is ready", {
        id: toastId,
        action: { label: "View feedback", onClick: handleViewFeedback },
        duration: 10000,
      });
    }
  }, [feedback, handleViewFeedback, status, toastId]);
  useEffect(
    () => () => {
      toast.dismiss(toastId);
    },
    [toastId],
  );

  const corrections = feedback?.corrections ?? [];
  const hints = feedback?.hints ?? [];
  const statusLabel = isPending
    ? state?.is_delayed
      ? "Delayed"
      : "Preparing feedback"
    : status === "failed"
      ? "Could not complete"
      : state?.is_stale
        ? "Update available"
        : feedback
          ? "Ready"
          : "Optional";

  return (
    <section
      aria-labelledby="shadowing-ai-feedback-heading"
      className="min-w-0 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="flex scroll-mt-24 items-center gap-2 rounded-base text-base focus-visible:outline-2 focus-visible:outline-ring"
                id="shadowing-ai-feedback-heading"
                ref={headingRef}
                tabIndex={-1}
              >
                <Sparkles aria-hidden="true" className="size-5 shrink-0 text-main" />
                AI Learning Feedback
              </h2>
              <Badge variant="neutral">Entire attempt</Badge>
              <span className="text-sm font-heading" role="status" aria-live="polite">
                {statusLabel}
              </span>
            </div>
            {!feedback && (
              <p className="text-sm">
                Get suggestions to improve your wording from your recognized text.
              </p>
            )}
            <p className="text-sm text-foreground/80">
              Based on recognized text, not audio features. Does not change your completion score or
              EXP.
            </p>
            {!feedback && recognizedCount > 0 && (
              <p className="text-sm">Available text: {recognizedCount} recognized recordings.</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 lg:max-w-sm">
            {(!feedback || state?.is_stale || status === "failed") && (
              <Button
                className={controlClassName}
                disabled={!canRequest}
                onClick={() => void onRequest(hasPartialFailure)}
                type="button"
              >
                {isPending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Sparkles aria-hidden="true" className="size-4" />
                )}
                {isPending
                  ? "Preparing feedback…"
                  : status === "failed"
                    ? "Retry AI feedback"
                    : state?.is_stale
                      ? "Update feedback"
                      : hasPartialFailure
                        ? `Review ${recognizedCount} recognized recordings`
                        : "Generate AI feedback"}
              </Button>
            )}
            {feedback && (
              <CollapsibleTrigger asChild>
                <Button className={controlClassName} type="button" variant="neutral">
                  {isOpen ? (
                    <>
                      <ChevronUp aria-hidden="true" className="size-4" />
                      Collapse feedback
                    </>
                  ) : (
                    <>
                      <Eye aria-hidden="true" className="size-4" />
                      View feedback
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {isPending && (
            <p className="mt-3">
              {state?.is_delayed
                ? "Your request is saved and will resume when the service is available."
                : "You can keep reviewing your recordings while we prepare your feedback."}
            </p>
          )}
          {status === "failed" && (
            <p className="mt-3 text-destructive" role="alert">
              AI feedback could not be completed. Your transcript comparisons and EXP are saved.
            </p>
          )}
          {errorMessage && (
            <p className="mt-3 text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          {refreshError && (
            <div className="mt-3 space-y-2">
              <p role="alert">
                Progress could not be refreshed. Your recordings and any previous feedback are
                saved.
              </p>
              <Button
                className={controlClassName}
                onClick={() => void onRefresh()}
                type="button"
                variant="neutral"
              >
                Refresh status
              </Button>
            </div>
          )}
          {state?.is_stale && feedback && (
            <p className="mt-3">
              This is an earlier review. Transcript results have changed.
              {isPending
                ? " An updated review is being prepared."
                : " Update feedback to include the latest text."}
            </p>
          )}
          {!canRequest && !isPending && (!feedback || state?.is_stale || status === "failed") && (
            <p className="mt-3">
              {isTranscribing
                ? "Speech recognition is still processing. Feedback becomes available when it finishes."
                : needsComparison
                  ? "Compare your saved recordings before requesting AI feedback."
                  : "No recognized text is available yet. Record your voice and complete speech recognition to get feedback."}
            </p>
          )}
          {hasPartialFailure && !isPending && (
            <p className="mt-3">
              Only available transcripts will be reviewed. You can review failed comparisons first.
            </p>
          )}
          {(needsComparison || hasPartialFailure) && !isTranscribing && (
            <Button asChild className={`${controlClassName} mt-2`} variant="neutral">
              <a href="#shadowing-transcript-processing">
                {needsComparison ? "Compare saved recordings" : "Review failed comparisons"}
              </a>
            </Button>
          )}
          {!hasRecordings && !feedback && (
            <Button
              className={`${controlClassName} mt-2`}
              onClick={onPracticeAgain}
              type="button"
              variant="neutral"
            >
              Practice and record your voice
            </Button>
          )}
        </div>
        {feedback && (
          <CollapsibleContent className="mt-4 space-y-4 border-t border-border/40 pt-4">
            <div className="flex flex-wrap gap-3 text-sm text-foreground/80">
              {feedback.provider === "fake" && (
                <Badge variant="neutral">Development demo feedback</Badge>
              )}
              {feedback.coverage && (
                <span>
                  Coverage: {feedback.coverage.completed ?? 0} recognized;{" "}
                  {feedback.coverage.no_speech ?? 0} without recognized speech
                  {feedback.coverage.total != null ? `; total: ${feedback.coverage.total}` : ""}.
                </span>
              )}
              {feedback.similarity_score != null && (
                <span>
                  Text similarity: {Number(feedback.similarity_score).toFixed(0)}% (recognized text
                  only)
                </span>
              )}
            </div>
            {feedback.feedback && (
              <div className="space-y-2">
                <h3 className="text-sm">Overall assessment</h3>
                <p
                  id="shadowing-ai-assessment"
                  className={`whitespace-pre-wrap wrap-anywhere rounded-base border border-border/60 bg-background p-3 text-sm leading-relaxed ${isAssessmentExpanded ? "" : "line-clamp-4"}`}
                >
                  {feedback.feedback}
                </p>
                <Button
                  aria-controls="shadowing-ai-assessment"
                  aria-expanded={isAssessmentExpanded}
                  className={controlClassName}
                  onClick={() => setIsAssessmentExpanded(!isAssessmentExpanded)}
                  type="button"
                  variant="neutral"
                >
                  {isAssessmentExpanded ? "Show less assessment" : "Read full assessment"}
                </Button>
              </div>
            )}
            {hints.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm">What to practice next</h3>
                <ul
                  className="list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed wrap-anywhere"
                  id="shadowing-ai-hints"
                >
                  {(areHintsExpanded ? hints : hints.slice(0, 3)).map((hint, index) => (
                    <li key={`${index}-${hint}`}>{hint}</li>
                  ))}
                </ul>
                {hints.length > 3 && (
                  <Button
                    aria-controls="shadowing-ai-hints"
                    aria-expanded={areHintsExpanded}
                    className={controlClassName}
                    onClick={() => setAreHintsExpanded(!areHintsExpanded)}
                    type="button"
                    variant="neutral"
                  >
                    {areHintsExpanded ? "Show fewer tips" : `Show all ${hints.length} tips`}
                  </Button>
                )}
              </div>
            )}
            {corrections.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm">Text & word corrections ({corrections.length})</h3>
                <div className="space-y-3" id="shadowing-ai-corrections">
                  {(areCorrectionsExpanded ? corrections : corrections.slice(0, 3)).map(
                    (correction, index) => {
                      const segmentIndex = correction.segment_index;
                      const hasSegment =
                        typeof segmentIndex === "number" &&
                        review.segments.some((segment) => segment.segment_index === segmentIndex);
                      return (
                        <article
                          className="space-y-3 rounded-base border border-border/60 bg-background p-3 text-sm wrap-anywhere sm:p-4"
                          key={`${segmentIndex}-${index}-${correction.original}-${correction.corrected}`}
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-sm text-foreground/80">Recognized text</p>
                              <p lang="ja">{correction.original || "(missing)"}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-sm text-foreground/80">Suggested wording</p>
                              <p className="font-heading text-status-correct-text" lang="ja">
                                {correction.corrected || "(remove extra words)"}
                              </p>
                            </div>
                          </div>
                          {correction.reason && (
                            <p className="leading-relaxed">{correction.reason}</p>
                          )}
                          {review.mode !== "continuous" &&
                            typeof segmentIndex === "number" &&
                            (hasSegment ? (
                              <Button
                                className={`${controlClassName} scroll-mt-24`}
                                onClick={(event) =>
                                  onSelectSegment(segmentIndex, event.currentTarget)
                                }
                                type="button"
                                variant="neutral"
                              >
                                Review segment {segmentIndex + 1}
                              </Button>
                            ) : (
                              <p className="text-foreground/80">
                                This segment is no longer available.
                              </p>
                            ))}
                        </article>
                      );
                    },
                  )}
                </div>
                {corrections.length > 3 && (
                  <Button
                    aria-controls="shadowing-ai-corrections"
                    aria-expanded={areCorrectionsExpanded}
                    className={controlClassName}
                    onClick={() => setAreCorrectionsExpanded(!areCorrectionsExpanded)}
                    type="button"
                    variant="neutral"
                  >
                    {areCorrectionsExpanded
                      ? "Show fewer corrections"
                      : `Show all ${corrections.length} corrections`}
                  </Button>
                )}
              </div>
            )}
          </CollapsibleContent>
        )}
      </Collapsible>
    </section>
  );
}
