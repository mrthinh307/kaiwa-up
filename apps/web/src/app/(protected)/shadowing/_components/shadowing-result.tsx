"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { useCallback, useRef, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Button } from "@/components/ui/button";

import { useShadowingResult } from "../_hooks/use-shadowing-result";
import { useShadowingReview } from "../_hooks/use-shadowing-review";
import { useShadowingSettings } from "../_hooks/use-shadowing-settings";
import { formatShadowingTimestamp } from "../_utils/shadowing-formatters";
import { ShadowingAiFeedbackCard } from "./shadowing-ai-feedback-card";
import { ShadowingContinuousReviewCard } from "./shadowing-continuous-review-card";
import { ShadowingProcessingStatus } from "./shadowing-processing-status";
import { ShadowingResultActions } from "./shadowing-result-actions";
import { ShadowingResultBanner } from "./shadowing-result-banner";
import { ShadowingResultToolbar } from "./shadowing-result-toolbar";
import { ShadowingReviewSegmentNav } from "./shadowing-review-segment-nav";
import { ShadowingReviewWorkstation } from "./shadowing-review-workstation";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { ShadowingTranscriptReview } from "./shadowing-transcript-review";
import { ShadowingVideoDock } from "./shadowing-video-dock";

type ShadowingResultProps = {
  onPracticeAgain: () => void;
  review: ShadowingAttemptReviewResponse;
  shouldCelebrate?: boolean;
};

export function ShadowingResult({
  onPracticeAgain,
  review: initialReview,
  shouldCelebrate = false,
}: ShadowingResultProps) {
  const {
    review,
    refresh,
    refreshError,
    actionError,
    aiError,
    isRequestingAi,
    isRetryingTranscriptions,
    requestAiReview,
    retryTranscriptions,
  } = useShadowingResult(initialReview);
  const { showVideo, updateShowVideo } = useShadowingSettings();

  const {
    activeOriginalIndex,
    activeSegment,
    activeSegmentRef,
    handleNextSegment,
    handlePlayOriginalSegment,
    handlePlayUserRecording,
    handlePreviousSegment,
    handleReplaySegment,
    isContinuous,
    isLoopEnabled,
    isPlayingActiveOriginal,
    isPlayingContinuousVoice,
    isPlayingUser,
    player,
    playingUserIndex,
    selectReview,
    selectedReviewIndex,
    toggleContinuousVoicePlayback,
    toggleLoop,
  } = useShadowingReview(review);

  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [feedbackSource, setFeedbackSource] = useState<HTMLButtonElement | null>(null);
  const handleReviewCorrection = (segmentIndex: number, source: HTMLButtonElement) => {
    const position = review.segments.findIndex((segment) => segment.segment_index === segmentIndex);
    if (position < 0) return;
    setFeedbackSource(source);
    selectReview(position);
    requestAnimationFrame(() => {
      reviewHeadingRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      reviewHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  const handleBackToFeedback = () => {
    const target = feedbackSource?.isConnected
      ? feedbackSource
      : document.getElementById("shadowing-ai-feedback-heading");
    target?.scrollIntoView({ behavior: "instant", block: "center" });
    target?.focus({ preventScroll: true });
  };

  const handlePlayActiveOriginal = useCallback(() => {
    if (!activeSegment) return;
    handlePlayOriginalSegment(
      selectedReviewIndex,
      activeSegment.start_time_ms ?? 0,
      activeSegment.end_time_ms ?? 0,
    );
  }, [activeSegment, handlePlayOriginalSegment, selectedReviewIndex]);

  const handlePlayActiveUserTake = useCallback(() => {
    if (!activeSegment) return;
    handlePlayUserRecording(selectedReviewIndex, activeSegment.playback_url);
  }, [activeSegment, handlePlayUserRecording, selectedReviewIndex]);

  return (
    <div className="scroll-mt-24 space-y-3.5 sm:space-y-4" id="shadowing-result-screen">
      {shouldCelebrate ? <ExpRewardOverlay expEarned={review.earned_exp ?? 0} /> : null}

      <ShadowingResultToolbar
        difficulty={review.difficulty}
        lessonTitle={review.title || "Shadowing Review"}
        mode={review.mode}
        onPracticeAgain={onPracticeAgain}
        settings={
          <ShadowingSettingsSheet
            mode={review.mode ?? "segmented"}
            onShowVideoChange={updateShowVideo}
            showVideo={showVideo}
          />
        }
      />

      <ShadowingResultBanner
        attemptNumber={review.attempt_number}
        isContinuous={isContinuous}
        review={review}
      />

      <ShadowingProcessingStatus
        review={review}
        isRetrying={isRetryingTranscriptions}
        errorMessage={refreshError ?? actionError}
        onRetry={retryTranscriptions}
        onRefresh={refresh}
      />

      <ShadowingAiFeedbackCard
        key={review.attempt_id}
        review={review}
        isRequesting={isRequestingAi}
        errorMessage={aiError}
        refreshError={refreshError}
        onRefresh={refresh}
        onPracticeAgain={onPracticeAgain}
        onRequest={requestAiReview}
        onSelectSegment={handleReviewCorrection}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Left Column: Workstation / Continuous Review */}
        <div className="min-w-0 space-y-4 lg:col-span-7">
          {feedbackSource && (
            <Button
              className="min-h-11 whitespace-normal focus-visible:ring-ring"
              onClick={handleBackToFeedback}
              type="button"
              variant="neutral"
            >
              Back to AI feedback
            </Button>
          )}
          {isContinuous ? (
            <>
              <ShadowingContinuousReviewCard
                isPlaying={isPlayingContinuousVoice}
                onTogglePlayback={toggleContinuousVoicePlayback}
                review={review}
              />

              <ShadowingTranscriptReview
                activeOriginalIndex={activeOriginalIndex}
                activeSegmentRef={activeSegmentRef}
                formatTime={formatShadowingTimestamp}
                handlePlayOriginalSegment={handlePlayOriginalSegment}
                handlePlayUserRecording={handlePlayUserRecording}
                isContinuous={isContinuous}
                playingUserIndex={playingUserIndex}
                review={review}
                selectedReviewIndex={selectedReviewIndex}
                selectReview={selectReview}
              />
            </>
          ) : (
            <>
              <ShadowingReviewSegmentNav
                activeSegmentIndex={selectedReviewIndex}
                onSelectSegment={selectReview}
                segments={review.segments}
              />

              {activeSegment && (
                <ShadowingReviewWorkstation
                  activeSegment={activeSegment}
                  activeSegmentIndex={selectedReviewIndex}
                  formatTime={formatShadowingTimestamp}
                  hasNextSegment={selectedReviewIndex < review.segments.length - 1}
                  hasPreviousSegment={selectedReviewIndex > 0}
                  isLoopEnabled={isLoopEnabled}
                  isPlayingOriginal={isPlayingActiveOriginal}
                  isPlayingUser={isPlayingUser}
                  onLoopToggle={toggleLoop}
                  onNextSegment={handleNextSegment}
                  onPlayOriginal={handlePlayActiveOriginal}
                  onPlayUserTake={handlePlayActiveUserTake}
                  onPreviousSegment={handlePreviousSegment}
                  onReplaySegment={handleReplaySegment}
                  totalSegments={review.segments.length}
                />
              )}
            </>
          )}
        </div>

        {/* Right Column: Sticky Video Dock & Actions */}
        <div className="min-w-0 space-y-4 lg:col-span-5 lg:self-start">
          {player.isYouTube && player.youtubeVideoId ? (
            <ShadowingVideoDock
              handleIframeLoad={player.handleIframeLoad}
              isYouTube={player.isYouTube}
              registerIframe={player.registerIframe}
              showVideo={showVideo}
              youtubeVideoId={player.youtubeVideoId}
            />
          ) : null}

          <ShadowingResultActions
            activeSegment={activeSegment}
            isContinuous={isContinuous}
            onPracticeAgain={onPracticeAgain}
          />
        </div>
      </div>
    </div>
  );
}
