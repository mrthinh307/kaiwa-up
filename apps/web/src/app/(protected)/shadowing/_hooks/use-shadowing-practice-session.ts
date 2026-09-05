"use client";

import type { ShadowingAttemptPracticeResponse, TranscriptSegment } from "@kaiwa-app/api-client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  recordShadowingContinuous,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import type { RecorderCardHandle } from "../_components/recorder-card";

import { formatShadowingDuration } from "../_utils/shadowing-formatters";
import { useAudioPlayer } from "./use-audio-player";
import { useShadowingShortcuts } from "./use-shadowing-shortcuts";

export type SegmentRecordState = {
  durationSeconds: number;
  playbackUrl?: string;
  recorded: boolean;
  recordingId?: string;
};

type RecordingCompleteData = {
  audioBlob: Blob | null;
  durationMs: number;
  segmentIndex?: number;
};

type ShadowingPracticeSessionOptions = {
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
  practice: ShadowingAttemptPracticeResponse;
  recorderRef: RefObject<RecorderCardHandle | null>;
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

export function useShadowingPracticeSession({
  onAttemptCompleted,
  onAttemptNotInProgress,
  practice,
  recorderRef,
}: ShadowingPracticeSessionOptions) {
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
  const localObjectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const localObjectUrls = localObjectUrlsRef.current;
    return () => {
      localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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
  }: RecordingCompleteData) => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    let rollbackOptimisticUpdate: () => void = () => undefined;
    try {
      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

      if (isContinuous) {
        const previousAudioUrl = continuousAudioUrl;
        const previousDurationSeconds = continuousDurationSeconds;
        const localBlobUrl = URL.createObjectURL(audioBlob);
        localObjectUrlsRef.current.add(localBlobUrl);
        rollbackOptimisticUpdate = () => {
          setContinuousAudioUrl(previousAudioUrl);
          setContinuousDurationSeconds(previousDurationSeconds);
          localObjectUrlsRef.current.delete(localBlobUrl);
          URL.revokeObjectURL(localBlobUrl);
        };
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
          rollbackOptimisticUpdate();
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
        const previousSegment = recordedSegments[segmentId];
        const localBlobUrl = URL.createObjectURL(audioBlob);
        localObjectUrlsRef.current.add(localBlobUrl);
        rollbackOptimisticUpdate = () => {
          setRecordedSegments((currentSegments) => {
            if (previousSegment) {
              return { ...currentSegments, [segmentId]: previousSegment };
            }

            const nextSegments = { ...currentSegments };
            delete nextSegments[segmentId];
            return nextSegments;
          });
          localObjectUrlsRef.current.delete(localBlobUrl);
          URL.revokeObjectURL(localBlobUrl);
        };

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
          rollbackOptimisticUpdate();
          const failure = parseApiFailure(response);
          if (failure.code === "shadowing_attempt_not_in_progress") {
            onAttemptNotInProgress();
          } else {
            toast.error("Recording upload failed", { description: failure.message });
          }
        }
      }
    } catch (error: unknown) {
      rollbackOptimisticUpdate();
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

  return {
    activeSegment,
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
    recorderRef,
    selectedSegmentIndex,
    totalSegments,
    transcriptSegments,
    continuousFormatted,
  };
}
