"use client";

import type { ShadowingAttemptPracticeResponse, TranscriptSegment } from "@kaiwa-app/api-client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  recordShadowingContinuous,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import { useAudioPlayer } from "./use-audio-player";

export type SegmentRecordState = {
  durationSeconds: number;
  playbackUrl?: string;
  recorded: boolean;
  recordingId?: string;
  uploadStatus?: "pending" | "failed" | "saved";
};

type UploadTake = {
  clientId: string;
  blob: Blob;
  segmentIndex: number;
  durationSeconds: number;
  playbackUrl: string;
  expectedId?: string | null;
  status: "pending" | "failed" | "saved";
};

type RecordingCompleteData = {
  audioBlob: Blob | null;
  durationMs: number;
  segmentIndex?: number;
};

type ShadowingPracticeSessionOptions = {
  autoPlayDelayMs?: number;
  autoPlayOnSegmentChange?: boolean;
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
  practice: ShadowingAttemptPracticeResponse;
};

function buildRecordedSegments(
  practice: ShadowingAttemptPracticeResponse,
): Record<string, SegmentRecordState> {
  if (practice.attempt.mode === "continuous" && practice.attempt.continuous_recording) {
    const recording = practice.attempt.continuous_recording;
    return {
      "0": {
        durationSeconds: recording.duration_seconds,
        playbackUrl: recording.playback_url ?? undefined,
        recorded: true,
        recordingId: recording.recording_id,
      },
    };
  }

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
  autoPlayDelayMs: _autoPlayDelayMs = 500,
  autoPlayOnSegmentChange = true,
  onAttemptCompleted,
  onAttemptNotInProgress,
  practice,
}: ShadowingPracticeSessionOptions) {
  const { protectedRequest } = useAuth();
  const { attempt, content: lesson } = practice;
  const practiceMode = attempt.mode;
  const isContinuous = practiceMode === "continuous";
  const currentAttemptId = attempt.attempt_id;
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [recordedSegments, setRecordedSegments] = useState<Record<string, SegmentRecordState>>(() =>
    buildRecordedSegments(practice),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const takesRef = useRef<UploadTake[]>([]);
  const savedIdsRef = useRef<Record<string, string>>(
    practiceMode === "continuous" && practice.attempt.continuous_recording
      ? { "0": practice.attempt.continuous_recording.recording_id }
      : Object.fromEntries(
          (practice.attempt.recorded_segments ?? []).map((segment) => [
            segment.segment_id,
            segment.recording_id,
          ]),
        ),
  );
  const uploadsRef = useRef(new Map<number, Promise<void>>());
  const [pendingUploadCount, setPendingUploadCount] = useState(0);
  const [failedUploadCount, setFailedUploadCount] = useState(0);
  const submittingRef = useRef(false);
  const localObjectUrlsRef = useRef<Set<string>>(new Set());
  const scheduledPlaybackTimeoutRef = useRef<number | null>(null);

  const clearScheduledPlayback = useCallback(() => {
    if (scheduledPlaybackTimeoutRef.current !== null) {
      window.clearTimeout(scheduledPlaybackTimeoutRef.current);
      scheduledPlaybackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearScheduledPlayback, [clearScheduledPlayback]);

  useEffect(() => {
    if (!autoPlayOnSegmentChange) {
      clearScheduledPlayback();
    }
  }, [autoPlayOnSegmentChange, clearScheduledPlayback]);

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
  const player = useAudioPlayer(lesson.audio_url ?? "", lesson.duration_seconds ?? 0, {
    autoPause: !isContinuous && !autoPlayOnSegmentChange,
    segments: transcriptSegments,
  });
  const currentTimeMs = player.currentTime * 1000;

  // Derive segment index from current playback time
  const segmentIndexAtTime = useMemo(() => {
    if (transcriptSegments.length === 0) return 0;
    if (player.isLoopEnabled) {
      return selectedSegmentIndex;
    }
    if (player.playbackStatus === "PAUSED_AT_BOUNDARY") {
      const timeMs = Math.round(player.currentTime * 1000);
      const boundarySegIndex = transcriptSegments.findIndex(
        (seg) => Math.abs(seg.end_time_ms - timeMs) <= 100,
      );
      if (boundarySegIndex >= 0) return boundarySegIndex;
      return selectedSegmentIndex;
    }

    const timeMs = Math.round(player.currentTime * 1000);
    const exact = transcriptSegments.findIndex(
      (seg) => timeMs >= seg.start_time_ms && timeMs < seg.end_time_ms,
    );
    if (exact >= 0) return exact;

    const lastSeg = transcriptSegments[transcriptSegments.length - 1];
    if (lastSeg && timeMs >= lastSeg.end_time_ms) {
      return transcriptSegments.length - 1;
    }

    for (let i = 0; i < transcriptSegments.length - 1; i++) {
      const cur = transcriptSegments[i];
      const next = transcriptSegments[i + 1];
      if (cur && next && timeMs >= cur.end_time_ms && timeMs < next.start_time_ms) {
        return i;
      }
    }

    return selectedSegmentIndex;
  }, [
    player.currentTime,
    player.isLoopEnabled,
    player.playbackStatus,
    selectedSegmentIndex,
    transcriptSegments,
  ]);

  const effectiveSegmentIndex = segmentIndexAtTime >= 0 ? segmentIndexAtTime : selectedSegmentIndex;
  const activeSegment = transcriptSegments[effectiveSegmentIndex];
  const hasPreviousSegment = !isContinuous && effectiveSegmentIndex > 0;
  const hasNextSegment = !isContinuous && effectiveSegmentIndex < transcriptSegments.length - 1;

  const handleSelectSegment = useCallback(
    (index: number) => {
      if (index < 0 || index >= transcriptSegments.length) return;

      clearScheduledPlayback();
      setSelectedSegmentIndex(index);
      const segment = transcriptSegments[index];
      if (!segment) return;

      const startSeconds = segment.start_time_ms / 1000;
      const endSeconds = segment.end_time_ms / 1000;
      const wasPlaying = player.isPlaying;

      player.seek(startSeconds);

      if (!wasPlaying) {
        return;
      }

      // Play segment: if auto-pause is enabled (!autoPlayOnSegmentChange), pause at endSeconds.
      // If auto-pause is disabled (continuous), play continuously from startSeconds.
      const targetStop = isContinuous ? null : !autoPlayOnSegmentChange ? endSeconds : null;
      player.playSegment(startSeconds, targetStop);
    },
    [autoPlayOnSegmentChange, clearScheduledPlayback, isContinuous, player, transcriptSegments],
  );

  const handlePreviousSegment = useCallback(() => {
    if (effectiveSegmentIndex > 0) {
      handleSelectSegment(effectiveSegmentIndex - 1);
    }
  }, [effectiveSegmentIndex, handleSelectSegment]);

  const handleNextSegment = useCallback(() => {
    if (effectiveSegmentIndex < transcriptSegments.length - 1) {
      handleSelectSegment(effectiveSegmentIndex + 1);
    }
  }, [effectiveSegmentIndex, handleSelectSegment, transcriptSegments.length]);

  const isSegmentRecorded = useCallback(
    (index: number) => {
      return Boolean(recordedSegments[String(index)]?.recorded);
    },
    [recordedSegments],
  );

  const handlePreviousUnrecordedSegment = useCallback(() => {
    for (let i = effectiveSegmentIndex - 1; i >= 0; i--) {
      if (!isSegmentRecorded(i)) {
        handleSelectSegment(i);
        return;
      }
    }
  }, [effectiveSegmentIndex, handleSelectSegment, isSegmentRecorded]);

  const handleNextUnrecordedSegment = useCallback(() => {
    for (let i = effectiveSegmentIndex + 1; i < transcriptSegments.length; i++) {
      if (!isSegmentRecorded(i)) {
        handleSelectSegment(i);
        return;
      }
    }
  }, [effectiveSegmentIndex, handleSelectSegment, isSegmentRecorded, transcriptSegments.length]);

  const handleReplaySegment = useCallback(() => {
    if (!activeSegment) return;
    clearScheduledPlayback();
    const startSeconds = activeSegment.start_time_ms / 1000;
    const endSeconds = activeSegment.end_time_ms / 1000;
    const targetStop = isContinuous ? null : !autoPlayOnSegmentChange ? endSeconds : null;
    player.playSegment(startSeconds, targetStop);
  }, [activeSegment, autoPlayOnSegmentChange, clearScheduledPlayback, isContinuous, player]);

  const handleTogglePlay = useCallback(() => {
    clearScheduledPlayback();
    player.togglePlay();
  }, [clearScheduledPlayback, player]);

  const refreshUploads = useCallback(() => {
    setPendingUploadCount(takesRef.current.filter((take) => take.status === "pending").length);
    setFailedUploadCount(takesRef.current.filter((take) => take.status === "failed").length);
  }, []);

  const enqueueUpload = useCallback(
    (take: UploadTake) => {
      take.status = "pending";
      setRecordedSegments((current) => ({
        ...current,
        [String(take.segmentIndex)]: {
          durationSeconds: take.durationSeconds,
          playbackUrl: take.playbackUrl,
          recorded: false,
          uploadStatus: "pending",
        },
      }));
      refreshUploads();
      const previous = uploadsRef.current.get(take.segmentIndex) ?? Promise.resolve();
      const upload = previous.then(async () => {
        try {
          const precedingFailed = takesRef.current
            .slice(0, takesRef.current.indexOf(take))
            .some(
              (earlier) =>
                earlier.segmentIndex === take.segmentIndex && earlier.status === "failed",
            );
          if (precedingFailed) throw new Error("Retry the earlier upload for this segment first.");
          if (take.expectedId === undefined)
            take.expectedId = savedIdsRef.current[String(take.segmentIndex)] ?? null;
          const mime = take.blob.type;
          const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
          const response = await protectedRequest(() =>
            isContinuous
              ? recordShadowingContinuous({
                  body: {
                    attempt_id: currentAttemptId,
                    audio_file: new File([take.blob], `recording.${extension}`, { type: mime }),
                    client_recording_id: take.clientId,
                    duration_seconds: Math.max(1, Math.round(take.durationSeconds)),
                    expected_recording_id: take.expectedId,
                  },
                  path: { content_id: lesson.id },
                })
              : recordShadowingSegment({
                  body: {
                    attempt_id: currentAttemptId,
                    audio_file: new File([take.blob], `recording.${extension}`, { type: mime }),
                    client_recording_id: take.clientId,
                    expected_recording_id: take.expectedId,
                    segment_id: String(take.segmentIndex),
                  },
                  path: { content_id: lesson.id },
                }),
          );
          if (!response.data) {
            const failure = parseApiFailure(response);
            if (failure.code === "shadowing_attempt_not_in_progress") onAttemptNotInProgress();
            throw new Error(failure.message);
          }
          savedIdsRef.current[String(take.segmentIndex)] = response.data.recording_id;
          take.status = "saved";
          take.durationSeconds =
            response.data.duration_ms != null
              ? response.data.duration_ms / 1000
              : response.data.duration_seconds;
        } catch (error: unknown) {
          take.status = "failed";
          toast.error("Recording upload failed", {
            description:
              error instanceof Error ? error.message : "Retry your saved recording below.",
          });
        } finally {
          const latest = takesRef.current.findLast(
            (candidate) => candidate.segmentIndex === take.segmentIndex,
          );
          if (latest === take) {
            setRecordedSegments((current) => ({
              ...current,
              [String(take.segmentIndex)]: {
                durationSeconds: take.durationSeconds,
                playbackUrl: take.playbackUrl,
                recorded: take.status === "saved",
                recordingId:
                  take.status === "saved"
                    ? savedIdsRef.current[String(take.segmentIndex)]
                    : undefined,
                uploadStatus: take.status,
              },
            }));
          }
          refreshUploads();
        }
      });
      uploadsRef.current.set(take.segmentIndex, upload);
      return upload;
    },
    [
      currentAttemptId,
      isContinuous,
      lesson.id,
      onAttemptNotInProgress,
      protectedRequest,
      refreshUploads,
    ],
  );

  const handleRecordComplete = useCallback(
    ({ audioBlob, durationMs, segmentIndex }: RecordingCompleteData) => {
      if (!audioBlob) return;
      const index = isContinuous ? 0 : (segmentIndex ?? effectiveSegmentIndex);
      const playbackUrl = URL.createObjectURL(audioBlob);
      localObjectUrlsRef.current.add(playbackUrl);
      const take: UploadTake = {
        clientId: crypto.randomUUID(),
        blob: audioBlob,
        segmentIndex: index,
        durationSeconds: durationMs / 1000,
        playbackUrl,
        status: "pending",
      };
      takesRef.current.push(take);
      setRecordedSegments((current) => ({
        ...current,
        [String(index)]: {
          durationSeconds: take.durationSeconds,
          playbackUrl,
          recorded: false,
          uploadStatus: "pending",
        },
      }));
      void enqueueUpload(take);
    },
    [effectiveSegmentIndex, enqueueUpload, isContinuous],
  );

  const retryFailedUploads = useCallback(() => {
    for (const take of takesRef.current) {
      if (take.status === "failed") void enqueueUpload(take);
    }
  }, [enqueueUpload]);

  const handleFinishAttempt = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await Promise.all(uploadsRef.current.values());
      if (takesRef.current.some((take) => take.status !== "saved")) {
        toast.error("Some recordings are not saved", {
          description: "Retry failed uploads before finishing.",
        });
        return;
      }
      const recordings = Object.entries(savedIdsRef.current).map(([index, recordingId]) => ({
        segment_index: Number(index),
        recording_id: recordingId,
      }));
      if (!recordings.length) {
        toast.error("No recordings found", {
          description: "Record at least one segment before finishing.",
        });
        return;
      }
      const response = await protectedRequest(() =>
        submitShadowingAttempt({
          body: { attempt_id: currentAttemptId, replay_count: 0, recordings },
          path: { content_id: lesson.id },
        }),
      );
      if (response.data) onAttemptCompleted(response.data.attempt_id);
      else {
        const failure = parseApiFailure(response);
        if (failure.code === "shadowing_attempt_not_in_progress") onAttemptNotInProgress();
        else toast.error("Could not complete attempt", { description: failure.message });
      }
    } catch (error: unknown) {
      toast.error("Could not complete attempt", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [currentAttemptId, lesson.id, onAttemptCompleted, onAttemptNotInProgress, protectedRequest]);

  const recordedCount = Object.values(recordedSegments).filter(
    (segment) => segment.recorded,
  ).length;
  const totalSegments = transcriptSegments.length;
  const currentRecordingIndex = isContinuous ? 0 : effectiveSegmentIndex;
  const currentSegmentRecorded = Boolean(recordedSegments[String(currentRecordingIndex)]?.recorded);
  const currentSegmentDuration =
    recordedSegments[String(currentRecordingIndex)]?.durationSeconds ?? 0;
  const currentSavedAudioUrl = recordedSegments[String(currentRecordingIndex)]?.playbackUrl;

  return {
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
    handleReplaySegment,
    handleSelectSegment,
    handleTogglePlay,
    hasNextSegment,
    hasPreviousSegment,
    isContinuous,
    isPlayerPlaying: player.isPlaying,
    isSubmitting,
    pendingUploadCount,
    failedUploadCount,
    retryFailedUploads,
    lesson,
    player,
    practiceMode,
    recordedCount,
    recordedSegments,
    selectedSegmentIndex: effectiveSegmentIndex,
    totalSegments,
    transcriptSegments,
  };
}
