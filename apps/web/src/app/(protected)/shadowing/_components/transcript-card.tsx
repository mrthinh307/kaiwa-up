"use client";

import type { TranscriptSegment } from "@kaiwa-app/api-client";

import { Eye, EyeOff, FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface TranscriptCardProps {
  transcript: string | TranscriptSegment[];
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptCard({ transcript }: TranscriptCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  const isSegmentArray = Array.isArray(transcript);

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading text-lg">
          <FileText className="size-5 text-main" />
          <span>Japanese Transcript</span>
        </div>

        <Button
          aria-label={isVisible ? "Hide Japanese transcript" : "Show Japanese transcript"}
          className="gap-2 text-sm"
          onClick={() => setIsVisible(!isVisible)}
          size="sm"
          variant="neutral"
        >
          {isVisible ? (
            <>
              <EyeOff className="size-4" />
              <span>Hide Transcript</span>
            </>
          ) : (
            <>
              <Eye className="size-4" />
              <span>Show Transcript</span>
            </>
          )}
        </Button>
      </div>

      {isVisible ? (
        <div className="mt-4 rounded-base border-2 border-border bg-background p-5">
          {isSegmentArray ? (
            <div className="space-y-3">
              {transcript.map((seg, idx) => (
                <div
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
                  key={idx}
                >
                  <span className="font-mono text-xs text-foreground/60 shrink-0 select-none">
                    [{formatTimestamp(seg.start_time_ms)}]
                  </span>
                  <p className="font-sans text-lg leading-relaxed sm:text-xl text-foreground font-semibold">
                    {seg.script}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xl leading-relaxed sm:text-2xl text-foreground font-semibold">
              {transcript}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex h-20 items-center justify-center rounded-base border-2 border-dashed border-border bg-background/50 text-sm text-foreground/60">
          <span>Transcript hidden. Focus on your listening reflexes!</span>
        </div>
      )}
    </div>
  );
}
