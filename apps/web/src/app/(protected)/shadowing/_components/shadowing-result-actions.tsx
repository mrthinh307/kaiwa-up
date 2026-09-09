"use client";

import type { ShadowingSegmentReviewItem } from "@kaiwa-app/api-client";

import { BookOpenCheck, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShadowingResultActionsProps = {
  activeSegment?: ShadowingSegmentReviewItem;
  isContinuous?: boolean;
  onPracticeAgain: () => void;
};

export function ShadowingResultActions({
  activeSegment,
  isContinuous = false,
  onPracticeAgain,
}: ShadowingResultActionsProps) {
  const activeScore = activeSegment?.similarity_score;
  const isActiveRecorded = activeSegment?.recorded;

  return (
    <section
      aria-label="Shadowing practice actions"
      className="rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
    >
      {!isContinuous && activeSegment ? (
        <div className="flex items-center justify-between rounded-base border border-border/60 bg-background px-3 py-2 text-xs">
          <span className="text-foreground/75">
            Active: <strong>Segment #{activeSegment.segment_index + 1}</strong>
          </span>
          <span
            className={cn(
              "font-heading",
              isActiveRecorded &&
                activeScore !== null &&
                activeScore !== undefined &&
                activeScore >= 80 &&
                "text-status-correct-text dark:text-emerald-300",
              isActiveRecorded &&
                (activeScore === null || activeScore === undefined || activeScore < 80) &&
                "text-status-review-text dark:text-amber-300",
              !isActiveRecorded && "text-foreground/60",
            )}
          >
            {isActiveRecorded
              ? activeScore !== null && activeScore !== undefined
                ? `Recorded (${Number(activeScore).toFixed(0)}%)`
                : "Recorded"
              : "Unrecorded"}
          </span>
        </div>
      ) : null}

      <div className={cn("space-y-2", !isContinuous && activeSegment && "mt-3.5")}>
        <Button
          className="w-full gap-2 font-heading text-sm"
          onClick={onPracticeAgain}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Practice this lesson again
        </Button>

        <Button asChild className="w-full gap-2 font-heading text-sm" variant="neutral">
          <Link href="/lessons">
            <BookOpenCheck aria-hidden="true" className="size-4" />
            Back to lessons
          </Link>
        </Button>
      </div>

      <div className="mt-4 border-t border-border/40 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-foreground/60">
          <span className="font-heading">Shortcuts:</span>
          <div className="flex items-center gap-2">
            <span>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                ⎵
              </kbd>{" "}
              Play/Pause
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                ←
              </kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">
                →
              </kbd>{" "}
              Navigate
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
