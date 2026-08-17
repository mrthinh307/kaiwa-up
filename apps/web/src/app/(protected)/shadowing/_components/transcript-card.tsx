"use client";

import type { TranscriptSegment } from "@kaiwa-app/api-client";

import { Eye, EyeOff, FileText, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TranscriptCardProps {
  currentTimeMs?: number;
  onSeekSegment?: (startTimeMs: number) => void;
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
  onSeekSegment,
  transcript,
}: TranscriptCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  const isSegmentArray = Array.isArray(transcript);

  // Find active segment based on current audio playback time
  const activeIndex = isSegmentArray
    ? transcript.findIndex((seg) => {
        return currentTimeMs >= seg.start_time_ms && currentTimeMs < seg.end_time_ms;
      })
    : -1;

  // Auto-scroll to the active segment when it changes and panel is visible
  useEffect(() => {
    if (isVisible && activeIndex >= 0 && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex, isVisible]);

  return (
    <div className="flex h-full flex-col rounded-base border-2 border-border bg-secondary-background p-5 sm:p-6 shadow-shadow">
      <div className="flex items-center justify-between pb-4 border-b-2 border-border/60">
        <div className="flex items-center gap-2 font-heading text-lg">
          <FileText className="size-5 text-main" />
          <span>Transcript</span>
          {isSegmentArray && (
            <Badge className="ml-1 text-xs" variant="neutral">
              {transcript.length} segments
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
              <div className="space-y-3.5">
                {transcript.map((seg, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group relative rounded-base border-2 transition-all duration-200",
                        isActive
                          ? "border-border bg-main text-main-foreground shadow-shadow translate-x-1 p-4 sm:p-5"
                          : "border-border/50 bg-background/80 hover:bg-background hover:border-border p-3.5 sm:p-4",
                        onSeekSegment && "cursor-pointer",
                      )}
                      key={idx}
                      onClick={() => onSeekSegment?.(seg.start_time_ms)}
                      ref={isActive ? activeSegmentRef : null}
                      role={onSeekSegment ? "button" : undefined}
                      tabIndex={onSeekSegment ? 0 : undefined}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={cn(
                            "font-mono text-xs select-none",
                            isActive
                              ? "bg-background text-foreground border-2 border-border font-bold px-2 py-0.5 rounded-base shadow-2xs"
                              : "text-foreground/50",
                          )}
                        >
                          [{formatTimestamp(seg.start_time_ms)} – {formatTimestamp(seg.end_time_ms)}
                          ]
                        </span>

                        {isActive && (
                          <span className="flex items-center gap-1.5 font-heading text-xs font-bold bg-background text-foreground border-2 border-border px-2.5 py-0.5 rounded-base shadow-2xs">
                            <Play className="size-3 fill-current text-main" />
                            Now Playing
                          </span>
                        )}
                      </div>

                      <p
                        className={cn(
                          "font-sans leading-relaxed transition-colors",
                          isActive
                            ? "mt-2 text-xl sm:text-2xl font-bold text-main-foreground"
                            : "mt-1 text-base sm:text-lg font-normal text-foreground/75 group-hover:text-foreground",
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
            Focus on your listening reflexes first. Click &ldquo;Show&rdquo; anytime to view
            synchronized text.
          </p>
        </div>
      )}
    </div>
  );
}
