"use client";

import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type {
  DictationKeyboardShortcut,
  DictationResultProps,
  DictationSegmentMapResult,
} from "../_types/dictation-practice";

import { useDictationSegmentPlayback } from "../_hooks/use-dictation-segment-playback";
import { useDictationSettings } from "../_hooks/use-dictation-settings";
import { usePracticeShortcuts } from "../_hooks/use-practice-shortcuts";
import { DictationPracticeSidebar } from "./dictation-practice-sidebar";
import { DictationResultSummary } from "./dictation-result-summary";
import { DictationReviewWorkstation } from "./dictation-review-workstation";
import { DictationSettingsSheet } from "./dictation-settings-sheet";
import { DictationToolbar } from "./dictation-toolbar";

const RESULT_SHORTCUTS: readonly DictationKeyboardShortcut[] = [
  { action: "Play or pause audio", keyLabel: "⎵" },
  { action: "Next segment", keyLabel: "→" },
  { action: "Previous segment", keyLabel: "←" },
];

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
  const [playbackRequest, setPlaybackRequest] = useState(0);

  const firstIncorrectPosition = review.details.findIndex((detail) => !detail.is_correct);
  const [activeReviewPosition, setActiveReviewPosition] = useState(
    firstIncorrectPosition >= 0 ? firstIncorrectPosition : 0,
  );
  const activeReview = review.details.at(activeReviewPosition);
  const activeSegment = activeReview
    ? attempt.segments.find((segment) => segment.segment_index === activeReview.segment_index)
    : undefined;

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

  const requestReplay = useCallback(() => {
    if (!activeSegment) {
      return;
    }
    setPlaybackRequest((current) => current + 1);
  }, [activeSegment]);

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
    activeSegmentIndex: activeReviewPosition,
    activeSegmentStartTimeMs: activeSegment?.start_time_ms ?? 0,
    audioUrl: attempt.audio_url,
    autoPlayDelayMs,
    autoPlayOnSegmentChange,
    initialAutoPlayEnabled: true,
    isLastSegment: activeReviewPosition >= review.details.length - 1,
    onNext: handleNext,
    onReplay: requestReplay,
    playbackRequest,
    resetAudioOnSegmentChange: false,
  });

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

  return (
    <div className="scroll-mt-24 space-y-3.5 sm:space-y-4" id="dictation-result-screen">
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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-7">
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

          <DictationReviewWorkstation
            activeReview={activeReview}
            activeReviewPosition={activeReviewPosition}
            activeSegment={activeSegment}
            audioRef={audioRef}
            audioUrl={attempt.audio_url}
            autoPlayDelayMs={autoPlayDelayMs}
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            handleLoopToggle={handleLoopToggle}
            handleNativePlaybackBoundary={handleNativePlaybackBoundary}
            handleNext={handleNext}
            handlePlaybackEnded={handlePlaybackEnded}
            handlePlaybackStop={handlePlaybackStop}
            handlePrevious={handlePrevious}
            handleReplay={handleReplay}
            isLoopEnabled={isLoopEnabled}
            lessonTitle={content.title}
            playbackRequest={playbackRequest}
            reviewDetailsLength={review.details.length}
            showVideo={showVideo}
            youtubeVideoId={youtubeVideoId}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:z-20 lg:col-span-5 lg:self-start">
          {showVideo && youtubeVideoId ? (
            <section
              aria-label="Video segment player"
              className="overflow-hidden rounded-base border-2 border-border bg-black shadow-shadow"
            >
              <div className="relative aspect-video w-full" id="dictation-video-dock" />
            </section>
          ) : null}

          <DictationResultSummary
            activeReview={activeReview}
            attemptNumber={attempt.attempt_number}
            completion={completion}
            isStarting={isStarting}
            onTryAgain={onTryAgain}
            startError={startError}
          />
        </div>
      </div>
    </div>
  );
}
