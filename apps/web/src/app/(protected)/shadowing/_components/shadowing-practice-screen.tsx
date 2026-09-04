"use client";

import type { ShadowingAttemptPracticeResponse, TranscriptSegment } from "@kaiwa-app/api-client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  recordShadowingContinuous,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { useShadowingShortcuts } from "../_hooks/use-shadowing-shortcuts";
import { formatShadowingDuration } from "../_utils/shadowing-formatters";
import { AudioPlayerCard } from "./audio-player-card";
import { CompactShadowingToolbar } from "./compact-shadowing-toolbar";
import { RecorderCard, type RecorderCardHandle } from "./recorder-card";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { TranscriptCard } from "./transcript-card";

type SegmentRecordState = {
  durationSeconds: number;
  playbackUrl?: string;
  recorded: boolean;
  recordingId?: string;
};

type ShadowingPracticeScreenProps = {
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
  practice: ShadowingAttemptPracticeResponse;
};

function buildRecordedSegments(
  practice: ShadowingAttemptPracticeResponse,
): Record<string, SegmentRecordState> {
  return Object.fromEntries(
    (practice.attempt.recorded_segments ?? []).map((segment) => [
      segment.segment_id,
      {
        durationSeconds: segment.duration_seconds,
        playbackUrl: segment.playback_url ?? undefined,
        recorded: true,
        recordingId: segment.recording_id,
      },
    ]),
  );
}

export function ShadowingPracticeScreen({
  onAttemptCompleted,
  onAttemptNotInProgress,
  practice,
}: ShadowingPracticeScreenProps) {
  const { protectedRequest } = useAuth();
  const { attempt, content: lesson } = practice;
  const practiceMode = attempt.mode;
  const currentAttemptId = attempt.attempt_id;
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [recordedSegments, setRecordedSegments] = useState<Record<string, SegmentRecordState>>(() =>
    buildRecordedSegments(practice),
  );
  const [continuousDurationSeconds, setContinuousDurationSeconds] = useState(
    attempt.continuous_recording?.duration_seconds ?? 0,
  );
  const [continuousAudioUrl, setContinuousAudioUrl] = useState<string | null>(
    attempt.continuous_recording?.playback_url ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [autoPlayDelaySeconds, setAutoPlayDelaySeconds] = useState(0.5);
  const recorderRef = useRef<RecorderCardHandle | null>(null);

  const transcriptSegments: TranscriptSegment[] = useMemo(
    () => (Array.isArray(lesson.transcript) ? lesson.transcript : []),
    [lesson.transcript],
  );
  const isContinuous = practiceMode === "continuous";
  const player = useAudioPlayer(lesson.audio_url ?? "", lesson.duration_seconds ?? 0, {
    segments: isContinuous ? [] : transcriptSegments,
  });
  const currentTimeMs = player.currentTime * 1000;
  const activeSegment = transcriptSegments[selectedSegmentIndex];
  const hasPreviousSegment = !isContinuous && selectedSegmentIndex > 0;
  const hasNextSegment = !isContinuous && selectedSegmentIndex < transcriptSegments.length - 1;

  const handleSelectSegment = useCallback(
    (index: number) => {
      if (index < 0 || index >= transcriptSegments.length) return;

      setSelectedSegmentIndex(index);
      const segment = transcriptSegments[index];
      if (!segment) return;

      if (isContinuous) {
        player.seek(segment.start_time_ms / 1000);
        player.play();
      } else {
        player.playSegment(segment.start_time_ms / 1000);
      }
    },
    [isContinuous, player, transcriptSegments],
  );

  const handlePreviousSegment = useCallback(() => {
    if (selectedSegmentIndex > 0) {
      handleSelectSegment(selectedSegmentIndex - 1);
    }
  }, [handleSelectSegment, selectedSegmentIndex]);

  const handleNextSegment = useCallback(() => {
    if (selectedSegmentIndex < transcriptSegments.length - 1) {
      handleSelectSegment(selectedSegmentIndex + 1);
    }
  }, [handleSelectSegment, selectedSegmentIndex, transcriptSegments.length]);

  const handleReplaySegment = useCallback(() => {
    if (!activeSegment) return;
    player.playSegment(activeSegment.start_time_ms / 1000, activeSegment.end_time_ms / 1000);
  }, [activeSegment, player]);

  const handleTogglePlay = useCallback(() => {
    player.togglePlay();
  }, [player]);

  useShadowingShortcuts({
    disabled: isSubmitting,
    onNext: isContinuous ? undefined : handleNextSegment,
    onPrevious: isContinuous ? undefined : handlePreviousSegment,
    onTogglePlay: handleTogglePlay,
    onToggleRecord: () => {
      recorderRef.current?.toggleRecording();
    },
  });

  const handleRecordComplete = async ({
    audioBlob,
    durationMs,
    segmentIndex: targetSegmentIndex,
  }: {
    audioBlob: Blob | null;
    durationMs: number;
    segmentIndex?: number;
  }) => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    try {
      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

      if (isContinuous) {
        const localBlobUrl = URL.createObjectURL(audioBlob);
        setContinuousAudioUrl(localBlobUrl);
        setContinuousDurationSeconds(durationSeconds);

        const response = await protectedRequest(() =>
          recordShadowingContinuous({
            body: {
              attempt_id: currentAttemptId,
              audio_file: audioFile,
              duration_seconds: durationSeconds,
            },
            path: { content_id: lesson.id },
          }),
        );

        if (response.data) {
          setContinuousDurationSeconds(response.data.duration_seconds);
          toast.success("Continuous recording saved!");
        } else {
          const failure = parseApiFailure(response);
          if (failure.code === "shadowing_attempt_not_in_progress") {
            onAttemptNotInProgress();
          } else {
            toast.error("Recording upload failed", { description: failure.message });
          }
        }
      } else {
        const segmentIndex = targetSegmentIndex ?? selectedSegmentIndex;
        const segmentId = String(segmentIndex);
        const localBlobUrl = URL.createObjectURL(audioBlob);

        setRecordedSegments((currentSegments) => ({
          ...currentSegments,
          [segmentId]: {
            durationSeconds,
            playbackUrl: localBlobUrl,
            recorded: true,
          },
        }));

        const response = await protectedRequest(() =>
          recordShadowingSegment({
            body: {
              attempt_id: currentAttemptId,
              audio_file: audioFile,
              segment_id: segmentId,
            },
            path: { content_id: lesson.id },
          }),
        );

        if (response.data) {
          setRecordedSegments((currentSegments) => ({
            ...currentSegments,
            [segmentId]: {
              durationSeconds: response.data?.duration_seconds ?? durationSeconds,
              playbackUrl: localBlobUrl,
              recorded: true,
              recordingId: response.data?.recording_id,
            },
          }));
          toast.success(`Segment #${segmentIndex + 1} recorded!`);
        } else {
          const failure = parseApiFailure(response);
          if (failure.code === "shadowing_attempt_not_in_progress") {
            onAttemptNotInProgress();
          } else {
            toast.error("Recording upload failed", { description: failure.message });
          }
        }
      }
    } catch (error: unknown) {
      toast.error("Could not upload recording", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAttempt = useCallback(
    async (requestAiReview: boolean = false) => {
      const hasRecording = isContinuous
        ? Boolean(continuousAudioUrl || continuousDurationSeconds > 0)
        : Object.values(recordedSegments).some((segment) => segment.recorded);
      if (!hasRecording) {
        toast.error("No recordings found", {
          description: isContinuous
            ? "Please record your shadowing voice before finishing."
            : "Please record at least one segment before completing the attempt.",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await protectedRequest(() =>
          submitShadowingAttempt({
            body: {
              attempt_id: currentAttemptId,
              replay_count: 0,
              request_ai_review: requestAiReview,
            },
            path: { content_id: lesson.id },
          }),
        );

        if (response.data) {
          onAttemptCompleted(response.data.attempt_id);
        } else {
          const failure = parseApiFailure(response);
          if (failure.code === "shadowing_attempt_not_in_progress") {
            onAttemptNotInProgress();
          } else {
            toast.error("Could not complete attempt", { description: failure.message });
          }
        }
      } catch (error: unknown) {
        toast.error("Could not complete attempt", {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      continuousAudioUrl,
      continuousDurationSeconds,
      currentAttemptId,
      isContinuous,
      lesson.id,
      onAttemptCompleted,
      onAttemptNotInProgress,
      protectedRequest,
      recordedSegments,
    ],
  );

  const recordedCount = Object.values(recordedSegments).filter(
    (segment) => segment.recorded,
  ).length;
  const totalSegments = transcriptSegments.length;
  const continuousFormatted =
    continuousDurationSeconds > 0
      ? `${formatShadowingDuration(continuousDurationSeconds)} Practiced`
      : undefined;
  const currentSegmentRecorded = isContinuous
    ? Boolean(continuousAudioUrl || continuousDurationSeconds > 0)
    : Boolean(recordedSegments[String(selectedSegmentIndex)]?.recorded);
  const currentSegmentDuration = isContinuous
    ? continuousDurationSeconds
    : (recordedSegments[String(selectedSegmentIndex)]?.durationSeconds ?? 0);
  const currentSavedAudioUrl = isContinuous
    ? (continuousAudioUrl ?? undefined)
    : recordedSegments[String(selectedSegmentIndex)]?.playbackUrl;

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
