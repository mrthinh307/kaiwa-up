"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  CircleAlert,
  Headphones,
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
import { DictationPracticeSidebar } from "./dictation-practice-sidebar";
import { DictationSettingsSheet } from "./dictation-settings-sheet";
import { DictationToolbar } from "./dictation-toolbar";
import { SegmentAudioPlayer } from "./segment-audio-player";

const RESULT_SHORTCUTS: readonly DictationKeyboardShortcut[] = [
  { action: "Pause or resume video", keyLabel: "⎵" },
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
    ? "text-success"
    : isUnanswered
      ? "text-foreground/50"
      : "text-chart-3";

  return (
    <section aria-labelledby="dictation-result-heading" className="space-y-6">
      {shouldCelebrate ? <ExpRewardOverlay expEarned={completion.earned_exp} /> : null}

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
      />

      <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <div className="bg-background p-6 sm:p-8 lg:p-10">
            <Badge className="gap-2" variant="neutral">
              <Trophy aria-hidden="true" />
              Attempt {attempt.attempt_number} completed
            </Badge>
            <h2
              className="mt-6 font-heading text-3xl leading-tight sm:text-4xl"
              id="dictation-result-heading"
            >
              Dictation complete.
            </h2>
            <p className="mt-4 max-w-[620px] leading-relaxed text-foreground/70 sm:text-lg">
              Your attempt is now locked. The score and EXP below come from the completion response;
              the segment review comes from the saved attempt.
            </p>
          </div>

          <dl className="grid grid-cols-3 border-t-2 border-border bg-secondary-background text-foreground lg:border-t-0 lg:border-l-2">
            <div className="flex flex-col justify-center p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Correct
              </dt>
              <dd className="mt-2 font-heading text-2xl text-success tabular-nums sm:text-3xl">
                {completion.correct_count}/{completion.total_count}
              </dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Score
              </dt>
              <dd className="mt-2 font-heading text-2xl text-main tabular-nums sm:text-3xl">
                {scoreFormatter.format(completion.score)}%
              </dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                EXP
              </dt>
              <dd className="mt-2 font-heading text-2xl text-chart-4 tabular-nums sm:text-3xl">
                +{completion.earned_exp}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section
            aria-labelledby="dictation-review-listen-heading"
            className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
              <div className="flex items-center gap-2">
                <Headphones aria-hidden="true" className="size-5" />
                <h3
                  className="text-sm font-heading tracking-wide uppercase"
                  id="dictation-review-listen-heading"
                >
                  Listen to segment
                </h3>
              </div>
              <Badge className="bg-secondary-background text-foreground" variant="neutral">
                #{activeSegment.segment_index + 1}
              </Badge>
            </div>

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
              <>
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  {attempt.audio_url ? (
                    <div className="flex size-full items-center justify-center p-5">
                      <audio
                        className="w-full"
                        controls
                        onEnded={(event) => handleNativePlaybackBoundary(event.currentTarget)}
                        onTimeUpdate={(event) => {
                          if (
                            event.currentTarget.currentTime * 1_000 >=
                            activeSegment.end_time_ms
                          ) {
                            handleNativePlaybackBoundary(event.currentTarget);
                          }
                        }}
                        ref={audioRef}
                        src={attempt.audio_url}
                      />
                    </div>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-secondary-background">
                      <VideoOff aria-hidden="true" className="size-10" />
                      <p className="font-heading">Audio is unavailable for this attempt.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                        Timestamp
                      </p>
                      <p className="mt-0.5 font-heading text-lg tabular-nums">
                        {formatDictationTimestamp(activeSegment.start_time_ms)}–
                        {formatDictationTimestamp(activeSegment.end_time_ms)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        aria-label={`Loop current segment ${isLoopEnabled ? "on" : "off"}`}
                        aria-pressed={isLoopEnabled}
                        className="min-h-10 gap-1.5 font-heading text-xs"
                        onClick={handleLoopToggle}
                        size="sm"
                        type="button"
                        variant={isLoopEnabled ? "default" : "neutral"}
                      >
                        <Repeat2 aria-hidden="true" />
                        Loop {isLoopEnabled ? "on" : "off"}
                      </Button>
                      <Button
                        className="min-h-10 font-heading text-xs"
                        onClick={handleReplay}
                        size="sm"
                        type="button"
                        variant="neutral"
                      >
                        {playbackRequest > 0 ? (
                          <RotateCcw aria-hidden="true" />
                        ) : (
                          <Play aria-hidden="true" />
                        )}
                        Replay segment
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border p-5 sm:p-6">
              <div>
                <p className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                  Answer review
                </p>
                <h3 className="mt-1 font-heading text-2xl">
                  Segment {activeReview.segment_index + 1}
                </h3>
              </div>
              <Badge
                className={cn(
                  activeReview.is_correct && "border-success/50 bg-success/15 text-success",
                  !activeReview.is_correct &&
                    !isUnanswered &&
                    "border-chart-3/50 bg-chart-3/15 text-chart-3",
                  !activeReview.is_correct &&
                    isUnanswered &&
                    "border-border bg-secondary-background text-foreground/60",
                )}
                variant="neutral"
              >
                <ActiveStatusIcon aria-hidden="true" />
                {activeStatusLabel}
              </Badge>
            </div>

            <div className="bg-background p-5 sm:p-7">
              <div
                className={cn(
                  "rounded-base border-2 p-4 sm:p-5",
                  activeReview.is_correct && "border-success/50 bg-success/10",
                  !activeReview.is_correct && !isUnanswered && "border-chart-3/50 bg-chart-3/10",
                  !activeReview.is_correct &&
                    isUnanswered &&
                    "border-border bg-secondary-background",
                )}
              >
                <div className="flex items-start gap-3">
                  <ActiveStatusIcon
                    aria-hidden="true"
                    className={cn("mt-0.5 size-6 shrink-0", activeStatusIconColor)}
                  />
                  <div>
                    <h4 className="font-heading text-lg">
                      {activeReview.is_correct
                        ? "Correct — nicely heard!"
                        : isUnanswered
                          ? "No answer submitted"
                          : "Not quite — compare and retry"}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                      {activeReview.is_correct
                        ? "Your answer matches after normalization."
                        : isUnanswered
                          ? "This segment was not checked during the attempt."
                          : "Review your checked answer against the correct transcript."}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-4 border-t border-border/50 pt-4">
                  <div>
                    <dt className="flex flex-wrap items-center justify-between gap-2 text-xs font-heading tracking-wide uppercase text-foreground/60">
                      <span>Your checked answer</span>
                      <span className="tabular-nums">
                        {formatDictationTimestamp(activeSegment.start_time_ms)}–
                        {formatDictationTimestamp(activeSegment.end_time_ms)}
                      </span>
                    </dt>
                    <dd
                      className={cn(
                        "mt-2 min-h-20 whitespace-pre-wrap rounded-base border-2 border-border bg-background p-4 text-lg leading-relaxed",
                        isUnanswered && "text-foreground/55 italic",
                      )}
                      lang={isUnanswered ? undefined : "ja"}
                    >
                      {isUnanswered ? "No checked answer was submitted." : activeReview.user_answer}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                      Correct transcript
                    </dt>
                    <dd
                      className="mt-2 rounded-base border-2 border-border bg-background p-4 font-heading text-lg leading-relaxed sm:text-xl"
                      lang="ja"
                    >
                      {activeReview.correct_script}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t-2 border-border p-5 sm:p-6">
              <Button
                disabled={activeReviewPosition === 0}
                onClick={handlePrevious}
                type="button"
                variant="neutral"
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
              <Button
                disabled={activeReviewPosition === review.details.length - 1}
                onClick={handleNext}
                type="button"
                variant="neutral"
              >
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </section>

          <section className="rounded-base border-2 border-border bg-secondary-background p-5 shadow-shadow sm:p-6">
            <h3 className="font-heading text-lg">What next?</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">
              Start a fresh attempt to practice again, or return to the lesson catalog.
            </p>
            {startError ? (
              <Alert className="mt-4" variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Unable to start another attempt</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" disabled={isStarting} onClick={onTryAgain} type="button">
                {isStarting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" />
                )}
                {isStarting ? "Starting..." : "Try this lesson again"}
              </Button>
              <Button asChild className="flex-1" variant="neutral">
                <Link href="/lessons">
                  <BookOpenCheck aria-hidden="true" />
                  Back to lessons
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start lg:z-20">
          <DictationPracticeSidebar
            activeSegmentIndex={activeSegmentIndex}
            answers={reviewAnswers}
            checkedCount={checkedReviewCount}
            correctCount={completion.correct_count}
            draftCount={0}
            hideCompletionCard
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
        </div>
      </div>
    </section>
  );
}
