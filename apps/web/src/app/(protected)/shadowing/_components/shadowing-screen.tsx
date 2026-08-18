"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getShadowingAttemptReview,
  recordShadowingSegment,
  submitShadowingAttempt,
} from "@/lib/api-client";

import type {
  ShadowingLesson,
  ShadowingResult as ShadowingResultType,
} from "../_validations/shadowing-schemas";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { AudioPlayerCard } from "./audio-player-card";
import { CompletionModal } from "./completion-modal";
import { RecorderCard } from "./recorder-card";
import { ShadowingHeader } from "./shadowing-header";
import { ShadowingResult } from "./shadowing-result";
import { ShadowingSettingsSheet } from "./shadowing-settings-sheet";
import { TranscriptCard } from "./transcript-card";

interface ShadowingScreenProps {
  lesson: ShadowingLesson;
}

export function ShadowingScreen({ lesson }: ShadowingScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<ShadowingResultType | null>(null);
  const [review, setReview] = useState<ShadowingAttemptReviewResponse | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [autoPlayOnSegmentChange, setAutoPlayOnSegmentChange] = useState(false);
  const [autoPlayDelaySeconds, setAutoPlayDelaySeconds] = useState(0.5);

  const transcriptSegments = useMemo(
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

  const handleAutoPlayChange = (enabled: boolean) => {
    setAutoPlayOnSegmentChange(enabled);
  };

  const handleTogglePlay = () => {
    player.togglePlay();
  };

  const handleComplete = async ({
    audioBlob,
    durationMs,
  }: {
    audioBlob: Blob | null;
    durationMs: number;
  }) => {
    setIsSubmitting(true);
    try {
      let attemptId = `attempt-${Date.now()}`;
      let recordingId: string | undefined;
      let expEarned = 50;

      if (audioBlob) {
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        const segmentId = String(activeSegmentIndex >= 0 ? activeSegmentIndex : 0);

        const response = await recordShadowingSegment({
          body: {
            audio_file: audioFile,
            segment_id: segmentId,
          },
          path: {
            content_id: lesson.id,
          },
        });

        if (response.data) {
          attemptId = response.data.attempt_id;
          recordingId = response.data.recording_id;

          const submitRes = await submitShadowingAttempt({
            body: {
              attempt_id: attemptId,
              replay_count: 0,
            },
            path: {
              content_id: lesson.id,
            },
          });

          if (submitRes.data) {
            expEarned = submitRes.data.xp_earned;
          }

          const reviewRes = await getShadowingAttemptReview({
            path: {
              attempt_id: attemptId,
            },
          });
          if (reviewRes.data) {
            setReview(reviewRes.data);
          }
        } else if (response.error) {
          const errorMsg =
            typeof response.error === "object" && "message" in response.error
              ? String(response.error.message)
              : "Failed to upload recording";
          toast.error("Recording upload failed", { description: errorMsg });
        }
      }

      setResult({
        attempt_id: attemptId,
        duration_seconds: Math.round(durationMs / 1000),
        exp_earned: expEarned,
        practice_mode: "shadowing",
        recording_id: recordingId,
        status: "completed",
      });
      setIsModalOpen(true);
    } catch (err: unknown) {
      toast.error("Could not complete practice", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIsModalOpen(false);
    setResult(null);
    setReview(null);
    setIsReviewMode(false);
  };

  if (isReviewMode && review) {
    return <ShadowingResult onPracticeAgain={handleRetry} review={review} />;
  }

  return (
    <div className="space-y-6">
      <ShadowingHeader
        difficulty={lesson.difficulty ?? "N4"}
        settings={
          <ShadowingSettingsSheet
            autoPlayDelaySeconds={autoPlayDelaySeconds}
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            onAutoPlayDelayChange={setAutoPlayDelaySeconds}
            onAutoPlayOnSegmentChange={handleAutoPlayChange}
            onShowVideoChange={setShowVideo}
            showVideo={showVideo}
          />
        }
        title={lesson.title}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
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

          <RecorderCard isSubmitting={isSubmitting} onComplete={handleComplete} />
        </div>

        {/* Right Side: Synchronized Scrollable Transcript */}
        <div className="lg:col-span-5">
          <TranscriptCard
            currentTimeMs={currentTimeMs}
            onSeekSegment={(startMs) => {
              const idx = transcriptSegments.findIndex((s) => s.start_time_ms === startMs);
              if (idx >= 0) {
                handlePlaySegment(idx);
              } else {
                player.playSegment(startMs / 1000, autoPlayOnSegmentChange ? null : null);
              }
            }}
            transcript={transcriptSegments}
          />
        </div>
      </div>

      <CompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRetry={handleRetry}
        onReview={() => setIsReviewMode(true)}
        result={result}
      />
    </div>
  );
}
