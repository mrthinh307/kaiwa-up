"use client";

import { Eye, EyeOff, FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface TranscriptCardProps {
  transcriptJa: string;
}

export function TranscriptCard({ transcriptJa }: TranscriptCardProps) {
  const [isVisible, setIsVisible] = useState(true);

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
          <p className="font-sans text-xl leading-relaxed sm:text-2xl text-foreground font-semibold">
            {transcriptJa}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex h-20 items-center justify-center rounded-base border-2 border-dashed border-border bg-background/50 text-sm text-foreground/60">
          <span>Transcript hidden. Focus on your listening reflexes!</span>
        </div>
      )}
    </div>
  );
}
