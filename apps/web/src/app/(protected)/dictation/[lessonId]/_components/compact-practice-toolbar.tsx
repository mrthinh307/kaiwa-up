"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  Headphones,
  LoaderCircle,
  Settings2,
  Trophy,
} from "lucide-react";
import Link from "next/link";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import type { CompactPracticeToolbarProps } from "../../_types/dictation-practice";

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
    <header
      aria-label="Practice toolbar"
      className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-base border-2 border-border bg-background/95 p-2.5 shadow-shadow backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-3"
    >
      {/* Left: Exit & Lesson metadata */}
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:gap-3">
        <Button asChild className="shrink-0" size="sm" variant="neutral">
          <Link href="/lessons">
            <ArrowLeft aria-hidden="true" />
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Badge className="shrink-0 font-heading" variant="neutral">
            JLPT {difficulty}
          </Badge>
          <div className="flex min-w-0 items-center gap-1.5">
            <Headphones aria-hidden="true" className="size-3.5 shrink-0 text-foreground/60" />
            <span className="min-w-0 truncate text-xs font-heading text-foreground/80 sm:text-sm">
              {lessonTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Finish Attempt */}
      <div className="col-start-3 row-start-1 flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label="Open practice settings" size="sm" type="button" variant="neutral">
              <Settings2 aria-hidden="true" />
              <span className="hidden md:inline">Settings</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col overflow-y-auto p-0" side="right">
            <SheetHeader className="border-b-4 border-border p-5 pr-16">
              <SheetTitle>Practice settings</SheetTitle>
              <SheetDescription>
                Customize feedback, playback, and media display while practicing.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 p-5">
              <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
                <div className="space-y-1">
                  <Label className="font-heading" htmlFor="dictation-auto-play-segment">
                    Play segment automatically
                  </Label>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Start the video or audio automatically after moving to another segment.
                  </p>
                </div>
                <Switch
                  checked={autoPlayOnSegmentChange}
                  className="mt-0.5 shrink-0"
                  id="dictation-auto-play-segment"
                  onCheckedChange={onAutoPlayOnSegmentChange}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
                <div className="space-y-1">
                  <Label className="font-heading" htmlFor="dictation-show-video">
                    Show video player
                  </Label>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Keep the YouTube video visible while practicing. Turn this off for an audio-only
                    layout.
                  </p>
                </div>
                <Switch
                  checked={showVideo}
                  className="mt-0.5 shrink-0"
                  id="dictation-show-video"
                  onCheckedChange={onShowVideoChange}
                />
              </div>

              <div className="space-y-2 rounded-base border-2 border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-heading" htmlFor="dictation-auto-play-delay">
                    Delay before playback
                  </Label>
                  <span className="text-xs text-foreground/60">milliseconds</span>
                </div>
                <Input
                  aria-describedby="dictation-auto-play-delay-help"
                  disabled={!autoPlayOnSegmentChange}
                  id="dictation-auto-play-delay"
                  inputMode="numeric"
                  max={10000}
                  min={0}
                  onChange={(event) => onAutoPlayDelayChange(Number(event.target.value))}
                  step={1}
                  type="number"
                  value={autoPlayDelayMs}
                />
                <p
                  className="text-xs leading-relaxed text-foreground/70"
                  id="dictation-auto-play-delay-help"
                >
                  Enter 0 for immediate playback. Maximum 10000 ms.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
                <div className="space-y-1">
                  <Label className="font-heading" htmlFor="dictation-show-correct-answer">
                    Show correct answer after checking
                  </Label>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    When off, you will only see whether your answer is correct or needs review.
                  </p>
                </div>
                <Switch
                  checked={showCorrectAnswer}
                  className="mt-0.5 shrink-0"
                  id="dictation-show-correct-answer"
                  onCheckedChange={onShowCorrectAnswerChange}
                />
              </div>

              <div className="rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed text-foreground/70">
                Your preference is saved automatically on this device.
              </div>
            </div>
          </SheetContent>
        </Sheet>

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
                  You have checked <strong>{checkedCount}</strong> of{" "}
                  <strong>{totalSegments}</strong> segments ({correctCount} correct). Completing now
                  will calculate your score based only on submitted segments.
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
      </div>
    </header>
  );
}
