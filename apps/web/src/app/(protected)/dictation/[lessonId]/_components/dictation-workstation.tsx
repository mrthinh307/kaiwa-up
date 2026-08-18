"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
  PencilLine,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  VideoOff,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { DictationWorkstationProps } from "../../_types/dictation-practice";

import { formatDictationTimestamp, getYouTubeVideoId } from "../../_utils/dictation-formatters";
import { SegmentAudioPlayer } from "./segment-audio-player";

type SegmentPlaybackBarProps = {
  hasPlayedActiveSegment: boolean;
  onReplay: () => void;
};

function SegmentPlaybackBar({ hasPlayedActiveSegment, onReplay }: SegmentPlaybackBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-b-2 border-border bg-background/50 px-4 py-2.5 sm:px-6">
      <span className="text-[11px] text-foreground/60 sm:text-xs">
        Listen carefully and transcribe the sentence below
      </span>
      <div className="flex items-center gap-2">
        <Button
          className="font-heading text-xs sm:text-sm"
          onClick={onReplay}
          size="sm"
          type="button"
          variant="neutral"
        >
          {hasPlayedActiveSegment ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
          {hasPlayedActiveSegment ? "Replay segment" : "Play segment"}
        </Button>
      </div>
    </div>
  );
}

export function DictationWorkstation({
  activeAnswer,
  activeResult,
  activeSegment,
  activeSegmentIndex: _activeSegmentIndex,
  audioUrl,
  autoPlayDelayMs,
  autoPlayOnSegmentChange,
  hasPlayedActiveSegment,
  isChecking,
  isFirstSegment,
  isLastSegment,
  lessonTitle,
  onAnswerChange,
  onNext,
  onPrevious,
  onReplay,
  onSubmit,
  playbackRequest,
  showVideo,
  showCorrectAnswer,
  submitError,
  totalSegments,
}: DictationWorkstationProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scheduledPlaybackTimeoutRef = useRef<number | null>(null);
  const shouldContinuePlaybackRef = useRef(false);
  const previousAutoPlayEnabledRef = useRef(autoPlayOnSegmentChange);
  const previousSegmentIndexRef = useRef(activeSegment.segment_index);
  const lastPlaybackRequestRef = useRef(playbackRequest);

  const youtubeVideoId = useMemo(() => getYouTubeVideoId(audioUrl), [audioUrl]);

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
      onReplay();
    }, autoPlayDelayMs);
  }, [autoPlayDelayMs, clearScheduledPlayback, onReplay]);

  useEffect(() => clearScheduledPlayback, [clearScheduledPlayback]);

  useEffect(() => {
    const wasAutoPlayEnabled = previousAutoPlayEnabledRef.current;
    previousAutoPlayEnabledRef.current = autoPlayOnSegmentChange;

    if (!autoPlayOnSegmentChange) {
      shouldContinuePlaybackRef.current = false;
      clearScheduledPlayback();
      return;
    }

    if (!wasAutoPlayEnabled) {
      schedulePlayback();
    }
  }, [autoPlayOnSegmentChange, clearScheduledPlayback, schedulePlayback]);

  useEffect(() => {
    const hasSegmentChanged = previousSegmentIndexRef.current !== activeSegment.segment_index;
    previousSegmentIndexRef.current = activeSegment.segment_index;

    if (!hasSegmentChanged || !autoPlayOnSegmentChange || shouldContinuePlaybackRef.current) {
      return;
    }

    schedulePlayback();
  }, [activeSegment.segment_index, autoPlayOnSegmentChange, schedulePlayback]);

  useEffect(() => {
    if (!shouldContinuePlaybackRef.current) {
      return;
    }

    shouldContinuePlaybackRef.current = false;
    schedulePlayback();
  }, [activeSegment.segment_index, schedulePlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = activeSegment.start_time_ms / 1_000;
  }, [activeSegment.segment_index, activeSegment.start_time_ms]);

  useEffect(() => {
    if (playbackRequest === lastPlaybackRequestRef.current) {
      return;
    }

    lastPlaybackRequestRef.current = playbackRequest;
    const audio = audioRef.current;
    if (playbackRequest === 0 || !audio) {
      return;
    }

    audio.currentTime = activeSegment.start_time_ms / 1_000;
    void audio.play().catch(() => undefined);
  }, [activeSegment.segment_index, activeSegment.start_time_ms, playbackRequest]);

  // Auto-resize textarea according to text content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 80), 220)}px`;
  }, [activeAnswer]);

  const handleReplayClick = () => {
    onReplay();
  };

  const handlePlaybackEnded = useCallback(() => {
    if (!autoPlayOnSegmentChange || isLastSegment) {
      return;
    }

    shouldContinuePlaybackRef.current = true;
    onNext();
  }, [autoPlayOnSegmentChange, isLastSegment, onNext]);

  const handlePlaybackStop = useCallback(() => {
    shouldContinuePlaybackRef.current = false;
    clearScheduledPlayback();
  }, [clearScheduledPlayback]);

  const hasAnswer = Boolean(activeAnswer.trim());
  const isChecked = Boolean(activeResult);
  const isCorrect = activeResult?.is_correct;

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to check this segment</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
        {/* 1. Workstation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border bg-background p-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-heading text-lg sm:text-xl">
              <Sparkles aria-hidden="true" className="size-5 text-main" />
              Segment {activeSegment.segment_index + 1}
              <span className="text-sm font-normal text-foreground/60">/ {totalSegments}</span>
            </span>

            {/* Status indicator */}
            {isChecked ? (
              isCorrect ? (
                <Badge className="gap-1 bg-success text-main-foreground shadow-xs">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  Correct
                </Badge>
              ) : (
                <Badge
                  className="gap-1 border-chart-3/50 bg-chart-3/15 text-chart-3"
                  variant="neutral"
                >
                  <XCircle aria-hidden="true" className="size-3.5" />
                  Needs review
                </Badge>
              )
            ) : hasAnswer ? (
              <Badge className="gap-1" variant="neutral">
                <PencilLine aria-hidden="true" className="size-3.5" />
                Draft saved
              </Badge>
            ) : (
              <Badge className="gap-1 opacity-70" variant="neutral">
                <Circle aria-hidden="true" className="size-3" />
                Not started
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-base border-2 border-border bg-secondary-background px-3 py-1 text-xs font-heading tabular-nums text-foreground/75 sm:text-sm">
            <Clock3 aria-hidden="true" className="size-3.5 text-foreground/60" />
            {formatDictationTimestamp(activeSegment.start_time_ms)}–
            {formatDictationTimestamp(activeSegment.end_time_ms)}
          </div>
        </div>

        {/* 2. Embedded Video Player */}
        {youtubeVideoId ? (
          <SegmentAudioPlayer
            autoPlayDelayMs={autoPlayDelayMs}
            canContinuePlayback={!isLastSegment}
            endTimeMs={activeSegment.end_time_ms}
            hasPlayedActiveSegment={hasPlayedActiveSegment}
            isAutoPlayEnabled={autoPlayOnSegmentChange}
            lessonTitle={lessonTitle}
            onEnded={handlePlaybackEnded}
            onReplay={handleReplayClick}
            onStop={handlePlaybackStop}
            playbackRequest={playbackRequest}
            segmentIndex={activeSegment.segment_index}
            showVideo={showVideo}
            startTimeMs={activeSegment.start_time_ms}
            youtubeVideoId={youtubeVideoId}
          />
        ) : audioUrl ? (
          <div className="flex min-h-24 items-center justify-center bg-secondary-background p-4 sm:p-5">
            <audio
              className="w-full"
              controls
              onTimeUpdate={(event) => {
                if (event.currentTarget.currentTime * 1_000 >= activeSegment.end_time_ms) {
                  event.currentTarget.pause();
                  handlePlaybackEnded();
                }
              }}
              ref={audioRef}
              src={audioUrl}
            />
          </div>
        ) : (
          <div className="flex min-h-24 flex-col items-center justify-center gap-3 bg-black p-6 text-center text-secondary-background">
            <VideoOff aria-hidden="true" className="size-10" />
            <p className="font-heading">Audio is unavailable for this attempt.</p>
          </div>
        )}

        {/* 3. Audio Controls & Shortcut Bar */}
        {!youtubeVideoId ? (
          <SegmentPlaybackBar
            hasPlayedActiveSegment={hasPlayedActiveSegment}
            onReplay={handleReplayClick}
          />
        ) : null}

        {/* 4. Japanese Input Textarea */}
        <div className="bg-background p-4 sm:p-6">
          <Label className="font-heading text-sm sm:text-base" htmlFor="dictation-segment-answer">
            Your Japanese transcript
          </Label>
          <Textarea
            aria-describedby="dictation-answer-help"
            autoComplete="off"
            className="mt-2 min-h-20 max-h-56 resize-none bg-secondary-background p-3.5 text-base leading-relaxed sm:text-lg"
            disabled={isChecking}
            id="dictation-segment-answer"
            lang="ja"
            maxLength={500}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey) &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="聞こえた日本語を入力してください…"
            ref={textareaRef}
            spellCheck={false}
            value={activeAnswer}
          />
          <div
            className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-foreground/60 sm:text-xs"
            id="dictation-answer-help"
          >
            <span>Punctuation and spaces do not affect comparison.</span>
            <span>{activeAnswer.length}/500</span>
          </div>
        </div>

        {/* 5. Unified Action Bar */}
        <div className="grid grid-cols-1 gap-2.5 border-t-2 border-border bg-secondary-background p-4 sm:grid-cols-[auto_1fr_auto] sm:gap-3 sm:px-6 sm:py-4">
          <Button
            className="order-2 font-heading sm:order-1"
            disabled={isChecking || isFirstSegment}
            onClick={onPrevious}
            type="button"
            variant="neutral"
          >
            <ArrowLeft aria-hidden="true" />
            Previous
          </Button>

          <Button
            className={cn(
              "order-1 h-10 w-full font-heading text-sm sm:order-2 sm:text-base",
              !hasAnswer && "opacity-75",
            )}
            disabled={isChecking || !hasAnswer}
            size="lg"
            type="submit"
          >
            {isChecking ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Checking segment...
              </>
            ) : (
              <>
                <Send aria-hidden="true" />
                {isChecked
                  ? "Check this answer again"
                  : hasAnswer
                    ? "Check segment"
                    : "Type your answer to check"}
              </>
            )}
          </Button>

          <Button
            className="order-3 font-heading sm:order-3"
            disabled={isChecking || isLastSegment}
            onClick={onNext}
            type="button"
            variant="neutral"
          >
            Next
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>

        {/* 6. Inline Feedback Section */}
        {activeResult ? (
          <div
            aria-live="polite"
            className="border-t-2 border-border bg-background p-4 outline-none sm:p-6"
            id="dictation-segment-feedback"
            tabIndex={-1}
          >
            <div
              className={cn(
                "rounded-base border-2 border-border p-4 shadow-xs",
                activeResult.is_correct
                  ? "border-success/50 bg-success/10 text-foreground"
                  : "border-chart-3/50 bg-chart-3/10 text-foreground",
              )}
            >
              <div className="flex items-start gap-3">
                {activeResult.is_correct ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-6 shrink-0 text-success"
                  />
                ) : (
                  <XCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-chart-3" />
                )}
                <div className="flex-1">
                  <h3 className="font-heading text-base sm:text-lg">
                    {activeResult.is_correct
                      ? "Correct — nicely heard!"
                      : "Not quite — compare and retry"}
                  </h3>
                  <p className="mt-0.5 text-xs text-foreground/75 sm:text-sm">
                    {activeResult.is_correct
                      ? "Your answer matches after normalization. You can continue to the next segment."
                      : showCorrectAnswer
                        ? "Review the correct transcript below, replay the audio, and try checking again."
                        : "Your answer does not match. You can reveal the correct transcript from Settings."}
                  </p>
                </div>
              </div>

              {showCorrectAnswer ? (
                <dl className="mt-4 grid gap-3 border-t border-border/40 pt-3 text-xs sm:text-sm">
                  {!activeResult.is_correct ? (
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-foreground/60">
                        Your checked answer
                      </dt>
                      <dd
                        className="mt-1 whitespace-pre-wrap rounded-base border border-border bg-background p-2.5 font-sans leading-relaxed"
                        lang="ja"
                      >
                        {activeResult.user_answer}
                      </dd>
                    </div>
                  ) : null}

                  <div>
                    <dt className="font-heading text-[11px] uppercase tracking-wide text-foreground/60">
                      Correct transcript
                    </dt>
                    <dd
                      className="mt-1 rounded-base border-2 border-border bg-background p-3 font-heading text-base leading-relaxed sm:text-lg"
                      lang="ja"
                    >
                      {activeResult.correct_script}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
