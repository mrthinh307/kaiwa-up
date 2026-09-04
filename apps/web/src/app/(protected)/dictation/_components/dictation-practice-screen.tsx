"use client";

import { AlertCircle, Flag, LoaderCircle, RotateCcw, Trophy } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useDictationPractice } from "../_hooks/use-dictation-practice";
import { useDictationSettings } from "../_hooks/use-dictation-settings";
import { usePracticeShortcuts } from "../_hooks/use-practice-shortcuts";
import { getYouTubeVideoId } from "../_utils/dictation-formatters";
import { CompactPracticeToolbar } from "./compact-practice-toolbar";
import { DictationPracticeSidebar } from "./dictation-practice-sidebar";
import { DictationWorkstation } from "./dictation-workstation";

type DictationPracticeScreenProps = {
  attemptId: string;
  onAttemptCompleted: (attemptId: string) => void;
  onAttemptNotInProgress: () => void;
};

export function DictationPracticeScreen({
  attemptId,
  onAttemptCompleted,
  onAttemptNotInProgress,
}: DictationPracticeScreenProps) {
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
    content,
    correctCount,
    draftCount,
    handleAnswerChange,
    handleComplete,
    handleNext,
    handlePrevious,
    handleReplay,
    handleRestart,
    handleRestore,
    handleSubmit,
    hasPlayedActiveSegment,
    isChecking,
    isCompleting,
    isRestarting,
    isRestoring,
    playbackRequest,
    restartError,
    results,
    restoreError,
    selectSegment,
    storedResultCount,
    submitError,
  } = useDictationPractice({
    attemptId,
    onAttemptCompleted,
    onAttemptNotInProgress,
  });
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

  usePracticeShortcuts({
    disabled: !attempt,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onReplay: handleReplay,
  });

  if (isRestoring && !attempt) {
    return (
      <div
        aria-busy="true"
        className="flex min-h-[calc(100dvh-70px-3rem)] items-center justify-center sm:min-h-[calc(100dvh-70px-4rem)] lg:min-h-[calc(100dvh-70px-5rem)]"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin" />
        <span className="sr-only">Loading Dictation practice...</span>
      </div>
    );
  }

  if (restoreError && !attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to load this attempt</AlertTitle>
          <AlertDescription>{restoreError}</AlertDescription>
        </Alert>
        <Button disabled={isRestoring} onClick={() => void handleRestore()} type="button">
          {isRestoring ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {isRestoring ? "Loading attempt..." : "Try again"}
        </Button>
      </div>
    );
  }

  if (!attempt || !content) {
    return null;
  }

  if (!activeSegment || !activePrompt) {
    return (
      <div className="scroll-mt-24" id="dictation-practice-screen">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Attempt data is out of sync</AlertTitle>
          <AlertDescription>
            The segments returned for this attempt do not match the lesson prompts. Refresh the
            lesson and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="scroll-mt-24 space-y-3.5 sm:space-y-4" id="dictation-practice-screen">
      {completeError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to complete attempt</AlertTitle>
          <AlertDescription>{completeError}</AlertDescription>
        </Alert>
      ) : null}

      {restartError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to restart attempt</AlertTitle>
          <AlertDescription>{restartError}</AlertDescription>
        </Alert>
      ) : null}

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

      {(() => {
        const isAllChecked = checkedCount === attempt.total_segments;
        const youtubeVideoId = getYouTubeVideoId(attempt.audio_url);
        const incorrectCount = checkedCount - correctCount;
        const remainingCount = attempt.total_segments - checkedCount;
        const progressPercent = Math.round((checkedCount / attempt.total_segments) * 100);
        const accuracyPercent =
          checkedCount > 0 ? Math.round((correctCount / checkedCount) * 100) : 0;
        const hasDraft = Object.values(answers).some((text) => text.trim().length > 0);
        const hasProgress = checkedCount > 0 || storedResultCount > 0 || hasDraft;

        return (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
            {/* Left Column (7 cols): Segment Map on top, Workstation underneath */}
            <div className="space-y-4 lg:col-span-7">
              <DictationPracticeSidebar
                activeSegmentIndex={activeSegmentIndex}
                answers={answers}
                checkedCount={checkedCount}
                correctCount={correctCount}
                draftCount={draftCount}
                hideCompletionCard
                hideStats
                isCompleting={isCompleting}
                onComplete={handleComplete}
                onSelectSegment={selectSegment}
                results={results}
                segments={attempt.segments}
                storedResultCount={storedResultCount}
                totalSegments={attempt.total_segments}
                variant="practice"
              />

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

            {/* Right Column (5 cols): Sticky Video & Completion / Progress Card */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:z-20 lg:col-span-5 lg:self-start">
              {/* Video Section (16:9 aspect ratio, docked) */}
              {showVideo && youtubeVideoId ? (
                <section
                  aria-label="Video segment player"
                  className="overflow-hidden rounded-base border-2 border-border bg-black shadow-shadow"
                >
                  <div className="relative aspect-video w-full" id="dictation-video-dock" />
                </section>
              ) : null}

              {/* Celebratory Finish Card when all segments checked */}
              {isAllChecked ? (
                <section className="rounded-base border-2 border-border bg-main p-4 text-main-foreground shadow-shadow sm:p-5">
                  <div className="flex items-center gap-2">
                    <Trophy aria-hidden="true" className="size-5" />
                    <h3 className="font-heading text-base">All segments checked!</h3>
                  </div>
                  <p className="mt-1 text-xs text-main-foreground/80">
                    You got {correctCount} of {attempt.total_segments} correct. Submit to finalize
                    your score and earn EXP.
                  </p>
                  <Button
                    className="mt-3 w-full font-heading text-sm"
                    disabled={isCompleting}
                    onClick={handleComplete}
                    type="button"
                    variant="neutral"
                  >
                    {isCompleting ? (
                      <>
                        <LoaderCircle aria-hidden="true" className="animate-spin" />
                        Finishing attempt...
                      </>
                    ) : (
                      <>
                        <Flag aria-hidden="true" />
                        Finish and view results
                      </>
                    )}
                  </Button>
                </section>
              ) : (
                /* Sleek Quick Summary Card under Video */
                <div className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <span className="font-heading text-sm text-foreground">Practice Progress</span>
                    <Badge className="font-heading text-xs" variant="neutral">
                      {checkedCount}/{attempt.total_segments} ({progressPercent}%)
                    </Badge>
                  </div>

                  {/* High Contrast Stats Grid (Correct / Review / Remaining) */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    <div className="rounded-base border-2 border-status-correct-border bg-status-correct-bg px-2 py-1.5 text-center shadow-2xs">
                      <dt className="text-[10px] font-heading uppercase tracking-wide text-status-correct-text">
                        Correct
                      </dt>
                      <dd className="font-heading text-base text-status-correct-text">
                        {correctCount}
                      </dd>
                    </div>
                    <div className="rounded-base border-2 border-status-review-border bg-status-review-bg px-2 py-1.5 text-center shadow-2xs">
                      <dt className="text-[10px] font-heading uppercase tracking-wide text-status-review-text">
                        Review
                      </dt>
                      <dd className="font-heading text-base text-status-review-text">
                        {incorrectCount}
                      </dd>
                    </div>
                    <div className="rounded-base border-2 border-border bg-background px-2 py-1.5 text-center shadow-2xs">
                      <dt className="text-[10px] font-heading uppercase tracking-wide text-foreground/70">
                        Remaining
                      </dt>
                      <dd className="font-heading text-base text-foreground">{remainingCount}</dd>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-border/30 pt-3 text-xs text-foreground/70">
                    <div className="flex items-center justify-between">
                      <span>Active segment:</span>
                      <span className="font-heading text-foreground">
                        #{activeSegmentIndex + 1} of {attempt.total_segments}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Accuracy:</span>
                      <span className="font-heading text-status-correct-text">
                        {accuracyPercent}%
                      </span>
                    </div>
                  </div>

                  {hasProgress ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="mt-4 w-full font-heading text-xs text-destructive hover:bg-destructive/10 dark:text-red-400 dark:hover:bg-red-950/30"
                          disabled={isRestarting || isCompleting}
                          size="sm"
                          type="button"
                          variant="neutral"
                        >
                          {isRestarting ? (
                            <>
                              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                              <span>Restarting attempt...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw aria-hidden="true" className="size-3.5" />
                              <span>Delete attempt and restart from scratch</span>
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Delete attempt and restart?</DialogTitle>
                          <DialogDescription className="leading-relaxed text-foreground/80">
                            All your submitted answers and progress for this attempt will be
                            permanently deleted. You will start fresh with a new attempt.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-base border-2 border-border bg-secondary-background p-3 text-xs leading-relaxed text-foreground/80">
                          <p>
                            Current progress:{" "}
                            <strong>
                              {checkedCount}/{attempt.total_segments}
                            </strong>{" "}
                            segments checked ({progressPercent}%). This action cannot be undone.
                          </p>
                        </div>

                        <DialogFooter className="mt-2 flex gap-2 sm:justify-end">
                          <DialogClose asChild>
                            <Button disabled={isRestarting} type="button" variant="neutral">
                              Keep practicing
                            </Button>
                          </DialogClose>
                          <Button
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isRestarting}
                            onClick={handleRestart}
                            type="button"
                          >
                            {isRestarting ? (
                              <>
                                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw aria-hidden="true" className="size-4" />
                                <span>Confirm delete &amp; restart</span>
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
