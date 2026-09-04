"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  CircleAlert,
  LoaderCircle,
  Play,
  Repeat2,
  RotateCcw,
  Trophy,
  VideoOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  DictationKeyboardShortcut,
  DictationResultProps,
  DictationSegmentMapResult,
} from "../_types/dictation-practice";

import { useDictationSettings } from "../_hooks/use-dictation-settings";
import { usePracticeShortcuts } from "../_hooks/use-practice-shortcuts";
import { formatDictationTimestamp, getYouTubeVideoId } from "../_utils/dictation-formatters";
import { DictationDiffViewer } from "./dictation-diff-viewer";
import { DictationPracticeSidebar } from "./dictation-practice-sidebar";
import { DictationSettingsSheet } from "./dictation-settings-sheet";
import { DictationToolbar } from "./dictation-toolbar";
import { SegmentAudioPlayer } from "./segment-audio-player";

const RESULT_SHORTCUTS: readonly DictationKeyboardShortcut[] = [
  { action: "Play or pause audio", keyLabel: "⎵" },
  { action: "Next segment", keyLabel: "→" },
  { action: "Previous segment", keyLabel: "←" },
];

const scoreFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function DictationResult({
  attempt,
  completion,
  content,
  isStarting,
  onTryAgain,
  review,
  shouldCelebrate = false,
  startError,
}: DictationResultProps) {
  const {
    autoPlayDelayMs,
    autoPlayOnSegmentChange,
    showVideo,
    updateAutoPlayDelay,
    updateAutoPlayOnSegmentChange,
    updateShowVideo,
  } = useDictationSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const scheduledPlaybackTimeoutRef = useRef<number | null>(null);
  const previousAutoPlayEnabledRef = useRef(autoPlayOnSegmentChange);
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);

  const firstIncorrectPosition = review.details.findIndex((detail) => !detail.is_correct);
  const [activeReviewPosition, setActiveReviewPosition] = useState(
    firstIncorrectPosition >= 0 ? firstIncorrectPosition : 0,
  );
  const previousReviewPositionRef = useRef(activeReviewPosition);
  const activeReview = review.details.at(activeReviewPosition);
  const activeSegment = activeReview
    ? attempt.segments.find((segment) => segment.segment_index === activeReview.segment_index)
    : undefined;

  const youtubeVideoId = useMemo(() => getYouTubeVideoId(attempt.audio_url), [attempt.audio_url]);
  const reviewAnswers = useMemo(
    () =>
      review.details.reduce<Record<number, string>>((answers, detail) => {
        answers[detail.segment_index] = detail.user_answer;
        return answers;
      }, {}),
    [review.details],
  );
  const reviewResults = useMemo(
    () =>
      review.details.reduce<Record<number, DictationSegmentMapResult>>((results, detail) => {
        results[detail.segment_index] = {
          is_correct: detail.is_correct,
          user_answer: detail.user_answer,
        };
        return results;
      }, {}),
    [review.details],
  );
  const checkedReviewCount = useMemo(
    () => review.details.filter((detail) => detail.user_answer.trim()).length,
    [review.details],
  );

  const handleSelectReview = useCallback((reviewPosition: number) => {
    setActiveReviewPosition(reviewPosition);
    setPlaybackRequest(0);
  }, []);

  const handleSelectSegment = useCallback(
    (segmentIndex: number) => {
      const reviewPosition = review.details.findIndex(
        (detail) => detail.segment_index === segmentIndex,
      );
      if (reviewPosition >= 0) {
        handleSelectReview(reviewPosition);
      }
    },
    [handleSelectReview, review.details],
  );

  const handlePrevious = useCallback(() => {
    setActiveReviewPosition((position) => Math.max(position - 1, 0));
    setPlaybackRequest(0);
  }, []);

  const handleNext = useCallback(() => {
    setActiveReviewPosition((position) => Math.min(position + 1, review.details.length - 1));
    setPlaybackRequest(0);
  }, [review.details.length]);

  const handleReplay = useCallback(() => {
    if (!activeSegment) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = activeSegment.start_time_ms / 1_000;
      void audioRef.current.play();
      return;
    }

    setPlaybackRequest((current) => current + 1);
  }, [activeSegment]);

  const clearScheduledPlayback = useCallback(() => {
    if (scheduledPlaybackTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(scheduledPlaybackTimeoutRef.current);
    scheduledPlaybackTimeoutRef.current = null;
  }, []);

  const schedulePlayback = useCallback(() => {
    clearScheduledPlayback();
    scheduledPlaybackTimeoutRef.current = window.setTimeout(() => {
      scheduledPlaybackTimeoutRef.current = null;
      handleReplay();
    }, autoPlayDelayMs);
  }, [autoPlayDelayMs, clearScheduledPlayback, handleReplay]);

  useEffect(() => clearScheduledPlayback, [clearScheduledPlayback]);

  useEffect(() => {
    const hasReviewPositionChanged = previousReviewPositionRef.current !== activeReviewPosition;
    const wasAutoPlayEnabled = previousAutoPlayEnabledRef.current;
    previousReviewPositionRef.current = activeReviewPosition;
    previousAutoPlayEnabledRef.current = autoPlayOnSegmentChange;

    if (!autoPlayOnSegmentChange) {
      clearScheduledPlayback();
      return;
    }

    if (hasReviewPositionChanged || !wasAutoPlayEnabled) {
      schedulePlayback();
    }
  }, [activeReviewPosition, autoPlayOnSegmentChange, clearScheduledPlayback, schedulePlayback]);

  const handlePlaybackEnded = useCallback(() => {
    if (!autoPlayOnSegmentChange || activeReviewPosition >= review.details.length - 1) {
      return;
    }

    handleNext();
  }, [activeReviewPosition, autoPlayOnSegmentChange, handleNext, review.details.length]);

  const handleLoopToggle = useCallback(() => {
    setIsLoopEnabled((isEnabled) => !isEnabled);
  }, []);

  const handleNativePlaybackBoundary = useCallback(
    (audio: HTMLAudioElement) => {
      if (!activeSegment) {
        return;
      }

      if (isLoopEnabled) {
        audio.currentTime = activeSegment.start_time_ms / 1_000;
        void audio.play().catch(() => undefined);
        return;
      }

      audio.pause();
      handlePlaybackEnded();
    },
    [activeSegment, handlePlaybackEnded, isLoopEnabled],
  );

  const handlePlaybackStop = useCallback(() => {
    clearScheduledPlayback();
  }, [clearScheduledPlayback]);

  const handleShowVideoChange = useCallback(
    (value: boolean) => {
      updateShowVideo(value);
      setPlaybackRequest(0);
    },
    [updateShowVideo],
  );

  usePracticeShortcuts({
    onNext: handleNext,
    onPrevious: handlePrevious,
    onReplay: handleReplay,
  });

  if (!activeReview || !activeSegment) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Attempt review is out of sync</AlertTitle>
        <AlertDescription>
          The review details do not match the segments returned when this attempt started.
        </AlertDescription>
      </Alert>
    );
  }

  const activeSegmentIndex = attempt.segments.findIndex(
    (segment) => segment.segment_index === activeSegment.segment_index,
  );
  const isUnanswered = !activeReview.user_answer.trim();
  const ActiveStatusIcon = activeReview.is_correct ? CheckCircle2 : isUnanswered ? Circle : XCircle;
  const activeStatusLabel = activeReview.is_correct
    ? "Correct"
    : isUnanswered
      ? "Unanswered"
      : "Needs review";
  const activeStatusIconColor = activeReview.is_correct
    ? "text-status-correct-text dark:text-emerald-300"
    : isUnanswered
      ? "text-foreground/50 dark:text-zinc-400"
      : "text-status-review-text dark:text-amber-300";

  return (
    <div className="scroll-mt-24 space-y-3.5 sm:space-y-4" id="dictation-result-screen">
      {shouldCelebrate ? <ExpRewardOverlay expEarned={completion.earned_exp} /> : null}

      {/* Top Sticky Toolbar */}
      <DictationToolbar
        difficulty={content.difficulty}
        lessonTitle={content.title}
        settings={
          <DictationSettingsSheet
            autoPlayDelayMs={autoPlayDelayMs}
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            mode="result"
            onAutoPlayDelayChange={updateAutoPlayDelay}
            onAutoPlayOnSegmentChange={updateAutoPlayOnSegmentChange}
            onShowVideoChange={handleShowVideoChange}
            showVideo={showVideo}
          />
        }
      >
        <Button
          className="gap-1.5 font-heading text-xs"
          disabled={isStarting}
          onClick={onTryAgain}
          size="sm"
          type="button"
        >
          {isStarting ? (
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden sm:inline">{isStarting ? "Starting..." : "Try again"}</span>
        </Button>
      </DictationToolbar>

      {/* Unified 7:5 Ratio Grid Layout */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Left Column (7 cols): Segment Map on top, Review Workstation underneath */}
        <div className="space-y-4 lg:col-span-7">
          {/* Segment Map (1-row 10-column compact map flanked by Prev/Next) */}
          <DictationPracticeSidebar
            activeSegmentIndex={activeSegmentIndex}
            answers={reviewAnswers}
            checkedCount={checkedReviewCount}
            correctCount={completion.correct_count}
            draftCount={0}
            hideCompletionCard
            hideStats
            isCompleting={false}
            keyboardShortcuts={RESULT_SHORTCUTS}
            onComplete={() => undefined}
            onSelectSegment={handleSelectSegment}
            results={reviewResults}
            segments={attempt.segments}
            storedResultCount={checkedReviewCount}
            totalSegments={attempt.total_segments}
            variant="result"
          />

          {/* Answer Review Workstation */}
          <section
            aria-labelledby="dictation-review-workstation-heading"
            className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow"
          >
            {/* Workstation Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border bg-background px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <h3
                  className="font-heading text-base sm:text-lg"
                  id="dictation-review-workstation-heading"
                >
                  Segment {activeReview.segment_index + 1}
                </h3>
                <span className="rounded-base border border-border/60 bg-secondary-background px-2 py-0.5 font-mono text-xs tabular-nums text-foreground/75">
                  {formatDictationTimestamp(activeSegment.start_time_ms)}–
                  {formatDictationTimestamp(activeSegment.end_time_ms)}
                </span>
              </div>

              <Badge
                className={cn(
                  "gap-1.5 font-heading text-xs",
                  activeReview.is_correct &&
                    "border-status-correct-border bg-status-correct-bg text-status-correct-text dark:border-emerald-400 dark:text-emerald-300",
                  !activeReview.is_correct &&
                    !isUnanswered &&
                    "border-status-review-border bg-status-review-bg text-status-review-text dark:border-amber-400 dark:text-amber-300",
                  !activeReview.is_correct &&
                    isUnanswered &&
                    "border-border bg-secondary-background text-foreground/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                )}
                variant="neutral"
              >
                <ActiveStatusIcon aria-hidden="true" className="size-3.5 stroke-[2.5]" />
                {activeStatusLabel}
              </Badge>
            </div>

            {/* Audio Playback Bar */}
            <div className="border-b-2 border-border bg-background">
              {youtubeVideoId ? (
                <SegmentAudioPlayer
                  autoPlayDelayMs={autoPlayDelayMs}
                  canContinuePlayback={activeReviewPosition < review.details.length - 1}
                  endTimeMs={activeSegment.end_time_ms}
                  hasPlayedActiveSegment={playbackRequest > 0}
                  isAutoPlayEnabled={autoPlayOnSegmentChange}
                  isLoopEnabled={isLoopEnabled}
                  lessonTitle={content.title}
                  onEnded={handlePlaybackEnded}
                  onLoopToggle={handleLoopToggle}
                  onReplay={handleReplay}
                  onStop={handlePlaybackStop}
                  playbackRequest={playbackRequest}
                  segmentIndex={activeSegment.segment_index}
                  showVideo={showVideo}
                  startTimeMs={activeSegment.start_time_ms}
                  youtubeVideoId={youtubeVideoId}
                />
              ) : (
                <div className="p-4 sm:p-5">
                  {attempt.audio_url ? (
                    <audio
                      className="w-full"
                      controls
                      onEnded={(event) => handleNativePlaybackBoundary(event.currentTarget)}
                      onTimeUpdate={(event) => {
                        if (event.currentTarget.currentTime * 1_000 >= activeSegment.end_time_ms) {
                          handleNativePlaybackBoundary(event.currentTarget);
                        }
                      }}
                      ref={audioRef}
                      src={attempt.audio_url}
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-foreground/60">
                      <VideoOff aria-hidden="true" className="size-8" />
                      <p className="text-sm font-heading">Audio is unavailable for this attempt.</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      aria-label={`Loop current segment ${isLoopEnabled ? "on" : "off"}`}
                      aria-pressed={isLoopEnabled}
                      className="min-h-9 gap-1.5 font-heading text-xs"
                      onClick={handleLoopToggle}
                      size="sm"
                      type="button"
                      variant={isLoopEnabled ? "default" : "neutral"}
                    >
                      <Repeat2 aria-hidden="true" className="size-3.5" />
                      Loop {isLoopEnabled ? "on" : "off"}
                    </Button>
                    <Button
                      className="min-h-9 gap-1.5 font-heading text-xs"
                      onClick={handleReplay}
                      size="sm"
                      type="button"
                      variant="neutral"
                    >
                      {playbackRequest > 0 ? (
                        <RotateCcw aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Play aria-hidden="true" className="size-3.5" />
                      )}
                      Replay segment
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Comparison / Diff Section */}
            <div className="space-y-4 p-4 sm:p-5">
              {/* Feedback Alert Banner */}
              <div
                className={cn(
                  "rounded-base border-2 p-3 sm:p-4",
                  activeReview.is_correct &&
                    "border-status-correct-border bg-status-correct-bg/60 text-foreground dark:border-emerald-500/50 dark:bg-emerald-950/30",
                  !activeReview.is_correct &&
                    !isUnanswered &&
                    "border-status-review-border bg-status-review-bg/60 text-foreground dark:border-amber-500/50 dark:bg-amber-950/30",
                  !activeReview.is_correct &&
                    isUnanswered &&
                    "border-border bg-background text-foreground dark:border-zinc-700",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <ActiveStatusIcon
                    aria-hidden="true"
                    className={cn("mt-0.5 size-5 shrink-0 stroke-[2.5]", activeStatusIconColor)}
                  />
                  <div>
                    <h4 className="font-heading text-sm sm:text-base">
                      {activeReview.is_correct
                        ? "Correct — nicely heard!"
                        : isUnanswered
                          ? "No answer submitted"
                          : "Not quite — compare and retry"}
                    </h4>
                    <p className="mt-0.5 text-xs text-foreground/75 sm:text-sm">
                      {activeReview.is_correct
                        ? "Your answer matches after normalization."
                        : isUnanswered
                          ? "This segment was not checked during the attempt."
                          : "Review your checked answer against the correct transcript."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Character Diff Viewer or Unanswered Message */}
              {isUnanswered ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-heading uppercase tracking-wide text-foreground/60">
                      Your checked answer
                    </span>
                    <div className="rounded-base border-2 border-border bg-background p-3.5 text-sm italic text-foreground/50">
                      No checked answer was submitted for this segment.
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-heading uppercase tracking-wide text-foreground/60">
                      Correct transcript
                    </span>
                    <p
                      className="rounded-base border-2 border-border bg-background p-3.5 font-heading text-base leading-relaxed text-foreground sm:text-lg"
                      lang="ja"
                    >
                      {activeReview.correct_script}
                    </p>
                  </div>
                </div>
              ) : (
                <DictationDiffViewer
                  correctScript={activeReview.correct_script}
                  isCorrect={activeReview.is_correct}
                  userAnswer={activeReview.user_answer}
                />
              )}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between border-t-2 border-border bg-background/50 px-4 py-3 sm:px-5">
              <Button
                className="gap-1.5 font-heading text-xs"
                disabled={activeReviewPosition === 0}
                onClick={handlePrevious}
                size="sm"
                type="button"
                variant="neutral"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Previous
              </Button>

              <div className="hidden items-center gap-3 text-xs text-foreground/60 sm:flex">
                <span>
                  Segment <strong className="text-foreground">{activeReviewPosition + 1}</strong> of{" "}
                  {review.details.length}
                </span>
              </div>

              <Button
                className="gap-1.5 font-heading text-xs"
                disabled={activeReviewPosition === review.details.length - 1}
                onClick={handleNext}
                size="sm"
                type="button"
                variant="neutral"
              >
                Next
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): Sticky Video & Result Summary Card */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:z-20 lg:col-span-5 lg:self-start">
          {/* Docked YouTube Video Player */}
          {showVideo && youtubeVideoId ? (
            <section
              aria-label="Video segment player"
              className="overflow-hidden rounded-base border-2 border-border bg-black shadow-shadow"
            >
              <div className="relative aspect-video w-full" id="dictation-video-dock" />
            </section>
          ) : null}

          {/* Result Summary & Next Steps Card */}
          <section
            aria-labelledby="dictation-result-summary-heading"
            className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Trophy aria-hidden="true" className="size-5 text-main" />
                <h3
                  className="font-heading text-base sm:text-lg"
                  id="dictation-result-summary-heading"
                >
                  Result Summary
                </h3>
              </div>
              <Badge className="font-heading text-xs" variant="neutral">
                Attempt {attempt.attempt_number}
              </Badge>
            </div>

            {/* 4-Box Stats Matrix */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-base border-2 border-border bg-background p-2.5 text-center shadow-2xs">
                <span className="block text-[11px] font-heading uppercase tracking-wide text-foreground/60">
                  Score
                </span>
                <span className="mt-0.5 block font-heading text-xl text-main tabular-nums sm:text-2xl">
                  {scoreFormatter.format(completion.score)}%
                </span>
              </div>

              <div className="rounded-base border-2 border-status-correct-border bg-status-correct-bg p-2.5 text-center shadow-2xs dark:border-emerald-500/50 dark:bg-emerald-950/30">
                <span className="block text-[11px] font-heading uppercase tracking-wide text-status-correct-text dark:text-emerald-300">
                  Correct
                </span>
                <span className="mt-0.5 block font-heading text-xl text-status-correct-text tabular-nums sm:text-2xl dark:text-emerald-300">
                  {completion.correct_count}/{completion.total_count}
                </span>
              </div>

              <div className="rounded-base border-2 border-status-review-border bg-status-review-bg p-2.5 text-center shadow-2xs dark:border-amber-500/50 dark:bg-amber-950/30">
                <span className="block text-[11px] font-heading uppercase tracking-wide text-status-review-text dark:text-amber-300">
                  Review
                </span>
                <span className="mt-0.5 block font-heading text-xl text-status-review-text tabular-nums sm:text-2xl dark:text-amber-300">
                  {completion.total_count - completion.correct_count}
                </span>
              </div>

              <div className="rounded-base border-2 border-border bg-background p-2.5 text-center shadow-2xs">
                <span className="block text-[11px] font-heading uppercase tracking-wide text-foreground/60">
                  EXP
                </span>
                <span className="mt-0.5 block font-heading text-xl text-chart-4 tabular-nums sm:text-2xl">
                  +{completion.earned_exp}
                </span>
              </div>
            </div>

            {/* Active Segment Info Row */}
            <div className="mt-3.5 flex items-center justify-between rounded-base border border-border/60 bg-background px-3 py-2 text-xs">
              <span className="text-foreground/75">
                Active: <strong>Segment #{activeReview.segment_index + 1}</strong>
              </span>
              <span
                className={cn(
                  "font-heading",
                  activeReview.is_correct && "text-status-correct-text dark:text-emerald-300",
                  !activeReview.is_correct &&
                    !isUnanswered &&
                    "text-status-review-text dark:text-amber-300",
                  !activeReview.is_correct && isUnanswered && "text-foreground/60",
                )}
              >
                {activeStatusLabel}
              </span>
            </div>

            {/* Error if attempt start failed */}
            {startError ? (
              <Alert className="mt-3.5" variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Unable to start another attempt</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </Alert>
            ) : null}

            {/* Actions */}
            <div className="mt-4 space-y-2">
              <Button
                className="w-full gap-2 font-heading text-sm"
                disabled={isStarting}
                onClick={onTryAgain}
                type="button"
              >
                {isStarting ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" className="size-4" />
                )}
                {isStarting ? "Starting new attempt..." : "Try this lesson again"}
              </Button>

              <Button asChild className="w-full gap-2 font-heading text-sm" variant="neutral">
                <Link href="/lessons">
                  <BookOpenCheck aria-hidden="true" className="size-4" />
                  Back to lessons
                </Link>
              </Button>
            </div>

            {/* Shortcuts Reference */}
            <div className="mt-4 border-t border-border/40 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-foreground/60">
                <span className="font-heading">Shortcuts:</span>
                <div className="flex items-center gap-2">
                  <span>
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                      ⎵
                    </kbd>{" "}
                    Play/Pause
                  </span>
                  <span>
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                      Ctrl
                    </kbd>
                    {` `}+{` `}
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                      ←
                    </kbd>
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                      →
                    </kbd>{" "}
                    Navigate
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
