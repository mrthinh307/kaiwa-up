"use client";

import type { ReactNode } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Headphones,
  LoaderCircle,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
  onComplete: (requestAiReview: boolean) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"no-ai" | "ai" | null>(null);

  const isContinuous = mode === "continuous";
  const isAllRecorded = !isContinuous && recordedCount === totalSegments && totalSegments > 0;
  const unrecordedCount = Math.max(0, totalSegments - recordedCount);

  const isAiSubmitting = isCompleting && submittingAction === "ai";
  const isNoAiSubmitting = isCompleting && submittingAction === "no-ai";

  const handleFinishOption = (requestAiReview: boolean) => {
    setSubmittingAction(requestAiReview ? "ai" : "no-ai");
    onComplete(requestAiReview);
  };

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

        <Dialog onOpenChange={setIsOpen} open={isOpen}>
          <DialogTrigger asChild>
            <Button
              className="font-heading"
              disabled={isCompleting}
              size="sm"
              type="button"
              variant={isAllRecorded ? "default" : "default"}
            >
              {isCompleting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : isAllRecorded ? (
                <Trophy aria-hidden="true" className="size-4" />
              ) : (
                <Flag aria-hidden="true" className="size-4" />
              )}
              <span>{isCompleting ? "Finishing..." : "Finish"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-xl min-w-0 overflow-hidden">
            <DialogHeader>
              <DialogTitle>Finish Shadowing Practice</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {isContinuous
                  ? "Completing now will calculate your official score and EXP based on your continuous practice duration."
                  : `You have recorded ${recordedCount} of ${totalSegments} segments. Your official score and EXP will be calculated based on completed recordings.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Practice Status Box */}
              <div className="space-y-2 rounded-base border-2 border-border bg-secondary-background p-3.5 text-xs leading-relaxed sm:text-sm">
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
                      will receive 0 points toward official score.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start gap-2 text-foreground/80">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-main" />
                    <span>
                      {isContinuous
                        ? "Your continuous recording session is ready for submission."
                        : "All segments have been recorded."}
                    </span>
                  </p>
                )}
              </div>

              {/* Optional AI Review Note Card */}
              <div className="rounded-base border-2 border-border/80 bg-background p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-heading text-xs sm:text-sm text-foreground">
                  <Sparkles aria-hidden="true" className="size-4 text-main" />
                  <span>Optional AI Recording Review</span>
                </div>
                <p className="text-xs text-foreground/75 leading-relaxed">
                  Choose whether you want AI to analyze your recording for speech accuracy,
                  pronunciation corrections, and learning tips. AI review is informational only and
                  does not impact your score or EXP.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-2 flex flex-col gap-2.5 sm:flex-col">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  className="w-full justify-center"
                  disabled={isCompleting}
                  onClick={() => handleFinishOption(false)}
                  type="button"
                  variant="neutral"
                >
                  {isNoAiSubmitting ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Flag aria-hidden="true" className="size-4" />
                  )}
                  <span>{isNoAiSubmitting ? "Finishing..." : "Finish without AI Review"}</span>
                </Button>
                <Button
                  className="w-full justify-center bg-main text-main-foreground"
                  disabled={isCompleting}
                  onClick={() => handleFinishOption(true)}
                  type="button"
                >
                  {isAiSubmitting ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden="true" className="size-4" />
                  )}
                  <span>
                    {isAiSubmitting ? "Reviewing & Finishing..." : "Finish & Request AI Review"}
                  </span>
                </Button>
              </div>
              <Button
                className="w-full justify-center"
                disabled={isCompleting}
                onClick={() => setIsOpen(false)}
                type="button"
                variant="neutral"
              >
                Keep practicing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
