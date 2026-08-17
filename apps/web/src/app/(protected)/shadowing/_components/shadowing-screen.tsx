"use client";

import { useState } from "react";
import { toast } from "sonner";

import { recordShadowingSegment } from "@/lib/api-client";

import type { ShadowingLesson, ShadowingResult } from "../_validations/shadowing-schemas";

import { AudioPlayerCard } from "./audio-player-card";
import { CompletionModal } from "./completion-modal";
import { RecorderCard } from "./recorder-card";
import { ShadowingHeader } from "./shadowing-header";
import { TranscriptCard } from "./transcript-card";

interface ShadowingScreenProps {
  lesson: ShadowingLesson;
}

export function ShadowingScreen({ lesson }: ShadowingScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<ShadowingResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      if (audioBlob) {
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        const segmentId = lesson.transcript && lesson.transcript.length > 0 ? "seg_001" : "0";

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
        exp_earned: 50,
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
  };

  return (
    <div className="space-y-6">
      <ShadowingHeader title={lesson.title} />

      <AudioPlayerCard audioUrl={lesson.audio_url ?? ""} />

      <TranscriptCard transcript={lesson.transcript ?? []} />

      <RecorderCard isSubmitting={isSubmitting} onComplete={handleComplete} />

      <CompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRetry={handleRetry}
        result={result}
      />
    </div>
  );
}
