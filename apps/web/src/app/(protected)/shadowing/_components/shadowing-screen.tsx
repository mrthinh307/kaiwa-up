"use client";

import type {
  ShadowingAttemptReviewResponse,
  ShadowingContentDetail,
  ShadowingResumeResponse,
  TranscriptSegment,
} from "@kaiwa-app/api-client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getInProgressShadowingAttempt,
  getShadowingAttemptReview,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { AudioPlayerCard } from "./audio-player-card";
import { CompactShadowingToolbar } from "./compact-shadowing-toolbar";
import { RecorderCard } from "./recorder-card";
import { ShadowingResult } from "./shadowing-result";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { ShadowingStartPanel } from "./shadowing-start-panel";
import { TranscriptCard } from "./transcript-card";

interface ShadowingScreenProps {
  lesson: ShadowingContentDetail;
}

export function ShadowingScreen({ lesson }: ShadowingScreenProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [inProgressAttempt, setInProgressAttempt] = useState<ShadowingResumeResponse | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [recordedSegments, setRecordedSegments] = useState<Record<string, boolean>>({});

  const [review, setReview] = useState<ShadowingAttemptReviewResponse | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [autoPlayOnSegmentChange, setAutoPlayOnSegmentChange] = useState(false);
  const [autoPlayDelaySeconds, setAutoPlayDelaySeconds] = useState(0.5);

  const transcriptSegments: TranscriptSegment[] = useMemo(
    () => (Array.isArray(lesson.transcript) ? lesson.transcript : []),
    [lesson.transcript],
  );

  const player = useAudioPlayer(lesson.audio_url ?? "", lesson.duration_seconds ?? 0, {
    autoPlay: autoPlayOnSegmentChange,
    segments: transcriptSegments,
  });

  const currentTimeMs = player.currentTime * 1000;

  const activeSegmentIndex = transcriptSegments.findIndex(
    (seg) => currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms,
  );

  const hasPreviousSegment = activeSegmentIndex > 0;
  const hasNextSegment =
    activeSegmentIndex >= 0 && activeSegmentIndex < transcriptSegments.length - 1;

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

  const handleStart = () => {
    setIsStarting(true);
    setCurrentAttemptId(null);
    setRecordedSegments({});
    setIsStarted(true);
    setIsStarting(false);
  };

  const handleResume = () => {
    if (!inProgressAttempt) {
      handleStart();
      return;
    }

    setCurrentAttemptId(inProgressAttempt.attempt_id);
    const initialMap: Record<string, boolean> = {};
    for (const seg of inProgressAttempt.recorded_segments) {
      initialMap[seg.segment_id] = true;
    }
    setRecordedSegments(initialMap);
    setIsStarted(true);
  };

  const handlePlaySegment = (index: number) => {
    const seg = transcriptSegments[index];
    if (!seg) return;
    player.playSegment(seg.start_time_ms / 1000);
  };

  const handlePreviousSegment = () => {
    const currentIndex = activeSegmentIndex >= 0 ? activeSegmentIndex : 0;
    if (currentIndex > 0) {
      handlePlaySegment(currentIndex - 1);
    } else {
      handlePlaySegment(0);
    }
  };

  const handleNextSegment = () => {
    const currentIndex = activeSegmentIndex >= 0 ? activeSegmentIndex : -1;
    if (currentIndex < transcriptSegments.length - 1) {
      handlePlaySegment(currentIndex + 1);
    }
  };

  const handleTogglePlay = () => {
    player.togglePlay();
  };

  const handleRecordSegmentComplete = async ({
    audioBlob,
  }: {
    audioBlob: Blob | null;
    durationMs: number;
  }) => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    try {
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
      const segmentIndex = activeSegmentIndex >= 0 ? activeSegmentIndex : 0;
      const segmentId = String(segmentIndex);

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
        setRecordedSegments((prev) => ({ ...prev, [segmentId]: true }));
        toast.success(`Segment #${segmentIndex + 1} recorded!`);
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "object" && "message" in response.error
            ? String(response.error.message)
            : "Failed to upload recording";
        toast.error("Recording upload failed", { description: errorMsg });
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
        description: "Please record at least one segment before completing the attempt.",
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
  }, [currentAttemptId, lesson.duration_seconds, lesson.id]);

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

  const recordedCount = Object.keys(recordedSegments).length;
  const totalSegments = transcriptSegments.length;

  // 3. Practice Workstation Mode
  return (
    <div className="space-y-6">
      <CompactShadowingToolbar
        difficulty={lesson.difficulty ?? "N4"}
        isCompleting={isSubmitting}
        lessonTitle={lesson.title}
        onComplete={handleFinishAttempt}
        recordedCount={recordedCount}
        settings={
          <ShadowingSettingsSheet
            autoPlayDelaySeconds={autoPlayDelaySeconds}
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            onAutoPlayDelayChange={setAutoPlayDelaySeconds}
            onAutoPlayOnSegmentChange={setAutoPlayOnSegmentChange}
            onShowVideoChange={setShowVideo}
            showVideo={showVideo}
          />
        }
        totalSegments={totalSegments}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Side: Audio/Video Player & Voice Recorder */}
        <div className="space-y-6 lg:col-span-7">
          <AudioPlayerCard
            audioUrl={lesson.audio_url ?? ""}
            durationSeconds={lesson.duration_seconds}
            hasNextSegment={hasNextSegment}
            hasPreviousSegment={hasPreviousSegment}
            onNextSegment={handleNextSegment}
            onPreviousSegment={handlePreviousSegment}
            onTogglePlay={handleTogglePlay}
            player={player}
            showVideo={showVideo}
          />

          <RecorderCard isSubmitting={isSubmitting} onComplete={handleRecordSegmentComplete} />
        </div>

        {/* Right Side: Synchronized Scrollable Transcript */}
        <div className="lg:col-span-5">
          <TranscriptCard
            currentTimeMs={currentTimeMs}
            onSeekSegment={(startMs) => {
              const idx = transcriptSegments.findIndex(
                (s: TranscriptSegment) => s.start_time_ms === startMs,
              );
              if (idx >= 0) {
                handlePlaySegment(idx);
              } else {
                player.playSegment(startMs / 1000);
              }
            }}
            transcript={transcriptSegments}
          />
        </div>
      </div>
    </div>
  );
}
