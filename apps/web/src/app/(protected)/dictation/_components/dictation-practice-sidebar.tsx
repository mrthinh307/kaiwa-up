"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flag,
  LoaderCircle,
  PencilLine,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  DictationKeyboardShortcut,
  DictationPracticeSidebarProps,
  DictationSegmentState,
} from "../_types/dictation-practice";

function getSegmentState({
  answer,
  result,
}: {
  answer: string;
  result: DictationPracticeSidebarProps["results"][number] | undefined;
}): DictationSegmentState {
  if (result?.user_answer === answer) {
    if (!result.user_answer.trim()) {
      return "not_started";
    }

    return result.is_correct ? "correct" : "incorrect";
  }
  return answer.trim() ? "draft" : "not_started";
}

const PRACTICE_SHORTCUTS: readonly DictationKeyboardShortcut[] = [
  { action: "Check answer", keyLabel: "⏎" },
  { action: "Pause or resume video", keyLabel: "⎵" },
  { action: "Next segment", keyLabel: "→" },
  { action: "Previous segment", keyLabel: "←" },
];

const PRACTICE_PAGE_SIZE = 10;
const RESULT_PAGE_SIZE = 14;

const STATE_CONFIG = {
  correct: {
    badgeClass:
      "border-status-correct-border bg-status-correct-text text-white dark:border-emerald-300 dark:bg-emerald-400 dark:text-zinc-950 font-bold",
    bgClass:
      "border-status-correct-border bg-status-correct-bg text-status-correct-text dark:border-emerald-400 dark:text-emerald-300 font-bold",
    icon: Check,
    iconColor: "text-status-correct-text dark:text-emerald-300",
    label: "Correct",
    legendBadge:
      "border-status-correct-border bg-status-correct-bg dark:border-emerald-400 dark:bg-emerald-950/70",
  },
  draft: {
    badgeClass:
      "border-border bg-chart-1 text-main-foreground dark:border-blue-300 dark:bg-blue-400 dark:text-zinc-950 font-bold",
    bgClass: "border-chart-1 bg-chart-1/10 text-foreground dark:border-blue-400 dark:text-blue-200",
    icon: PencilLine,
    iconColor: "text-chart-1 dark:text-blue-300",
    label: "Draft",
    legendBadge: "border-chart-1 bg-chart-1/10 dark:border-blue-400 dark:bg-blue-950/70",
  },
  incorrect: {
    badgeClass:
      "border-status-review-border bg-status-review-text text-white dark:border-amber-300 dark:bg-amber-400 dark:text-zinc-950 font-bold",
    bgClass:
      "border-status-review-border bg-status-review-bg text-status-review-text dark:border-amber-400 dark:text-amber-300 font-bold",
    icon: X,
    iconColor: "text-status-review-text dark:text-amber-300",
    label: "Needs review",
    legendBadge:
      "border-status-review-border bg-status-review-bg dark:border-amber-400 dark:bg-amber-950/70",
  },
  not_started: {
    badgeClass:
      "border-border bg-background text-foreground/50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    bgClass:
      "border-border dark:border-zinc-700 bg-background dark:bg-zinc-800/90 text-foreground/75 dark:text-zinc-200 hover:bg-main/15",
    icon: Circle,
    iconColor: "text-foreground/50 dark:text-zinc-300",
    label: "Not started",
    legendBadge: "bg-background border-border dark:border-zinc-500 dark:bg-zinc-800/90",
  },
} satisfies Record<
  DictationSegmentState,
  {
    badgeClass: string;
    bgClass: string;
    icon: typeof Circle;
    iconColor: string;
    label: string;
    legendBadge: string;
  }
>;

export function DictationPracticeSidebar({
  activeSegmentIndex,
  answers,
  checkedCount,
  correctCount,
  draftCount: _draftCount,
  hideCompletionCard = false,
  hideStats = false,
  isCompleting,
  keyboardShortcuts: _keyboardShortcuts = PRACTICE_SHORTCUTS,
  onComplete,
  onSelectSegment,
  results,
  segments,
  showVideo: _showVideo = false,
  storedResultCount: _storedResultCount,
  totalSegments,
  variant = "practice",
  youtubeVideoId: _youtubeVideoId,
}: DictationPracticeSidebarProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const segmentGridRef = useRef<HTMLDivElement>(null);
  const pageSize = variant === "practice" ? PRACTICE_PAGE_SIZE : RESULT_PAGE_SIZE;
  const shouldCollapseMap = segments.length > pageSize;
  const activePageIndex = Math.floor(activeSegmentIndex / pageSize);
  const [prevActiveIndex, setPrevActiveIndex] = useState(activeSegmentIndex);
  const [pageOverride, setPageOverride] = useState<number | null>(null);

  if (prevActiveIndex !== activeSegmentIndex) {
    setPrevActiveIndex(activeSegmentIndex);
    setPageOverride(null);
  }

  const currentPageIndex = pageOverride ?? activePageIndex;
  const collapsedPageCount = Math.ceil(segments.length / pageSize);
  const collapsedStartIndex = currentPageIndex * pageSize;
  const visibleSegments =
    shouldCollapseMap && !isMapExpanded
      ? segments.slice(collapsedStartIndex, collapsedStartIndex + pageSize)
      : segments;

  useEffect(() => {
    if (!isMapExpanded) {
      return;
    }

    const activeSegment = segments[activeSegmentIndex];
    const frameId = window.requestAnimationFrame(() => {
      const segmentGrid = segmentGridRef.current;
      const activeButton = segmentGrid?.querySelector<HTMLElement>(
        `[data-segment-index="${activeSegment?.segment_index ?? ""}"]`,
      );
      if (!segmentGrid || !activeButton) {
        return;
      }

      const gridBounds = segmentGrid.getBoundingClientRect();
      const buttonBounds = activeButton.getBoundingClientRect();
      if (buttonBounds.top < gridBounds.top) {
        segmentGrid.scrollBy({ behavior: "smooth", top: buttonBounds.top - gridBounds.top - 4 });
      } else if (buttonBounds.bottom > gridBounds.bottom) {
        segmentGrid.scrollBy({
          behavior: "smooth",
          top: buttonBounds.bottom - gridBounds.bottom + 4,
        });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSegmentIndex, isMapExpanded, segments]);

  const isAllChecked = checkedCount === totalSegments;
  const incorrectCount = checkedCount - correctCount;
  const remainingCount = totalSegments - checkedCount;
  const progressPercent = Math.round((checkedCount / totalSegments) * 100);
  const legendStates = (
    variant === "result" ? ["correct", "incorrect", "not_started"] : Object.keys(STATE_CONFIG)
  ) as DictationSegmentState[];

  return (
    <aside className="space-y-4">
      {/* Segment Map Card */}
      <section
        aria-labelledby="dictation-segments-heading"
        className="rounded-base border-2 border-border bg-secondary-background p-3.5 shadow-shadow sm:p-4"
      >
        {/* Header with Title, Page Navigation, and Show all toggle */}
        {variant === "practice" ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm sm:text-base" id="dictation-segments-heading">
                Segment map
              </h2>
              {shouldCollapseMap && !isMapExpanded ? (
                <span className="rounded-base border border-border/60 bg-background px-2 py-0.5 font-mono text-xs tabular-nums text-foreground/80">
                  Page {currentPageIndex + 1}/{collapsedPageCount}
                </span>
              ) : null}
              <span className="hidden font-mono text-xs text-foreground/60 sm:inline">
                (#{activeSegmentIndex + 1} active)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {shouldCollapseMap ? (
                <Button
                  aria-controls="dictation-segment-grid"
                  aria-expanded={isMapExpanded}
                  className="h-7 gap-1 px-2.5 text-xs bg-background text-foreground hover:bg-main/15"
                  onClick={() => setIsMapExpanded((currentValue) => !currentValue)}
                  size="sm"
                  type="button"
                  variant="neutral"
                >
                  {isMapExpanded ? "Collapse to 1 row" : "Show all segments"}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-3.5 transition-transform", isMapExpanded && "rotate-180")}
                  />
                </Button>
              ) : null}

              {!hideStats ? (
                <Badge className="font-heading text-xs" variant="neutral">
                  {checkedCount}/{totalSegments} ({progressPercent}%)
                </Badge>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm sm:text-base" id="dictation-segments-heading">
                Segment map
              </h2>
              <span className="rounded-base border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-foreground/75">
                #{activeSegmentIndex + 1}/{totalSegments}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {shouldCollapseMap && !isMapExpanded ? (
                <div className="flex items-center gap-1">
                  <Button
                    aria-label="Previous page of segments"
                    className="h-7 px-1.5 text-xs"
                    disabled={currentPageIndex === 0}
                    onClick={() => setPageOverride(Math.max(0, currentPageIndex - 1))}
                    size="sm"
                    type="button"
                    variant="neutral"
                  >
                    <ChevronLeft aria-hidden="true" className="size-3" />
                    <span className="hidden sm:inline">Prev</span>
                  </Button>
                  <span className="px-1 font-mono text-xs tabular-nums text-foreground/80">
                    {currentPageIndex + 1}/{collapsedPageCount}
                  </span>
                  <Button
                    aria-label="Next page of segments"
                    className="h-7 px-1.5 text-xs"
                    disabled={currentPageIndex >= collapsedPageCount - 1}
                    onClick={() =>
                      setPageOverride(Math.min(collapsedPageCount - 1, currentPageIndex + 1))
                    }
                    size="sm"
                    type="button"
                    variant="neutral"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight aria-hidden="true" className="size-3" />
                  </Button>
                </div>
              ) : null}

              {shouldCollapseMap ? (
                <Button
                  aria-controls="dictation-segment-grid"
                  aria-expanded={isMapExpanded}
                  className="h-7 gap-1 px-2 text-xs bg-secondary-background text-foreground"
                  onClick={() => setIsMapExpanded((currentValue) => !currentValue)}
                  size="sm"
                  type="button"
                  variant="noShadow"
                >
                  {isMapExpanded ? "Collapse" : "Show all"}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-3 transition-transform", isMapExpanded && "rotate-180")}
                  />
                </Button>
              ) : null}

              <Badge className="font-heading text-xs" variant="neutral">
                {checkedCount}/{totalSegments} ({progressPercent}%)
              </Badge>
            </div>
          </div>
        )}

        {/* Optional Stats Grid (Hidden when hideStats is true) */}
        {!hideStats ? (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="rounded-base border-2 border-status-correct-border bg-status-correct-bg px-2 py-1 text-center shadow-2xs">
              <dt className="text-[10px] font-heading uppercase tracking-wide text-status-correct-text">
                Correct
              </dt>
              <dd className="font-heading text-sm sm:text-base text-status-correct-text">
                {correctCount}
              </dd>
            </div>
            <div className="rounded-base border-2 border-status-review-border bg-status-review-bg px-2 py-1 text-center shadow-2xs">
              <dt className="text-[10px] font-heading uppercase tracking-wide text-status-review-text">
                Review
              </dt>
              <dd className="font-heading text-sm sm:text-base text-status-review-text">
                {incorrectCount}
              </dd>
            </div>
            <div className="rounded-base border-2 border-border bg-background px-2 py-1 text-center shadow-2xs">
              <dt className="text-[10px] font-heading uppercase tracking-wide text-foreground/70">
                Remaining
              </dt>
              <dd className="font-heading text-sm sm:text-base text-foreground">
                {remainingCount}
              </dd>
            </div>
          </div>
        ) : null}

        {/* Segment Buttons Row / Grid */}
        {variant === "practice" && !isMapExpanded ? (
          <div className="mt-3 flex items-center gap-1.5 sm:gap-2">
            {shouldCollapseMap ? (
              <Button
                aria-label="Previous page of segments"
                className="h-8.5 w-8.5 shrink-0 p-0 sm:h-9 sm:w-9 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                disabled={currentPageIndex === 0}
                onClick={() => setPageOverride(Math.max(0, currentPageIndex - 1))}
                size="sm"
                title="Previous 10 segments"
                type="button"
                variant="neutral"
              >
                <ChevronLeft aria-hidden="true" className="size-4 stroke-[2.5]" />
              </Button>
            ) : null}

            <div
              className="grid flex-1 grid-cols-10 gap-1.5 sm:gap-2"
              id="dictation-segment-grid"
              ref={segmentGridRef}
            >
              {visibleSegments.map((segment) => {
                const answer = answers[segment.segment_index] ?? "";
                const state = getSegmentState({ answer, result: results[segment.segment_index] });
                const config = STATE_CONFIG[state];
                const Icon = config.icon;
                const isActive =
                  segment.segment_index === segments[activeSegmentIndex]?.segment_index;

                return (
                  <button
                    aria-label={`Segment ${segment.segment_index + 1}: ${config.label}`}
                    aria-pressed={isActive}
                    className={cn(
                      "relative flex h-8.5 items-center justify-center rounded-base border-2 font-heading text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:h-9 sm:text-sm",
                      isActive
                        ? "z-10 scale-105 border-border bg-main font-bold text-main-foreground shadow-shadow"
                        : config.bgClass,
                    )}
                    data-segment-index={segment.segment_index}
                    data-segment-state={state}
                    key={segment.segment_index}
                    onClick={() => onSelectSegment(segment.segment_index)}
                    type="button"
                  >
                    <span>{segment.segment_index + 1}</span>

                    {state !== "not_started" ? (
                      <span
                        className={cn(
                          "absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border shadow-2xs sm:size-4",
                          config.badgeClass,
                        )}
                      >
                        <Icon aria-hidden="true" className="size-2 stroke-[3] sm:size-2.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {shouldCollapseMap ? (
              <Button
                aria-label="Next page of segments"
                className="h-8.5 w-8.5 shrink-0 p-0 sm:h-9 sm:w-9 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                disabled={currentPageIndex >= collapsedPageCount - 1}
                onClick={() =>
                  setPageOverride(Math.min(collapsedPageCount - 1, currentPageIndex + 1))
                }
                size="sm"
                title="Next 10 segments"
                type="button"
                variant="neutral"
              >
                <ChevronRight aria-hidden="true" className="size-4 stroke-[2.5]" />
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "mt-2.5 grid gap-1.5 sm:gap-2",
              variant === "practice" ? "grid-cols-10" : "grid-cols-7",
              isMapExpanded && shouldCollapseMap && "max-h-72 overflow-y-auto p-1",
            )}
            id="dictation-segment-grid"
            ref={segmentGridRef}
          >
            {visibleSegments.map((segment) => {
              const answer = answers[segment.segment_index] ?? "";
              const state = getSegmentState({ answer, result: results[segment.segment_index] });
              const config = STATE_CONFIG[state];
              const Icon = config.icon;
              const isActive =
                segment.segment_index === segments[activeSegmentIndex]?.segment_index;

              return (
                <button
                  aria-label={`Segment ${segment.segment_index + 1}: ${config.label}`}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex items-center justify-center rounded-base border-2 font-heading text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:text-sm",
                    variant === "practice" ? "h-8.5 sm:h-9" : "aspect-square min-h-9 sm:min-h-10",
                    isActive
                      ? "z-10 scale-105 border-border bg-main font-bold text-main-foreground shadow-shadow"
                      : config.bgClass,
                  )}
                  data-segment-index={segment.segment_index}
                  data-segment-state={state}
                  key={segment.segment_index}
                  onClick={() => onSelectSegment(segment.segment_index)}
                  type="button"
                >
                  <span>{segment.segment_index + 1}</span>

                  {state !== "not_started" ? (
                    <span
                      className={cn(
                        "absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border shadow-2xs sm:size-4",
                        config.badgeClass,
                      )}
                    >
                      <Icon aria-hidden="true" className="size-2 stroke-[3] sm:size-2.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {/* Prominent Colored Legend */}
        <ul
          className={cn(
            "mt-3 grid gap-1.5 border-t border-border/40 pt-2.5 text-xs",
            variant === "practice" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
          )}
        >
          {legendStates.map((state) => {
            const config = STATE_CONFIG[state];
            const Icon = config.icon;
            const label =
              variant === "result" && state === "not_started" ? "Unanswered" : config.label;
            return (
              <li className="flex items-center gap-1.5 sm:gap-2" key={state}>
                <span
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-base border font-heading sm:size-5",
                    config.legendBadge,
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn("size-2.5 stroke-[2.5] sm:size-3", config.iconColor)}
                  />
                </span>
                <span className={cn("font-heading text-xs", config.iconColor)}>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Celebratory Finish Card (Appears when all segments are checked) */}
      {isAllChecked && !hideCompletionCard ? (
        <section className="rounded-base border-2 border-border bg-main p-4 text-main-foreground shadow-shadow sm:p-5">
          <div className="flex items-center gap-2">
            <Trophy aria-hidden="true" className="size-5" />
            <h3 className="font-heading text-base">All segments checked!</h3>
          </div>
          <p className="mt-1 text-xs text-main-foreground/80">
            You got {correctCount} of {totalSegments} correct. Submit to finalize your score and
            earn EXP.
          </p>
          <Button
            className="mt-3 w-full font-heading text-sm"
            disabled={isCompleting}
            onClick={onComplete}
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
      ) : null}
    </aside>
  );
}
