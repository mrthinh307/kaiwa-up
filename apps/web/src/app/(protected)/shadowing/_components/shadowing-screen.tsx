"use client";

import type {
  ShadowingAttemptReviewResponse,
  ShadowingContentDetail,
  ShadowingResumeResponse,
  TranscriptSegment,
} from "@kaiwa-app/api-client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getInProgressShadowingAttempt,
  getShadowingAttemptReview,
  recordShadowingContinuous,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { useShadowingShortcuts } from "../_hooks/use-shadowing-shortcuts";
import { formatShadowingDuration } from "../_utils/shadowing-formatters";
import { AudioPlayerCard } from "./audio-player-card";
import { CompactShadowingToolbar } from "./compact-shadowing-toolbar";
import { RecorderCard, type RecorderCardHandle } from "./recorder-card";
import { ShadowingResult } from "./shadowing-result";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { ShadowingStartPanel } from "./shadowing-start-panel";
import { TranscriptCard } from "./transcript-card";

interface ShadowingScreenProps {
  lesson: ShadowingContentDetail;
}

type SegmentRecordState = {
  durationSeconds: number;
  playbackUrl?: string;
  recorded: boolean;
  recordingId?: string;
};

export function ShadowingScreen({ lesson }: ShadowingScreenProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [practiceMode, setPracticeMode] = useState<"segmented" | "continuous">("segmented");
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [inProgressAttempt, setInProgressAttempt] = useState<ShadowingResumeResponse | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [recordedSegments, setRecordedSegments] = useState<Record<string, SegmentRecordState>>({});
  const [continuousDurationSeconds, setContinuousDurationSeconds] = useState<number>(0);
  const [continuousAudioUrl, setContinuousAudioUrl] = useState<string | null>(null);

  const [review, setReview] = useState<ShadowingAttemptReviewResponse | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
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

  // Check for in-progress attempt on mount
  useEffect(() => {
    let isCancelled = false;

    async function checkAttempt() {
      setIsRestoring(true);
      try {
        const response = await getInProgressShadowingAttempt({
          path: { content_id: lesson.id },
        });

        if (!isCancelled && response.data) {
          setInProgressAttempt(response.data);
          setTotalAttempts(response.data.total_attempts ?? 1);
        }
      } catch {
        // 404 or other errors simply mean no in-progress attempt
      } finally {
        if (!isCancelled) {
          setIsRestoring(false);
        }
      }
    }

    void checkAttempt();

    return () => {
      isCancelled = true;
    };
  }, [lesson.id]);

  const handleStart = (mode: "segmented" | "continuous") => {
    setIsStarting(true);
    setPracticeMode(mode);
    setSelectedSegmentIndex(0);
    setCurrentAttemptId(null);
    setRecordedSegments({});
    setContinuousDurationSeconds(0);
    setContinuousAudioUrl(null);
    setIsStarted(true);
    setIsStarting(false);
  };

  const handleResume = () => {
    if (!inProgressAttempt) {
      handleStart("segmented");
      return;
    }

    const mode = inProgressAttempt.mode === "continuous" ? "continuous" : "segmented";
    setPracticeMode(mode);
    setSelectedSegmentIndex(0);
    setCurrentAttemptId(inProgressAttempt.attempt_id);

    if (mode === "continuous") {
      setContinuousDurationSeconds(inProgressAttempt.continuous_recording?.duration_seconds ?? 0);
      setContinuousAudioUrl(null);
    } else {
      const initialMap: Record<string, SegmentRecordState> = {};
      for (const seg of inProgressAttempt.recorded_segments ?? []) {
        initialMap[seg.segment_id] = {
          durationSeconds: seg.duration_seconds,
          recorded: true,
          recordingId: seg.recording_id,
        };
      }
      setRecordedSegments(initialMap);
    }

    setIsStarted(true);
  };

  const handleSelectSegment = useCallback(
    (index: number) => {
      if (index < 0 || index >= transcriptSegments.length) return;

      setSelectedSegmentIndex(index);
      const seg = transcriptSegments[index];
      if (!seg) return;

      if (isContinuous) {
        player.seek(seg.start_time_ms / 1000);
        player.play();
      } else {
        player.playSegment(seg.start_time_ms / 1000);
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

  const handleTogglePlay = useCallback(() => {
    player.togglePlay();
  }, [player]);

  // Connect keyboard shortcuts including recording toggle (R / Alt+R)
  useShadowingShortcuts({
    disabled: !isStarted || isReviewMode,
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

        const response = await recordShadowingContinuous({
          body: {
            attempt_id: currentAttemptId ?? undefined,
            audio_file: audioFile,
            duration_seconds: durationSeconds,
          },
          path: {
            content_id: lesson.id,
          },
        });

        if (response.data) {
          setCurrentAttemptId(response.data.attempt_id);
          setContinuousDurationSeconds(response.data.duration_seconds);
          toast.success("Continuous recording saved!");
        } else if (response.error) {
          const errorMsg =
            typeof response.error === "object" && "message" in response.error
              ? String(response.error.message)
              : "Failed to upload continuous recording";
          toast.error("Recording upload failed", { description: errorMsg });
        }
      } else {
        const segmentIdx = targetSegmentIndex ?? selectedSegmentIndex;
        const segmentId = String(segmentIdx);
        const localBlobUrl = URL.createObjectURL(audioBlob);

        setRecordedSegments((prev) => ({
          ...prev,
          [segmentId]: {
            durationSeconds,
            playbackUrl: localBlobUrl,
            recorded: true,
          },
        }));

        const response = await recordShadowingSegment({
          body: {
            attempt_id: currentAttemptId ?? undefined,
            audio_file: audioFile,
            segment_id: segmentId,
          },
          path: {
            content_id: lesson.id,
          },
        });

        if (response.data) {
          setCurrentAttemptId(response.data.attempt_id);
          setRecordedSegments((prev) => ({
            ...prev,
            [segmentId]: {
              durationSeconds: response.data?.duration_seconds ?? durationSeconds,
              playbackUrl: localBlobUrl,
              recorded: true,
              recordingId: response.data?.recording_id,
            },
          }));
          toast.success(`Segment #${segmentIdx + 1} recorded!`);
        } else if (response.error) {
          const errorMsg =
            typeof response.error === "object" && "message" in response.error
              ? String(response.error.message)
              : "Failed to upload recording";
          toast.error("Recording upload failed", { description: errorMsg });
        }
      }
    } catch (err: unknown) {
      toast.error("Could not upload recording", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAttempt = useCallback(async () => {
    if (!currentAttemptId) {
      toast.error("No recordings found", {
        description: isContinuous
          ? "Please record your shadowing voice before finishing."
          : "Please record at least one segment before completing the attempt.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitRes = await submitShadowingAttempt({
        body: {
          attempt_id: currentAttemptId,
          replay_count: 0,
        },
        path: {
          content_id: lesson.id,
        },
      });

      if (submitRes.data) {
        const reviewRes = await getShadowingAttemptReview({
          path: {
            attempt_id: currentAttemptId,
          },
        });

        if (reviewRes.data) {
          setReview(reviewRes.data);
          setIsReviewMode(true);
        } else {
          toast.success("Practice completed!");
          setIsReviewMode(false);
          setIsStarted(false);
        }
      } else if (submitRes.error) {
        const errorMsg =
          typeof submitRes.error === "object" && "message" in submitRes.error
            ? String(submitRes.error.message)
            : "Failed to finalize attempt";
        toast.error("Could not complete attempt", { description: errorMsg });
      }
    } catch (err: unknown) {
      toast.error("Could not complete attempt", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentAttemptId, isContinuous, lesson.id]);

  const handleRetry = () => {
    setReview(null);
    setIsReviewMode(false);
    setIsStarted(false);
  };

  // 1. Preview / Start Panel Mode
  if (!isStarted) {
    return (
      <ShadowingStartPanel
        inProgressAttempt={inProgressAttempt}
        isRestoring={isRestoring}
        isStarting={isStarting}
        lesson={lesson}
        onResume={handleResume}
        onStart={handleStart}
        totalAttempts={totalAttempts}
      />
    );
  }

  // 2. Review Mode
  if (isReviewMode && review) {
    return <ShadowingResult onPracticeAgain={handleRetry} review={review} />;
  }

  const recordedCount = Object.keys(recordedSegments).filter(
    (k) => recordedSegments[k]?.recorded,
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

  // 3. Practice Workstation Mode
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
        {/* Left Side: Audio/Video Player & Segment-by-Segment Voice Recorder */}
        <div className="space-y-6 lg:col-span-7">
          <AudioPlayerCard
            audioUrl={lesson.audio_url ?? ""}
            durationSeconds={lesson.duration_seconds}
            hasNextSegment={hasNextSegment}
            hasPreviousSegment={hasPreviousSegment}
            mode={practiceMode}
            onNextSegment={handleNextSegment}
            onPreviousSegment={handlePreviousSegment}
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

        {/* Right Side: Synchronized Scrollable Transcript with Segment Selectors */}
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
