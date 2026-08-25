"use client";

import {
  Check,
  ChevronDown,
  Circle,
  Flag,
  Keyboard,
  LoaderCircle,
  PencilLine,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { KeyboardShortcut } from "@/components/common/keyboard-shortcut";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  DictationKeyboardShortcut,
  DictationPracticeSidebarProps,
  DictationSegmentState,
} from "../../_types/dictation-practice";

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

const COLLAPSED_SEGMENT_COUNT = 14;

const STATE_CONFIG = {
  correct: {
    badgeClass: "border-border bg-success text-main-foreground",
    bgClass: "border-success bg-success/10 text-foreground",
    icon: Check,
    iconColor: "text-success",
    label: "Correct",
    legendBadge: "border-success bg-success/10 text-success",
  },
  draft: {
    badgeClass: "border-border bg-chart-1 text-main-foreground",
    bgClass: "border-chart-1 bg-chart-1/10 text-foreground",
    icon: PencilLine,
    iconColor: "text-chart-1",
    label: "Draft",
    legendBadge: "border-chart-1 bg-chart-1/10 text-chart-1",
  },
  incorrect: {
    badgeClass: "border-border bg-chart-3 text-main-foreground",
    bgClass: "border-chart-3 bg-chart-3/10 text-foreground",
    icon: X,
    iconColor: "text-chart-3",
    label: "Needs review",
    legendBadge: "border-chart-3 bg-chart-3/10 text-chart-3",
  },
  not_started: {
    badgeClass: "border-border bg-background text-foreground/50",
    bgClass: "border-border bg-background text-foreground/75 hover:bg-main/15",
    icon: Circle,
    iconColor: "text-foreground/40",
    label: "Not started",
    legendBadge: "bg-background border-border text-foreground/60",
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
  isCompleting,
  keyboardShortcuts = PRACTICE_SHORTCUTS,
  onComplete,
  onSelectSegment,
  results,
  segments,
  storedResultCount: _storedResultCount,
  totalSegments,
  variant = "practice",
}: DictationPracticeSidebarProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const segmentGridRef = useRef<HTMLDivElement>(null);
  const shouldCollapseMap = segments.length > COLLAPSED_SEGMENT_COUNT;
  const collapsedPageIndex = Math.floor(activeSegmentIndex / COLLAPSED_SEGMENT_COUNT);
  const collapsedStartIndex = collapsedPageIndex * COLLAPSED_SEGMENT_COUNT;
  const collapsedPageCount = Math.ceil(segments.length / COLLAPSED_SEGMENT_COUNT);
  const visibleSegments =
    shouldCollapseMap && !isMapExpanded
      ? segments.slice(collapsedStartIndex, collapsedStartIndex + COLLAPSED_SEGMENT_COUNT)
      : segments;
  const firstVisibleSegment = visibleSegments[0]?.segment_index;
  const lastVisibleSegment = visibleSegments.at(-1)?.segment_index;

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
      {/* Segment Map & Integrated Progress Tracker Card */}
      <section
        aria-labelledby="dictation-segments-heading"
        className="rounded-base border-4 border-border bg-secondary-background p-4 shadow-shadow sm:p-5"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg sm:text-xl" id="dictation-segments-heading">
              Segment map
            </h2>
            <p className="mt-0.5 text-xs text-foreground/60">
              Active: Segment {activeSegmentIndex + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shouldCollapseMap ? (
              <Button
                aria-controls="dictation-segment-grid"
                aria-expanded={isMapExpanded}
                className="h-8 gap-1 px-2 text-xs"
                onClick={() => setIsMapExpanded((currentValue) => !currentValue)}
                size="sm"
                type="button"
                variant="neutral"
              >
                {isMapExpanded ? "Collapse" : "Show all"}
                <ChevronDown
                  aria-hidden="true"
                  className={cn("size-3.5 transition-transform", isMapExpanded && "rotate-180")}
                />
              </Button>
            ) : null}
            <Badge className="font-heading text-xs" variant="neutral">
              {checkedCount}/{totalSegments} ({progressPercent}%)
            </Badge>
          </div>
        </div>

        {/* Progress Tracker Stats Grid */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-base border-2 border-success/60 bg-success/10 p-2 text-center">
            <dt className="text-[10px] font-heading uppercase text-success">Correct</dt>
            <dd className="mt-0.5 font-heading text-base text-success">{correctCount}</dd>
          </div>
          <div className="rounded-base border-2 border-chart-3/60 bg-chart-3/10 p-2 text-center">
            <dt className="text-[10px] font-heading uppercase text-chart-3">Review</dt>
            <dd className="mt-0.5 font-heading text-base text-chart-3">{incorrectCount}</dd>
          </div>
          <div className="rounded-base border-2 border-border bg-background p-2 text-center">
            <dt className="text-[10px] font-heading uppercase text-foreground/60">Remaining</dt>
            <dd className="mt-0.5 font-heading text-base text-foreground/75">{remainingCount}</dd>
          </div>
        </div>

        {shouldCollapseMap && !isMapExpanded ? (
          <p className="mt-3 text-xs font-medium text-foreground/60">
            Page {collapsedPageIndex + 1} of {collapsedPageCount} · Segments{" "}
            {(firstVisibleSegment ?? 0) + 1}–{(lastVisibleSegment ?? 0) + 1}
          </p>
        ) : null}

        <div
          className={cn(
            "mt-4 grid grid-cols-7 gap-1.5 sm:gap-2",
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
            const isActive = segment.segment_index === segments[activeSegmentIndex]?.segment_index;

            return (
              <button
                aria-label={`Segment ${segment.segment_index + 1}: ${config.label}`}
                aria-pressed={isActive}
                className={cn(
                  "relative flex aspect-square min-h-9 items-center justify-center rounded-base border-2 font-heading text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:min-h-10 sm:text-sm",
                  isActive
                    ? "border-border bg-main text-main-foreground shadow-shadow font-bold scale-105 z-10"
                    : config.bgClass,
                )}
                data-segment-index={segment.segment_index}
                data-segment-state={state}
                key={segment.segment_index}
                onClick={() => onSelectSegment(segment.segment_index)}
                type="button"
              >
                <span>{segment.segment_index + 1}</span>

                <span
                  className={cn(
                    "absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border shadow-2xs sm:size-4",
                    config.badgeClass,
                  )}
                >
                  <Icon aria-hidden="true" className="size-2 sm:size-2.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Prominent Colored Legend */}
        <ul className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-border/30 pt-3 text-xs">
          {legendStates.map((state) => {
            const config = STATE_CONFIG[state];
            const Icon = config.icon;
            const label =
              variant === "result" && state === "not_started" ? "Unanswered" : config.label;
            return (
              <li className="flex items-center gap-2" key={state}>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-base border font-heading",
                    config.legendBadge,
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-3", config.iconColor)} />
                </span>
                <span className={cn("font-heading text-xs", config.iconColor)}>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="dictation-shortcuts-heading"
        className="hidden rounded-base border-4 border-border bg-secondary-background p-4 shadow-shadow lg:block sm:p-5"
      >
        <div className="flex items-center gap-2">
          <Keyboard aria-hidden="true" className="size-4 text-foreground/60" />
          <h2 className="font-heading text-base sm:text-lg" id="dictation-shortcuts-heading">
            Keyboard shortcuts
          </h2>
        </div>

        <table className="mt-3 w-full text-xs sm:text-sm">
          <caption className="sr-only">Keyboard shortcuts for dictation practice</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {keyboardShortcuts.map(({ action, keyLabel }) => (
              <tr key={action}>
                <th className="py-1.5 text-left font-normal text-foreground/75" scope="row">
                  {action}
                </th>
                <td className="py-1.5 text-right">
                  <KeyboardShortcut keyLabel={keyLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Celebratory Finish Card (Appears when all segments are checked) */}
      {isAllChecked && !hideCompletionCard ? (
        <section className="rounded-base border-4 border-border bg-main p-4 text-main-foreground shadow-shadow sm:p-5">
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
