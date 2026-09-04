"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { computeDictationDiff } from "../_utils/dictation-diff";

type DictationDiffViewerProps = {
  className?: string;
  correctScript: string;
  isCorrect: boolean;
  userAnswer: string;
};

export function DictationDiffViewer({
  className,
  correctScript,
  isCorrect,
  userAnswer,
}: DictationDiffViewerProps) {
  const comparison = useMemo(() => {
    return computeDictationDiff(userAnswer.trim(), correctScript.trim());
  }, [userAnswer, correctScript]);

  if (isCorrect) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-xs font-heading text-status-correct-text">
          <span>Correct transcript</span>
          <span className="rounded-base border border-status-correct-border bg-status-correct-bg px-2 py-0.5 font-bold">
            100% Match
          </span>
        </div>
        <p
          className="rounded-base border-2 border-status-correct-border bg-status-correct-bg/40 p-3 font-heading text-base leading-relaxed text-foreground sm:text-lg"
          lang="ja"
        >
          {correctScript}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 1. User's answer with mistyped/extra characters highlighted */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-heading uppercase tracking-wide text-foreground/70">
            Your checked answer
          </span>
          <span className="font-heading text-[11px] text-status-review-text">
            Mismatches highlighted
          </span>
        </div>
        <div
          className="rounded-base border-2 border-border bg-background p-3 font-sans text-base leading-relaxed break-words sm:text-lg"
          lang="ja"
        >
          {comparison.userTokens.length > 0 ? (
            comparison.userTokens.map((token, index) => {
              if (token.type === "incorrect") {
                return (
                  <mark
                    className="mx-0.5 rounded-sm border border-amber-400 bg-amber-200 px-1 py-0.5 font-bold text-amber-950 no-underline dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                    key={`user-${index}`}
                    title="Mismatched or extra character"
                  >
                    {token.value}
                  </mark>
                );
              }
              return (
                <span className="text-foreground" key={`user-${index}`}>
                  {token.value}
                </span>
              );
            })
          ) : (
            <span className="italic text-foreground/40">(No answer entered)</span>
          )}
        </div>
      </div>

      {/* 2. Expected transcript with missing/correct characters highlighted */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-heading uppercase tracking-wide text-foreground/70">
            Correct transcript
          </span>
          <span className="font-mono text-[11px] font-bold text-foreground/60">
            {comparison.accuracyPercent}% Match
          </span>
        </div>
        <div
          className="rounded-base border-2 border-border bg-background p-3 font-heading text-base leading-relaxed break-words sm:text-lg"
          lang="ja"
        >
          {comparison.expectedTokens.map((token, index) => {
            if (token.type === "missing") {
              return (
                <mark
                  className="mx-0.5 rounded-sm border border-emerald-500 bg-emerald-100 px-1 py-0.5 font-bold text-emerald-950 underline decoration-emerald-600 decoration-2 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200"
                  key={`exp-${index}`}
                  title="Expected character"
                >
                  {token.value}
                </mark>
              );
            }
            return (
              <span className="text-foreground" key={`exp-${index}`}>
                {token.value}
              </span>
            );
          })}
        </div>
      </div>

      {/* Mini legend */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-foreground/65">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-xs border border-amber-400 bg-amber-200 dark:bg-amber-900" />
          <span>Mistyped / extra</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-xs border border-emerald-500 bg-emerald-100 dark:bg-emerald-900" />
          <span>Missing / expected</span>
        </span>
      </div>
    </div>
  );
}
