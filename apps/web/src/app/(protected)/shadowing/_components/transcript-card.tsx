"use client";

import type { TranscriptSegment } from "@kaiwa-app/api-client";

import { CheckCircle2, Eye, EyeOff, FileText, Mic, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TranscriptCardProps {
  currentTimeMs?: number;
  isPlayerPlaying?: boolean;
  mode?: "segmented" | "continuous";
  onSelectSegment?: (index: number) => void;
  recordedSegments?: Record<
    string,
    { durationSeconds?: number; recorded: boolean } | boolean | undefined
  >;
  selectedSegmentIndex?: number;
  transcript: string | TranscriptSegment[];
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptCard({
  currentTimeMs = 0,
  isPlayerPlaying = false,
  mode = "segmented",
  onSelectSegment,
  recordedSegments = {},
  selectedSegmentIndex = 0,
  transcript,
}: TranscriptCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  const isSegmentArray = Array.isArray(transcript);
  const isContinuous = mode === "continuous";

  // Calculate which segment is currently playing in real-time based on video currentTimeMs
  const activePlayingIndex = isSegmentArray
    ? transcript.findIndex(
        (seg) => currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms,
      )
    : -1;

  // The active focus index for highlighting and auto-scrolling
  const activeIndex =
    isContinuous || isPlayerPlaying
      ? activePlayingIndex >= 0
        ? activePlayingIndex
        : selectedSegmentIndex
      : selectedSegmentIndex;

  // Auto-scroll to the active segment whenever activeIndex changes
  useEffect(() => {
    if (isVisible && isSegmentArray && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex, isVisible, isSegmentArray]);

  const recordedCount = Object.keys(recordedSegments).filter((key) => {
    const item = recordedSegments[key];
    if (typeof item === "boolean") return item;
    return item?.recorded;
  }).length;

  return (
    <div className="flex h-full flex-col rounded-base border-2 border-border bg-secondary-background p-5 sm:p-6 shadow-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b-2 border-border/60">
        <div className="flex items-center gap-2 font-heading text-base sm:text-lg">
          <FileText className="size-5 text-main" />
          <span>{isContinuous ? "Lesson Transcript" : "Lesson Segments"}</span>
          {!isContinuous && isSegmentArray && (
            <Badge className="ml-1 text-xs" variant="neutral">
              {recordedCount}/{transcript.length} Recorded
            </Badge>
          )}
        </div>

        <Button
          aria-label={isVisible ? "Hide Japanese transcript" : "Show Japanese transcript"}
          className="gap-2 text-xs sm:text-sm"
          onClick={() => setIsVisible(!isVisible)}
          size="sm"
          variant="neutral"
        >
          {isVisible ? (
            <>
              <EyeOff className="size-4" />
              <span>Hide</span>
            </>
          ) : (
            <>
              <Eye className="size-4" />
              <span>Show</span>
            </>
          )}
        </Button>
      </div>

      {isVisible ? (
        <div className="mt-4 flex-1">
          {isSegmentArray ? (
            <ScrollArea className="h-[480px] pr-3">
              <div className="space-y-3">
                {transcript.map((seg, idx) => {
                  const isCurrentPlaying =
                    currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms;
                  const isSelected = !isContinuous && idx === selectedSegmentIndex;
                  const isCurrentActive = idx === activeIndex;

                  const rawRec = recordedSegments[String(idx)];
                  const isRecorded =
                    typeof rawRec === "boolean" ? rawRec : Boolean(rawRec?.recorded);
                  const durationSec =
                    typeof rawRec === "object" ? rawRec?.durationSeconds : undefined;

                  return (
                    <div
                      aria-current={isCurrentActive ? "true" : undefined}
                      className={cn(
                        "group relative rounded-base border-2 transition-all duration-200 cursor-pointer p-3.5 sm:p-4 text-left",
                        isCurrentActive
                          ? "border-main bg-main/15 shadow-shadow ring-2 ring-main/30"
                          : isCurrentPlaying
                            ? "border-main/50 bg-main/5"
                            : "border-border/60 bg-background/80 hover:bg-background hover:border-border",
                      )}
                      key={idx}
                      onClick={() => onSelectSegment?.(idx)}
                      ref={isCurrentActive ? activeSegmentRef : null}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          {!isContinuous && (
                            <span
                              className={cn(
                                "font-heading text-xs px-2 py-0.5 rounded-base border",
                                isSelected
                                  ? "border-main bg-main text-main-foreground font-bold"
                                  : "border-border bg-secondary-background text-foreground/80",
                              )}
                            >
                              Segment #{idx + 1}
                            </span>
                          )}
                          <span className="font-mono text-xs text-foreground/60">
                            [{formatTimestamp(seg.start_time_ms)} –{" "}
                            {formatTimestamp(seg.end_time_ms)}]
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isCurrentPlaying && (
                            <span className="inline-flex items-center gap-1 font-heading text-xs text-main">
                              <Volume2 className="size-3.5 animate-pulse" />
                              <span>Speaking</span>
                            </span>
                          )}

                          {!isContinuous && (
                            <>
                              {isRecorded ? (
                                <span className="inline-flex items-center gap-1 font-heading text-xs text-success">
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Recorded{durationSec ? ` (${durationSec}s)` : ""}</span>
                                </span>
                              ) : isSelected ? (
                                <span className="inline-flex items-center gap-1 font-heading text-xs text-main">
                                  <Mic className="size-3.5" />
                                  <span>Selected</span>
                                </span>
                              ) : (
                                <span className="text-xs text-foreground/50">Not recorded</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <p
                        className={cn(
                          "font-sans leading-relaxed transition-colors",
                          isCurrentActive
                            ? "mt-2 text-lg sm:text-xl font-bold text-foreground"
                            : "mt-1 text-base font-normal text-foreground/80 group-hover:text-foreground",
                        )}
                      >
                        {seg.script}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-base border-2 border-border bg-background p-5">
              <p className="font-sans text-xl leading-relaxed sm:text-2xl text-foreground font-semibold">
                {transcript}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-base border-2 border-dashed border-border bg-background/50 p-6 text-center text-sm text-foreground/60">
          <FileText className="mb-2 size-8 text-foreground/40" />
          <p className="font-heading text-base text-foreground/80">Transcript is hidden</p>
          <p className="mt-1 text-xs text-foreground/60">
            Click &ldquo;Show&rdquo; anytime to view synchronized text.
          </p>
        </div>
      )}
    </div>
  );
}
