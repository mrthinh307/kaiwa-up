"use client";

import type { DictationAttemptReviewResponse, DictationSegmentItem } from "@kaiwa-app/api-client";
import type { RefObject } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Play,
  Repeat2,
  RotateCcw,
  VideoOff,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatDictationTimestamp } from "../_utils/dictation-formatters";
import { DictationDiffViewer } from "./dictation-diff-viewer";
import { SegmentAudioPlayer } from "./segment-audio-player";

type DictationReviewWorkstationProps = {
  activeReview: DictationAttemptReviewResponse["details"][number];
  activeReviewPosition: number;
  activeSegment: DictationSegmentItem;
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  onLoopToggle: () => void;
  onNativePlaybackBoundary: (audio: HTMLAudioElement) => void;
  onNext: () => void;
  onPlaybackEnded: () => void;
  onPlaybackStop: () => void;
  onPrevious: () => void;
  onReplay: () => void;
  isLoopEnabled: boolean;
  lessonTitle: string;
  playbackRequest: number;
  reviewDetailsLength: number;
  showVideo: boolean;
  youtubeVideoId?: string;
};

export function DictationReviewWorkstation({
  activeReview,
  activeReviewPosition,
  activeSegment,
  audioRef,
  audioUrl,
  autoPlayDelayMs,
  autoPlayOnSegmentChange,
  onLoopToggle,
  onNativePlaybackBoundary,
  onNext,
  onPlaybackEnded,
  onPlaybackStop,
  onPrevious,
  onReplay,
  isLoopEnabled,
  lessonTitle,
  playbackRequest,
  reviewDetailsLength,
  showVideo,
  youtubeVideoId,
}: DictationReviewWorkstationProps) {
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
    <section
      aria-labelledby="dictation-review-workstation-heading"
      className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow"
    >
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

      <div className="border-b-2 border-border bg-background">
        {youtubeVideoId ? (
          <SegmentAudioPlayer
            autoPlayDelayMs={autoPlayDelayMs}
            canContinuePlayback={activeReviewPosition < reviewDetailsLength - 1}
            endTimeMs={activeSegment.end_time_ms}
            hasPlayedActiveSegment={playbackRequest > 0}
            isAutoPlayEnabled={autoPlayOnSegmentChange}
            isLoopEnabled={isLoopEnabled}
            lessonTitle={lessonTitle}
            onEnded={onPlaybackEnded}
            onLoopToggle={onLoopToggle}
            onReplay={onReplay}
            onStop={onPlaybackStop}
            playbackRequest={playbackRequest}
            segmentIndex={activeSegment.segment_index}
            showVideo={showVideo}
            startTimeMs={activeSegment.start_time_ms}
            youtubeVideoId={youtubeVideoId}
          />
        ) : (
          <div className="p-4 sm:p-5">
            {audioUrl ? (
              <audio
                className="w-full"
                controls
                onEnded={(event) => onNativePlaybackBoundary(event.currentTarget)}
                onTimeUpdate={(event) => {
                  if (event.currentTarget.currentTime * 1_000 >= activeSegment.end_time_ms) {
                    onNativePlaybackBoundary(event.currentTarget);
                  }
                }}
                ref={audioRef}
                src={audioUrl}
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
                onClick={onLoopToggle}
                size="sm"
                type="button"
                variant={isLoopEnabled ? "default" : "neutral"}
              >
                <Repeat2 aria-hidden="true" className="size-3.5" />
                Loop {isLoopEnabled ? "on" : "off"}
              </Button>
              <Button
                className="min-h-9 gap-1.5 font-heading text-xs"
                onClick={onReplay}
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

      <div className="space-y-4 p-4 sm:p-5">
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

      <div className="flex items-center justify-between border-t-2 border-border bg-background/50 px-4 py-3 sm:px-5">
        <Button
          className="gap-1.5 font-heading text-xs"
          disabled={activeReviewPosition === 0}
          onClick={onPrevious}
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
            {reviewDetailsLength}
          </span>
        </div>

        <Button
          className="gap-1.5 font-heading text-xs"
          disabled={activeReviewPosition === reviewDetailsLength - 1}
          onClick={onNext}
          size="sm"
          type="button"
          variant="neutral"
        >
          Next
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </section>
  );
}
