"use client";

import type { ReactNode } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Headphones,
  LoaderCircle,
  Radio,
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

type CompactShadowingToolbarProps = {
  continuousDurationFormatted?: string;
  difficulty: string;
  isCompleting: boolean;
  lessonTitle: string;
  mode?: "segmented" | "continuous";
  onComplete: () => void;
  recordedCount: number;
  settings?: ReactNode;
  totalSegments: number;
};

export function CompactShadowingToolbar({
  continuousDurationFormatted,
  difficulty,
  isCompleting,
  lessonTitle,
  mode = "segmented",
  onComplete,
  recordedCount,
  settings,
  totalSegments,
}: CompactShadowingToolbarProps) {
  const isContinuous = mode === "continuous";
  const isAllRecorded = !isContinuous && recordedCount === totalSegments && totalSegments > 0;
  const unrecordedCount = Math.max(0, totalSegments - recordedCount);

  return (
    <header
      aria-label="Shadowing practice toolbar"
      className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-base border-2 border-border bg-background/95 p-2.5 shadow-shadow backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-3"
    >
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:gap-3">
        <Button asChild className="shrink-0" size="sm" variant="neutral">
          <Link href="/lessons">
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Badge className="shrink-0 font-heading" variant="neutral">
            JLPT {difficulty}
          </Badge>
          <Badge className="shrink-0 font-heading" variant="neutral">
            {isContinuous ? (
              <span className="inline-flex items-center gap-1">
                <Radio className="size-3 text-chart-3" />
                {continuousDurationFormatted ? `${continuousDurationFormatted}` : "Continuous"}
              </span>
            ) : (
              `${recordedCount}/${totalSegments} Recorded`
            )}
          </Badge>
          <div className="flex min-w-0 items-center gap-1.5">
            <Headphones aria-hidden="true" className="size-3.5 shrink-0 text-foreground/60" />
            <span className="min-w-0 truncate text-xs font-heading text-foreground/80 sm:text-sm">
              {lessonTitle}
            </span>
          </div>
        </div>
      </div>

      <div className="col-start-3 row-start-1 flex items-center gap-2">
        {settings}

        {isAllRecorded ? (
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
            <span>{isCompleting ? "Finishing..." : "Finish"}</span>
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
                <span>{isCompleting ? "Finishing..." : "Finish"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Finish this attempt?</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {isContinuous
                    ? "Completing now will calculate your score and EXP based on your continuous practice duration."
                    : `You have recorded ${recordedCount} of ${totalSegments} segments. Completing now will calculate your score and EXP based only on completed recordings.`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed sm:text-sm">
                {!isContinuous && unrecordedCount > 0 ? (
                  <p className="flex items-start gap-2 text-foreground/80">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-chart-3"
                    />
                    <span>
                      <strong>
                        {unrecordedCount} unrecorded segment{unrecordedCount === 1 ? "" : "s"}
                      </strong>{" "}
                      will receive 0 points.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start gap-2 text-foreground/80">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-main" />
                    <span>
                      {isContinuous
                        ? "Your continuous recording session will be saved and reviewed."
                        : "All segments have been recorded."}
                    </span>
                  </p>
                )}
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
