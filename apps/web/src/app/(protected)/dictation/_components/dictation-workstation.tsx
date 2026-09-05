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
  Repeat2,
  RotateCcw,
  Send,
  Sparkles,
  VideoOff,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { DictationWorkstationProps } from "../_types/dictation-practice";

import { useDictationSegmentPlayback } from "../_hooks/use-dictation-segment-playback";
import { formatDictationTimestamp } from "../_utils/dictation-formatters";
import { DictationWorkstationFeedback } from "./dictation-workstation-feedback";
import { SegmentAudioPlayer } from "./segment-audio-player";

type SegmentPlaybackBarProps = {
  hasPlayedActiveSegment: boolean;
  isLoopEnabled: boolean;
  onLoopToggle: () => void;
  onReplay: () => void;
};

function SegmentPlaybackBar({
  hasPlayedActiveSegment,
  isLoopEnabled,
  onLoopToggle,
  onReplay,
}: SegmentPlaybackBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-b-2 border-border bg-background/50 px-4 py-2.5 sm:px-6">
      <span className="text-[11px] text-foreground/60 sm:text-xs">
        Listen carefully and transcribe the sentence below
      </span>
      <div className="flex items-center gap-2">
        <Button
          aria-label={`Loop current segment ${isLoopEnabled ? "on" : "off"}`}
          aria-pressed={isLoopEnabled}
          className="gap-1.5 font-heading text-xs sm:text-sm"
          onClick={onLoopToggle}
          size="sm"
          type="button"
          variant={isLoopEnabled ? "default" : "neutral"}
        >
          <Repeat2 aria-hidden="true" />
          Loop {isLoopEnabled ? "on" : "off"}
        </Button>
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
  const isComposingRef = useRef(false);
  const [answerDraft, setAnswerDraft] = useState(activeAnswer);

  const {
    audioRef,
    handleLoopToggle,
    handleNativePlaybackBoundary,
    handlePlaybackEnded,
    handlePlaybackStop,
    handleReplay,
    isLoopEnabled,
    youtubeVideoId,
  } = useDictationSegmentPlayback({
    activeSegmentIndex: activeSegment.segment_index,
    activeSegmentStartTimeMs: activeSegment.start_time_ms,
    audioUrl,
    autoPlayDelayMs,
    autoPlayOnSegmentChange,
    isLastSegment,
    onNext,
    onReplay,
    playbackRequest,
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isComposingRef.current) {
      return;
    }

    if (textarea.value !== activeAnswer) {
      textarea.value = activeAnswer;
    }
    setAnswerDraft(activeAnswer);
  }, [activeAnswer, activeSegment.segment_index]);

  useEffect(() => {
    if (!isChecking && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeSegment.segment_index, isChecking]);

  // Auto-resize textarea according to text content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 80), 220)}px`;
  }, [answerDraft]);

  const hasAnswer = Boolean(answerDraft.trim());
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

      <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow">
        {/* 1. Workstation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border bg-background px-4 py-2.5 sm:px-5 sm:py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-heading text-base sm:text-lg">
              <Sparkles aria-hidden="true" className="size-4.5 text-main" />
              Segment {activeSegment.segment_index + 1}
              <span className="text-xs font-normal text-foreground/60 sm:text-sm">
                / {totalSegments}
              </span>
            </span>

            {/* Status indicator */}
            {isChecked ? (
              isCorrect ? (
                <Badge className="gap-1 border-status-correct-border bg-status-correct-bg font-heading text-status-correct-text shadow-xs">
                  <CheckCircle2 aria-hidden="true" className="size-3.5 text-status-correct-text" />
                  Correct
                </Badge>
              ) : (
                <Badge
                  className="gap-1 border-status-review-border bg-status-review-bg font-heading text-status-review-text shadow-xs"
                  variant="neutral"
                >
                  <XCircle aria-hidden="true" className="size-3.5 text-status-review-text" />
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

          <div className="flex items-center gap-1.5 rounded-base border-2 border-border bg-secondary-background px-2.5 py-0.5 text-xs font-heading tabular-nums text-foreground/75 sm:text-sm">
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
            isLoopEnabled={isLoopEnabled}
            lessonTitle={lessonTitle}
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
        ) : audioUrl ? (
          <div className="flex min-h-20 items-center justify-center bg-secondary-background p-3 sm:p-4">
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
              src={audioUrl}
            />
          </div>
        ) : (
          <div className="flex min-h-20 flex-col items-center justify-center gap-2 bg-black p-4 text-center text-secondary-background">
            <VideoOff aria-hidden="true" className="size-8" />
            <p className="font-heading text-xs sm:text-sm">
              Audio is unavailable for this attempt.
            </p>
          </div>
        )}

        {/* 3. Audio Controls & Shortcut Bar */}
        {!youtubeVideoId ? (
          <SegmentPlaybackBar
            hasPlayedActiveSegment={hasPlayedActiveSegment}
            isLoopEnabled={isLoopEnabled}
            onLoopToggle={handleLoopToggle}
            onReplay={handleReplay}
          />
        ) : null}

        {/* 4. Japanese Input Textarea */}
        <div className="bg-background p-3.5 sm:px-5 sm:py-3.5">
          <Label className="font-heading text-xs sm:text-sm" htmlFor="dictation-segment-answer">
            Your Japanese transcript
          </Label>
          <Textarea
            aria-describedby="dictation-answer-help"
            autoComplete="off"
            className="mt-1.5 min-h-16 max-h-36 resize-none bg-secondary-background p-3 text-base leading-relaxed"
            disabled={isChecking}
            defaultValue={activeAnswer}
            id="dictation-segment-answer"
            lang="ja"
            maxLength={500}
            onChange={(event) => {
              setAnswerDraft(event.target.value);
              onAnswerChange(event.target.value);
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false;
              setAnswerDraft(event.currentTarget.value);
              onAnswerChange(event.currentTarget.value);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
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
          />
          <div
            className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-foreground/60"
            id="dictation-answer-help"
          >
            <span>Punctuation and spaces do not affect comparison.</span>
            <span>{answerDraft.length}/500</span>
          </div>
        </div>

        {/* 5. Unified Action Bar */}
        <div className="grid grid-cols-1 gap-2.5 border-t-2 border-border bg-secondary-background px-4 py-2.5 sm:grid-cols-[auto_1fr_auto] sm:gap-3 sm:px-5 sm:py-2.5">
          <Button
            className="order-2 gap-1.5 font-heading sm:order-1"
            disabled={isChecking || isFirstSegment}
            onClick={onPrevious}
            type="button"
            variant="neutral"
          >
            <ArrowLeft aria-hidden="true" />
            <span>Previous</span>
          </Button>

          <Button
            className={cn(
              "order-1 h-11 w-full gap-2 font-heading text-sm sm:order-2 sm:text-base",
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
                <span>
                  {isChecked
                    ? "Check this answer again"
                    : hasAnswer
                      ? "Check segment"
                      : "Type your answer to check"}
                </span>
              </>
            )}
          </Button>

          <Button
            className="order-3 gap-1.5 font-heading sm:order-3"
            disabled={isChecking || isLastSegment}
            onClick={onNext}
            type="button"
            variant="neutral"
          >
            <span>Next</span>
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>

        {/* 6. Inline Feedback Section with Smart Diff */}
        {activeResult ? (
          <DictationWorkstationFeedback
            activeResult={activeResult}
            showCorrectAnswer={showCorrectAnswer}
          />
        ) : null}
      </div>
    </form>
  );
}
