"use client";

import type { ShadowingSegmentReviewItem } from "@kaiwa-app/api-client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mic,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ShadowingWordTokens } from "./shadowing-word-tokens";

type ShadowingReviewWorkstationProps = {
  activeSegment: ShadowingSegmentReviewItem;
  activeSegmentIndex: number;
  formatTime: (milliseconds: number) => string;
  hasNextSegment: boolean;
  hasPreviousSegment: boolean;
  isLoopEnabled: boolean;
  isPlayingOriginal: boolean;
  isPlayingUser: boolean;
  onLoopToggle: () => void;
  onNextSegment: () => void;
  onPlayOriginal: () => void;
  onPlayUserTake: () => void;
  onPreviousSegment: () => void;
  onReplaySegment: () => void;
  totalSegments: number;
};

export function ShadowingReviewWorkstation({
  activeSegment,
  activeSegmentIndex,
  formatTime,
  hasNextSegment,
  hasPreviousSegment,
  isLoopEnabled,
  isPlayingOriginal,
  isPlayingUser,
  onLoopToggle,
  onNextSegment,
  onPlayOriginal,
  onPlayUserTake,
  onPreviousSegment,
  onReplaySegment,
  totalSegments,
}: ShadowingReviewWorkstationProps) {
  const startMs = activeSegment.start_time_ms ?? 0;
  const endMs = activeSegment.end_time_ms ?? 0;
  const isRecorded = activeSegment.recorded;
  const hasUserAudio = Boolean(isRecorded && activeSegment.playback_url);
  const score = activeSegment.text_match_score ?? activeSegment.similarity_score;
  const transcriptStatus = activeSegment.transcription_status;
  const transcriptMessage = !isRecorded
    ? "No recording saved for this segment."
    : transcriptStatus === "queued" || transcriptStatus === "processing"
      ? "Comparing your recording..."
      : transcriptStatus === "failed" || transcriptStatus === "unavailable"
        ? "Speech recognition is unavailable for this recording. Retry the comparison above."
        : transcriptStatus === "not_evaluable"
          ? "This transcript could not be compared with the reference."
          : transcriptStatus === "no_speech"
            ? "No speech was recognized in this recording."
            : "Transcript comparison has not been requested.";

  return (
    <section
      aria-labelledby="shadowing-workstation-heading"
      className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border bg-background px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <h3
            className="font-heading text-base text-foreground sm:text-lg"
            id="shadowing-workstation-heading"
          >
            Segment {activeSegment.segment_index + 1}
          </h3>
          <span className="rounded-base border border-border/60 bg-secondary-background px-2 py-0.5 font-mono text-xs tabular-nums text-foreground/75">
            {formatTime(startMs)} – {formatTime(endMs)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {score !== null && score !== undefined && (
            <Badge
              className={cn(
                "font-heading text-xs",
                score >= 80
                  ? "border-status-correct-border bg-status-correct-bg text-status-correct-text dark:border-emerald-400 dark:text-emerald-300"
                  : score >= 50
                    ? "border-status-review-border bg-status-review-bg text-status-review-text dark:border-amber-400 dark:text-amber-300"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
              variant="neutral"
            >
              Text match: {Number(score).toFixed(0)}%
            </Badge>
          )}

          <Badge
            className={cn(
              "gap-1 font-heading text-xs",
              isRecorded
                ? "border-status-correct-border bg-status-correct-bg text-status-correct-text dark:border-emerald-400 dark:text-emerald-300"
                : "border-border bg-secondary-background text-foreground/60",
            )}
            variant="neutral"
          >
            {isRecorded ? (
              <>
                <CheckCircle2 aria-hidden="true" className="size-3.5 stroke-[2.5]" />
                Recorded{" "}
                {activeSegment.duration_seconds ? `(${activeSegment.duration_seconds}s)` : ""}
              </>
            ) : (
              <>
                <XCircle aria-hidden="true" className="size-3.5" />
                Unrecorded
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Main Content Area: Compact, integrated cards */}
      <div className="space-y-3 p-3.5 sm:p-4">
        {/* 1. Target Japanese Sentence with integrated Native Audio Controls */}
        <div
          className={cn(
            "rounded-base border-2 bg-background p-3.5 shadow-2xs transition-all",
            isPlayingOriginal ? "border-main ring-2 ring-main/20" : "border-border",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wide text-foreground/70">
              <Volume2 className={cn("size-3.5 text-main", isPlayingOriginal && "animate-pulse")} />
              Target Japanese Sentence
            </span>

            <div className="flex items-center gap-1.5">
              {isPlayingOriginal && (
                <span className="mr-1 text-[11px] font-heading text-main animate-pulse">
                  Playing
                </span>
              )}
              <Button
                className="h-7.5 gap-1 px-2.5 font-heading text-xs"
                onClick={onPlayOriginal}
                size="sm"
                type="button"
                variant={isPlayingOriginal ? "default" : "neutral"}
              >
                {isPlayingOriginal ? (
                  <>
                    <Pause aria-hidden="true" className="size-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play aria-hidden="true" className="size-3.5" /> Listen
                  </>
                )}
              </Button>

              <Button
                aria-label="Replay segment"
                className="size-7.5 p-0"
                onClick={onReplaySegment}
                size="sm"
                title="Replay from start"
                type="button"
                variant="neutral"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
              </Button>

              <Button
                aria-label={`Toggle segment loop ${isLoopEnabled ? "off" : "on"}`}
                aria-pressed={isLoopEnabled}
                className={cn("size-7.5 p-0", isLoopEnabled && "border-main text-main font-bold")}
                onClick={onLoopToggle}
                size="sm"
                title={`Loop segment ${isLoopEnabled ? "on" : "off"}`}
                type="button"
                variant={isLoopEnabled ? "default" : "neutral"}
              >
                <Repeat2 aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="pt-3">
            <ShadowingWordTokens fallbackText={activeSegment.script} words={activeSegment.words} />
            {activeSegment.extra_spans && activeSegment.extra_spans.length > 0 && (
              <p className="text-sm text-status-review-text">
                Additional recognized words:{" "}
                {activeSegment.extra_spans.map((span) => (
                  <span
                    className="mr-2 whitespace-pre-wrap"
                    key={`${span.start}-${span.end}`}
                    lang="ja"
                  >
                    {span.text}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* 2. Recognized Voice (STT) with integrated User Recording Audio Controls */}
        <div
          className={cn(
            "rounded-base border-2 bg-background p-3.5 shadow-2xs transition-all",
            isPlayingUser
              ? "border-chart-4 ring-2 ring-chart-4/20"
              : hasUserAudio
                ? "border-border"
                : "border-border/70 bg-background/80",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wide text-foreground/70">
              <Mic className={cn("size-3.5 text-main", isPlayingUser && "animate-pulse")} />
              Recognized Voice (STT)
            </span>

            <div className="flex items-center gap-1.5">
              {hasUserAudio ? (
                <>
                  {isPlayingUser && (
                    <span className="mr-1 text-[11px] font-heading text-chart-4 animate-pulse">
                      Playing
                    </span>
                  )}
                  <Button
                    className="h-7.5 gap-1.5 px-2.5 font-heading text-xs"
                    onClick={onPlayUserTake}
                    size="sm"
                    type="button"
                    variant={isPlayingUser ? "default" : "neutral"}
                  >
                    {isPlayingUser ? (
                      <>
                        <Pause aria-hidden="true" className="size-3.5" /> Pause Voice
                      </>
                    ) : (
                      <>
                        <Play aria-hidden="true" className="size-3.5" /> Listen My Recording
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <span className="text-[11px] italic text-foreground/50">
                  {isRecorded ? "Recording unavailable" : "No voice recorded"}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2.5">
            {activeSegment.user_transcript ? (
              <p className="font-heading text-base leading-relaxed text-foreground" lang="ja">
                {activeSegment.user_transcript}
              </p>
            ) : (
              <p aria-live="polite" className="text-xs text-foreground/75">
                {transcriptMessage}
              </p>
            )}
          </div>
          {(activeSegment.duration_ms ?? 0) > 0 && (activeSegment.duration_ms ?? 0) < 2000 && (
            <p className="mt-2 text-xs text-foreground/75">
              This recording can be compared, but it is under two seconds and does not count toward
              completion.
            </p>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t-2 border-border bg-background/50 px-4 py-2.5 sm:px-5">
        <Button
          className="gap-1.5 font-heading text-xs"
          disabled={!hasPreviousSegment}
          onClick={onPreviousSegment}
          size="sm"
          type="button"
          variant="neutral"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Previous
        </Button>

        <div className="flex items-center gap-2 text-xs text-foreground/75">
          <span>
            Segment <strong className="text-foreground">{activeSegmentIndex + 1}</strong> of{" "}
            {totalSegments}
          </span>
        </div>

        <Button
          className="gap-1.5 font-heading text-xs"
          disabled={!hasNextSegment}
          onClick={onNextSegment}
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
