"use client";

import type { DictationPracticeContent } from "../_types/dictation-practice";

import { useDictationStart } from "../_hooks/use-dictation-start";
import { DictationStartPanel } from "./dictation-start-panel";

export function DictationStartScreen({ content }: { content: DictationPracticeContent }) {
  const {
    handleRestore,
    handleResume,
    handleStart,
    inProgressAttempt,
    isRestoring,
    isStarting,
    restoreError,
    startError,
    totalAttempts,
  } = useDictationStart({ content });

  return (
    <div className="scroll-mt-24" id="dictation-start-screen">
      <DictationStartPanel
        content={content}
        inProgressAttempt={inProgressAttempt}
        isRestoring={isRestoring}
        isStarting={isStarting}
        onRestore={() => void handleRestore()}
        onResume={handleResume}
        onStart={() => void handleStart()}
        restoreError={restoreError}
        startError={startError}
        totalAttempts={totalAttempts}
      />
    </div>
  );
}
