"use client";

import type { ShadowingAttemptPracticeResponse } from "@kaiwa-app/api-client";

import { useRef, useState } from "react";

import { useShadowingPracticeSession } from "../_hooks/use-shadowing-practice-session";
import { AudioPlayerCard } from "./audio-player-card";
import { CompactShadowingToolbar } from "./compact-shadowing-toolbar";
import { RecorderCard, type RecorderCardHandle } from "./recorder-card";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
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
  const recorderRef = useRef<RecorderCardHandle | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  const [autoPlayDelaySeconds, setAutoPlayDelaySeconds] = useState(0.5);
  const {
    activeSegment,
    continuousFormatted,
    currentSavedAudioUrl,
    currentSegmentDuration,
    currentSegmentRecorded,
    currentTimeMs,
    handleFinishAttempt,
    handleNextSegment,
    handlePreviousSegment,
    handleRecordComplete,
    handleReplaySegment,
    handleSelectSegment,
    handleTogglePlay,
    hasNextSegment,
    hasPreviousSegment,
    isContinuous,
    isSubmitting,
    lesson,
    player,
    practiceMode,
    recordedCount,
    recordedSegments,
    selectedSegmentIndex,
    totalSegments,
    transcriptSegments,
  } = useShadowingPracticeSession({
    onAttemptCompleted,
    onAttemptNotInProgress,
    practice,
    recorderRef,
  });

  return (
    <div className="space-y-6">
      <CompactShadowingToolbar
        continuousDurationFormatted={continuousFormatted}
        difficulty={lesson.difficulty ?? "N4"}
        isCompleting={isSubmitting}
        lessonTitle={lesson.title}
        mode={practiceMode}
        onComplete={handleFinishAttempt}
        recordedCount={recordedCount}
        settings={
          <ShadowingSettingsSheet
            autoPlayDelaySeconds={autoPlayDelaySeconds}
            mode={practiceMode}
            onAutoPlayDelayChange={setAutoPlayDelaySeconds}
            onShowVideoChange={setShowVideo}
            showVideo={showVideo}
          />
        }
        totalSegments={totalSegments}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <AudioPlayerCard
            audioUrl={lesson.audio_url ?? ""}
            durationSeconds={lesson.duration_seconds}
            hasNextSegment={hasNextSegment}
            hasPreviousSegment={hasPreviousSegment}
            mode={practiceMode}
            onNextSegment={handleNextSegment}
            onPreviousSegment={handlePreviousSegment}
            onReplaySegment={isContinuous ? undefined : handleReplaySegment}
            onTogglePlay={handleTogglePlay}
            player={player}
            showVideo={showVideo}
          />

          <RecorderCard
            isRecorded={currentSegmentRecorded}
            isSubmitting={isSubmitting}
            key={
              isContinuous ? "recorder-continuous" : `recorder-segmented-${selectedSegmentIndex}`
            }
            mode={practiceMode}
            onComplete={handleRecordComplete}
            ref={recorderRef}
            savedAudioUrl={currentSavedAudioUrl}
            savedDurationSeconds={currentSegmentDuration}
            segmentIndex={selectedSegmentIndex}
            segmentScript={activeSegment?.script}
            totalSegments={totalSegments}
          />
        </div>

        <div className="lg:col-span-5">
          <TranscriptCard
            currentTimeMs={currentTimeMs}
            isPlayerPlaying={player.isPlaying}
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
