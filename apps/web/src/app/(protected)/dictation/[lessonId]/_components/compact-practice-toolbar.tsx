"use client";

import { AlertTriangle, CheckCircle2, Flag, LoaderCircle, Trophy } from "lucide-react";

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

import type { CompactPracticeToolbarProps } from "../../_types/dictation-practice";

import { DictationSettingsSheet } from "./dictation-settings-sheet";
import { DictationToolbar } from "./dictation-toolbar";

export function CompactPracticeToolbar({
  autoPlayDelayMs,
  autoPlayOnSegmentChange,
  checkedCount,
  correctCount,
  difficulty,
  draftCount,
  isCompleting,
  lessonTitle,
  onAutoPlayDelayChange,
  onAutoPlayOnSegmentChange,
  onComplete,
  onShowVideoChange,
  onShowCorrectAnswerChange,
  showVideo,
  showCorrectAnswer,
  storedResultCount,
  totalSegments,
}: CompactPracticeToolbarProps) {
  const isAllChecked = checkedCount === totalSegments;
  const uncheckedCount = totalSegments - storedResultCount;

  return (
    <DictationToolbar
      difficulty={difficulty}
      lessonTitle={lessonTitle}
      settings={
        <DictationSettingsSheet
          autoPlayDelayMs={autoPlayDelayMs}
          autoPlayOnSegmentChange={autoPlayOnSegmentChange}
          mode="practice"
          onAutoPlayDelayChange={onAutoPlayDelayChange}
          onAutoPlayOnSegmentChange={onAutoPlayOnSegmentChange}
          onShowCorrectAnswerChange={onShowCorrectAnswerChange}
          onShowVideoChange={onShowVideoChange}
          showCorrectAnswer={showCorrectAnswer}
          showVideo={showVideo}
        />
      }
    >
      {isAllChecked ? (
        <Button
          className="font-heading"
          disabled={isCompleting}
          onClick={onComplete}
          size="sm"
          type="button"
        >
          {isCompleting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Trophy aria-hidden="true" />
          )}
          <span>{isCompleting ? "Finishing..." : "Finish & view score"}</span>
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={isCompleting} size="sm" type="button" variant="default">
              {isCompleting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Flag aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isCompleting ? "Finishing..." : "Finish early"}
              </span>
              <span className="sm:hidden">Finish</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Finish this attempt early?</DialogTitle>
              <DialogDescription className="leading-relaxed">
                You have checked <strong>{checkedCount}</strong> of <strong>{totalSegments}</strong>{" "}
                segments ({correctCount} correct). Completing now will calculate your score based
                only on submitted segments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed sm:text-sm">
              {uncheckedCount > 0 ? (
                <p className="flex items-start gap-2 text-foreground/80">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-chart-3"
                  />
                  <span>
                    <strong>
                      {uncheckedCount} unchecked segment{uncheckedCount === 1 ? "" : "s"}
                    </strong>{" "}
                    will be counted as incorrect.
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-main" />
                  <span>All segments have been checked at least once.</span>
                </p>
              )}
              {draftCount > 0 ? (
                <p className="flex items-start gap-2 text-foreground/80">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-chart-4"
                  />
                  <span>
                    <strong>
                      {draftCount} unsubmitted edit{draftCount === 1 ? "" : "s"}
                    </strong>{" "}
                    will not replace your previously checked answers.
                  </span>
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
              <DialogClose asChild>
                <Button disabled={isCompleting} type="button" variant="neutral">
                  Keep practicing
                </Button>
              </DialogClose>
              <Button disabled={isCompleting} onClick={onComplete} type="button">
                {isCompleting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Flag aria-hidden="true" />
                )}
                Confirm & finish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DictationToolbar>
  );
}
