"use client";

import type { TranscriptSegment } from "@kaiwa-app/api-client";

import { BookOpen, CheckCircle2, Loader2, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface TranscriptRecordedSegmentState {
  durationSeconds?: number;
  playbackUrl?: string;
  recorded: boolean;
  recordingId?: string;
  uploadStatus?: "pending" | "failed" | "saved";
}

interface TranscriptCardProps {
  currentTimeMs?: number;
  isPlayerPlaying?: boolean;
  mode?: "segmented" | "continuous";
  onSelectSegment?: (index: number) => void;
  recordedSegments?: Record<string, TranscriptRecordedSegmentState | boolean | undefined>;
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
  const activeSegmentRef = useRef<HTMLButtonElement | null>(null);

  const isSegmentArray = Array.isArray(transcript);

  // Calculate active playing segment index based on currentTimeMs
  const activePlayingIndex = isSegmentArray
    ? transcript.findIndex(
        (seg) => currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms,
      )
    : -1;

  // Active focus index for highlighting and auto-scrolling
  const activeIndex = activePlayingIndex >= 0 ? activePlayingIndex : selectedSegmentIndex;

  useEffect(() => {
    if (isSegmentArray && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [activeIndex, isSegmentArray]);

  const recordedCount = Object.keys(recordedSegments).filter((key) => {
    const item = recordedSegments[key];
    if (typeof item === "boolean") return item;
    return item?.recorded;
  }).length;

  return (
    <div className="flex h-full flex-col rounded-base border-2 border-border bg-secondary-background shadow-shadow overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-background p-3.5 sm:px-4">
        <div className="flex items-center gap-2 font-heading text-sm sm:text-base">
          <BookOpen className="size-4.5 text-main" />
          <span>TRANSCRIPT</span>
        </div>

        {isSegmentArray && (
          <Badge className="font-heading text-xs" variant="neutral">
            {mode === "continuous"
              ? recordedCount > 0
                ? "Continuous take saved"
                : "No take saved"
              : `${recordedCount} / ${transcript.length} Recorded`}
          </Badge>
        )}
      </div>

      <div className="flex-1 bg-secondary-background p-2 sm:p-3">
        {isSegmentArray ? (
          <ScrollArea className="h-[480px] sm:h-[560px] lg:h-[calc(100vh-210px)] min-h-[380px] pr-2">
            <div className="space-y-2.5">
              {transcript.map((seg, idx) => {
                const isCurrentPlaying =
                  currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms;
                const isCurrentActive = idx === activeIndex;

                const rawRec = recordedSegments[String(idx)];
                const isRecorded = typeof rawRec === "boolean" ? rawRec : Boolean(rawRec?.recorded);
                const isSaving =
                  typeof rawRec === "object" &&
                  rawRec !== null &&
                  rawRec.uploadStatus === "pending";

                return (
                  <button
                    aria-current={isCurrentActive ? "true" : undefined}
                    className={cn(
                      "group relative block w-full cursor-pointer rounded-base border-2 p-3 text-left transition-colors duration-150 sm:p-3.5",
                      isCurrentActive
                        ? "border-border bg-main text-main-foreground dark:bg-foreground dark:text-secondary-background"
                        : cn(
                            "border-border/70 bg-background/90 text-foreground hover:border-border hover:bg-secondary-background",
                            isSaving
                              ? "border-l-4 border-l-status-review-border"
                              : isRecorded && "border-l-4 border-l-status-correct-border",
                          ),
                    )}
                    key={idx}
                    onClick={() => onSelectSegment?.(idx)}
                    ref={isCurrentActive ? activeSegmentRef : null}
                    type="button"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-xs px-1.5 py-0.5 font-mono text-[11px] font-bold border",
                            isCurrentActive
                              ? "border-secondary-background bg-secondary-background text-foreground"
                              : "border-border/60 bg-secondary-background text-foreground/80",
                          )}
                        >
                          #{idx + 1}
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            isCurrentActive
                              ? "text-main-foreground/70 dark:text-secondary-background/70"
                              : "text-foreground/60",
                          )}
                        >
                          {formatTimestamp(seg.start_time_ms)}–{formatTimestamp(seg.end_time_ms)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isCurrentActive && (
                          <span className="flex items-center gap-1 text-[11px] font-heading text-main-foreground dark:text-secondary-background">
                            <Volume2
                              className={cn("size-3.5", isCurrentPlaying && "animate-pulse")}
                            />
                            <span className="hidden sm:inline">
                              {isCurrentPlaying && isPlayerPlaying ? "Playing" : "Current"}
                            </span>
                          </span>
                        )}

                        {isSaving ? (
                          <Badge className="h-5 gap-1 border-status-review-border bg-status-review-bg px-1.5 py-0 font-heading text-[10px] text-status-review-text">
                            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                            Saving...
                          </Badge>
                        ) : isRecorded ? (
                          <Badge className="h-5 gap-1 border-status-correct-border bg-status-correct-bg px-1.5 py-0 font-heading text-[10px] text-status-correct-text">
                            <CheckCircle2 aria-hidden="true" className="size-3" />
                            Recorded
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <p
                      className={cn(
                        "font-heading text-sm leading-relaxed sm:text-base",
                        isCurrentActive
                          ? "text-main-foreground dark:text-secondary-background"
                          : "text-foreground",
                      )}
                      lang="ja"
                    >
                      {seg.script}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-center text-sm text-foreground/60">
            {typeof transcript === "string" ? transcript : "No transcript available."}
          </div>
        )}
      </div>
    </div>
  );
}
