"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { DictationPracticeContent } from "../../_types/dictation-practice";

import { useDictationPractice } from "../../_hooks/use-dictation-practice";
import { useDictationSettings } from "../../_hooks/use-dictation-settings";
import { usePracticeShortcuts } from "../../_hooks/use-practice-shortcuts";
import { CompactPracticeToolbar } from "./compact-practice-toolbar";
import { DictationPracticeSidebar } from "./dictation-practice-sidebar";
import { DictationResult } from "./dictation-result";
import { DictationStartPanel } from "./dictation-start-panel";
import { DictationWorkstation } from "./dictation-workstation";

type DictationPracticeScreenProps = {
  content: DictationPracticeContent;
};

export function DictationPracticeScreen({ content }: DictationPracticeScreenProps) {
  const {
    activeAnswer,
    activePrompt,
    activeResult,
    activeSegment,
    activeSegmentIndex,
    answers,
    attempt,
    checkedCount,
    completeError,
    completion,
    correctCount,
    draftCount,
    handleAnswerChange,
    handleComplete,
    handleNext,
    handlePrevious,
    handleReplay,
    handleReview,
    handleStart,
    handleSubmit,
    hasPlayedActiveSegment,
    isChecking,
    isCompleting,
    isSessionReviewed: _isSessionReviewed,
    isStarting,
    playbackRequest,
    results,
    review,
    selectSegment,
    startError,
    storedResultCount,
    submitError,
  } = useDictationPractice({ content });
  const {
    autoPlayDelayMs,
    autoPlayOnSegmentChange,
    showVideo,
    showCorrectAnswer,
    updateAutoPlayDelay,
    updateAutoPlayOnSegmentChange,
    updateShowVideo,
    updateShowCorrectAnswer,
  } = useDictationSettings();

  // Global practice keyboard shortcuts (Ctrl+Space for replay, Ctrl+←/→ for navigation)
  usePracticeShortcuts({
    disabled: !attempt || Boolean(completion),
    onNext: handleNext,
    onPrevious: handlePrevious,
    onReplay: handleReplay,
  });

  if (!attempt) {
    return (
      <DictationStartPanel
        content={content}
        isStarting={isStarting}
        onStart={handleStart}
        startError={startError}
      />
    );
  }

  if (completion && !review) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Attempt saved, review unavailable</AlertTitle>
          <AlertDescription>
            Your score of {completion.score}% and +{completion.earned_exp} EXP were saved by the
            backend. {completeError ?? "The answer review could not be loaded."}
          </AlertDescription>
        </Alert>
        <Button disabled={isCompleting} onClick={handleReview} type="button">
          {isCompleting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {isCompleting ? "Loading review..." : "Load result again"}
        </Button>
      </div>
    );
  }

  if (completion && review) {
    return (
      <DictationResult
        attempt={attempt}
        completion={completion}
        content={content}
        isStarting={isStarting}
        onTryAgain={handleStart}
        review={review}
        startError={startError}
      />
    );
  }

  if (!activeSegment || !activePrompt) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Attempt data is out of sync</AlertTitle>
        <AlertDescription>
          The segments returned when this attempt started do not match the lesson prompts. Refresh
          the lesson and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {completeError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to complete attempt</AlertTitle>
          <AlertDescription>{completeError}</AlertDescription>
        </Alert>
      ) : null}

      {/* 1. Compact Focus Toolbar */}
      <CompactPracticeToolbar
        checkedCount={checkedCount}
        correctCount={correctCount}
        difficulty={content.difficulty}
        draftCount={draftCount}
        autoPlayDelayMs={autoPlayDelayMs}
        autoPlayOnSegmentChange={autoPlayOnSegmentChange}
        isCompleting={isCompleting}
        lessonTitle={content.title}
        onAutoPlayDelayChange={updateAutoPlayDelay}
        onAutoPlayOnSegmentChange={updateAutoPlayOnSegmentChange}
        onComplete={handleComplete}
        onShowVideoChange={updateShowVideo}
        onShowCorrectAnswerChange={updateShowCorrectAnswer}
        showVideo={showVideo}
        showCorrectAnswer={showCorrectAnswer}
        storedResultCount={storedResultCount}
        totalSegments={attempt.total_segments}
      />

      {/* 2. Main Practice Stage: Unified Workstation + Compact Sidebar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DictationWorkstation
            activeAnswer={activeAnswer}
            activeResult={activeResult}
            activeSegment={activeSegment}
            activeSegmentIndex={activeSegmentIndex}
            audioUrl={attempt.audio_url}
            autoPlayDelayMs={autoPlayDelayMs}
            autoPlayOnSegmentChange={autoPlayOnSegmentChange}
            hasPlayedActiveSegment={hasPlayedActiveSegment}
            isChecking={isChecking}
            isFirstSegment={activeSegmentIndex === 0}
            isLastSegment={activeSegmentIndex === attempt.segments.length - 1}
            lessonTitle={content.title}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onReplay={handleReplay}
            onSubmit={handleSubmit}
            playbackRequest={playbackRequest}
            showVideo={showVideo}
            showCorrectAnswer={showCorrectAnswer}
            submitError={submitError}
            totalSegments={attempt.total_segments}
          />
        </div>

        <div className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start lg:z-20">
          <DictationPracticeSidebar
            activeSegmentIndex={activeSegmentIndex}
            answers={answers}
            checkedCount={checkedCount}
            correctCount={correctCount}
            draftCount={draftCount}
            isCompleting={isCompleting}
            onComplete={handleComplete}
            onSelectSegment={selectSegment}
            results={results}
            segments={attempt.segments}
            storedResultCount={storedResultCount}
            totalSegments={attempt.total_segments}
          />
        </div>
      </div>
    </div>
  );
}
