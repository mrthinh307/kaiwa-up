"use client";

import type { ShadowingAttemptPracticeResponse } from "@kaiwa-app/api-client";

import { InfoIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useShadowingPracticeSession } from "../_hooks/use-shadowing-practice-session";
import { useShadowingSettings } from "../_hooks/use-shadowing-settings";
import { useShadowingShortcuts } from "../_hooks/use-shadowing-shortcuts";
import { useShadowingVoiceTake } from "../_hooks/use-shadowing-voice-take";
import { CompactShadowingToolbar } from "./compact-shadowing-toolbar";
import { ShadowingHeroPlayer } from "./shadowing-hero-player";
import { ShadowingHeroSubtitle } from "./shadowing-hero-subtitle";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { ShadowingTransportBar } from "./shadowing-transport-bar";
import { TranscriptCard } from "./transcript-card";
type ShadowingPracticeScreenProps = {
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
  practice: ShadowingAttemptPracticeResponse;
};

export function ShadowingPracticeScreen({
  onAttemptCompleted,
  onAttemptNotInProgress,
  practice,
}: ShadowingPracticeScreenProps) {
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const finishingRef = useRef(false);
  const {
    autoPlayOnSegmentChange,
    autoSplitRecording,
    showVideo,
    updateAutoPlayOnSegmentChange,
    updateAutoSplitRecording,
    updateShowVideo,
  } = useShadowingSettings();

  const {
    activeSegment,
    currentSavedAudioUrl,
    currentSegmentDuration,
    currentSegmentRecorded,
    currentTimeMs,
    handleFinishAttempt,
    handleNextSegment,
    handleNextUnrecordedSegment,
    handlePreviousSegment,
    handlePreviousUnrecordedSegment,
    handleRecordComplete,
    handleSelectSegment,
    handleTogglePlay,
    hasNextSegment,
    hasPreviousSegment,
    isPlayerPlaying,
    isSubmitting,
    failedUploadCount,
    retryFailedUploads,
    lesson,
    player,
    practiceMode,
    recordedCount,
    recordedSegments,
    selectedSegmentIndex,
    totalSegments,
    transcriptSegments,
  } = useShadowingPracticeSession({
    autoPlayOnSegmentChange,
    onAttemptCompleted,
    onAttemptNotInProgress,
    practice,
  });
  const isContinuous = practiceMode === "continuous";

  const {
    displayDuration,
    finalizeRecording,
    resumeRecording,
    effectiveAudioUrl,
    handleStartRecording,
    handleStopRecording,
    handleToggleRecord,
    hasCompletedRecording,
    isPlayingSelf,
    isRecording,
    recordingTime,
    togglePlaySelf,
  } = useShadowingVoiceTake({
    activeSegmentIndex: practiceMode === "continuous" ? 0 : selectedSegmentIndex,
    autoSplitRecording: practiceMode === "segmented" && autoSplitRecording,
    isContinuous,
    isRecorded: currentSegmentRecorded,
    onRecordComplete: handleRecordComplete,
    player,
    savedAudioUrl: currentSavedAudioUrl,
    savedDurationSeconds: currentSegmentDuration,
  });

  const handleFinish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinalizingRecording(true);
    try {
      await finalizeRecording();
      await handleFinishAttempt();
    } catch (error: unknown) {
      toast.error("Could not finish recording", {
        description: error instanceof Error ? error.message : "Please try recording again.",
      });
    } finally {
      resumeRecording();
      finishingRef.current = false;
      setIsFinalizingRecording(false);
    }
  }, [finalizeRecording, handleFinishAttempt, resumeRecording]);

  useShadowingShortcuts({
    disabled: isSubmitting || isFinalizingRecording,
    onNext: isContinuous ? undefined : handleNextSegment,
    onNextUnrecorded: isContinuous ? undefined : handleNextUnrecordedSegment,
    onPrevious: isContinuous ? undefined : handlePreviousSegment,
    onPreviousUnrecorded: isContinuous ? undefined : handlePreviousUnrecordedSegment,
    onTogglePlay: handleTogglePlay,
    onToggleRecord: handleToggleRecord,
  });

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      player.changePlaybackRate(rate);
    },
    [player],
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Breadcrumbs & Utility Toolbar */}
      <CompactShadowingToolbar
        difficulty={lesson.difficulty ?? "N4"}
        isCompleting={isSubmitting || isFinalizingRecording}
        lessonTitle={lesson.title}
        mode={practiceMode}
        onComplete={handleFinish}
        recordedCount={recordedCount}
        settings={
          <ShadowingSettingsSheet
            autoSplitRecording={autoSplitRecording}
            mode={practiceMode}
            onAutoSplitRecordingChange={updateAutoSplitRecording}
            onShowVideoChange={updateShowVideo}
            showVideo={showVideo}
          />
        }
        totalSegments={totalSegments}
      />

      {failedUploadCount > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-base border-2 border-border bg-secondary-background p-3 text-sm"
        >
          <InfoIcon className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            {failedUploadCount} segments upload failed. Your recordings are kept for retry.
          </span>
          <Button
            disabled={isSubmitting || isFinalizingRecording}
            onClick={retryFailedUploads}
            size="sm"
            variant="neutral"
          >
            Retry uploads
          </Button>
        </div>
      )}

      {/* 2-Column Responsive Layout (8:4 Ratio) */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Left Column (8 cols): Hero Video (or Audio Bar if hidden) + Transport + Hero Subtitle */}
        <div className="space-y-3.5 sm:space-y-4 lg:col-span-8">
          {/* 1. Hero Player (renders in sr-only when showVideo is false to maintain audio) */}
          <ShadowingHeroPlayer
            currentTime={player.currentTime}
            duration={player.duration}
            handleIframeLoad={player.handleIframeLoad}
            isMuted={player.isMuted}
            isPlaying={player.isPlaying}
            isYouTube={player.isYouTube}
            onSeek={player.seek}
            onToggleMute={player.toggleMute}
            onTogglePlay={handleTogglePlay}
            onVolumeChange={player.setVolume}
            playbackRate={player.playbackRate}
            registerIframe={player.registerIframe}
            showVideo={showVideo}
            volume={player.volume}
            youtubeVideoId={player.youtubeVideoId}
          />

          {/* 2. Unified Transport Bar */}
          <ShadowingTransportBar
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            hasNextSegment={hasNextSegment}
            hasPreviousSegment={hasPreviousSegment}
            hasRecordedTake={hasCompletedRecording}
            isPlaying={player.isPlaying}
            isPlayingRecordedTake={isPlayingSelf}
            isRecording={isRecording}
            isContinuous={isContinuous}
            onNextSegment={handleNextSegment}
            onNextUnrecordedSegment={handleNextUnrecordedSegment}
            onPlaybackRateChange={handlePlaybackRateChange}
            onPreviousSegment={handlePreviousSegment}
            onPreviousUnrecordedSegment={handlePreviousUnrecordedSegment}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onToggleAutoPause={updateAutoPlayOnSegmentChange}
            onTogglePlay={handleTogglePlay}
            onToggleRecordedTake={togglePlaySelf}
            playbackRate={player.playbackRate}
            recordedDuration={displayDuration}
            recordedTakeAvailable={Boolean(effectiveAudioUrl)}
            recordingTime={recordingTime}
          />

          <ShadowingHeroSubtitle activeSegment={activeSegment} />
        </div>

        {/* Right Column (4 cols): "TRANSCRIPT" (Synchronized Speech-Bubble Feed) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
          <TranscriptCard
            currentTimeMs={currentTimeMs}
            isPlayerPlaying={isPlayerPlaying}
            mode={practiceMode}
            onSelectSegment={handleSelectSegment}
            recordedSegments={recordedSegments}
            selectedSegmentIndex={selectedSegmentIndex}
            transcript={transcriptSegments}
          />
        </div>
      </div>
    </div>
  );
}
