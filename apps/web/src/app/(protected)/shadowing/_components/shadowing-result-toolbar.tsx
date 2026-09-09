"use client";

import type { ReactNode } from "react";

import { Headphones, Radio, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ShadowingResultToolbarProps = {
  children?: ReactNode;
  difficulty: string;
  lessonTitle: string;
  mode?: "segmented" | "continuous";
  onPracticeAgain: () => void;
  settings: ReactNode;
};

export function ShadowingResultToolbar({
  children,
  difficulty,
  lessonTitle,
  mode = "segmented",
  onPracticeAgain,
  settings,
}: ShadowingResultToolbarProps) {
  const isContinuous = mode === "continuous";

  return (
    <header
      aria-label="Shadowing result toolbar"
      className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-base border-2 border-border bg-background/95 p-2 shadow-shadow backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5"
    >
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:gap-3">
        <Button asChild className="shrink-0" size="sm" variant="neutral">
          <Link aria-label="Exit to lessons" href="/lessons">
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Badge className="shrink-0 font-heading" variant="neutral">
            JLPT {difficulty}
          </Badge>
          <Badge className="hidden shrink-0 font-heading sm:inline-flex" variant="neutral">
            {isContinuous ? (
              <span className="inline-flex items-center gap-1">
                <Radio className="size-3 text-chart-3" />
                Continuous
              </span>
            ) : (
              "Segmented"
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
        <Button
          aria-label="Practice again"
          className="gap-1.5 font-heading text-xs"
          onClick={onPracticeAgain}
          size="sm"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Practice again</span>
        </Button>
        {children}
      </div>
    </header>
  );
}
