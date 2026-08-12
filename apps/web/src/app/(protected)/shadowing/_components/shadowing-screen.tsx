"use client";

import { useState } from "react";

import type { ShadowingLesson, ShadowingResult } from "../_validations/shadowing-schemas";

import { getMockShadowingResult } from "../_utils/shadowing-mock-adapter";
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

  const handleComplete = () => {
    const mockResult = getMockShadowingResult();
    setResult(mockResult);
    setIsModalOpen(true);
  };

  const handleRetry = () => {
    setIsModalOpen(false);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <ShadowingHeader title={lesson.title} />

      <AudioPlayerCard audioUrl={lesson.audio_url} />

      <TranscriptCard transcriptJa={lesson.transcript_ja} />

      <RecorderCard onComplete={handleComplete} />

      <CompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRetry={handleRetry}
        result={result}
      />
    </div>
  );
}
