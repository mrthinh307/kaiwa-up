"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";
import type { RefObject } from "react";

import { CheckCircle2, Headphones, Mic, Pause, Volume2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { ShadowingWordTokens } from "./shadowing-word-tokens";

type ShadowingTranscriptReviewProps = {
  activeOriginalIndex: number;
  activeSegmentRef: RefObject<HTMLDivElement | null>;
  formatTime: (milliseconds: number) => string;
  handlePlayOriginalSegment: (index: number, startMs: number, endMs: number) => void;
  handlePlayUserRecording: (index: number, url: string | null | undefined) => void;
  isContinuous: boolean;
  playingUserIndex: number | null;
  review: ShadowingAttemptReviewResponse;
  selectedReviewIndex: number;
  selectReview: (index: number) => void;
};

export function ShadowingTranscriptReview({
  activeOriginalIndex,
  activeSegmentRef,
  formatTime,
  handlePlayOriginalSegment,
  handlePlayUserRecording,
  isContinuous,
  playingUserIndex,
  review,
  selectedReviewIndex,
  selectReview,
}: ShadowingTranscriptReviewProps) {
  return (
    <Card className="border-2 border-border bg-secondary-background shadow-shadow">
      <CardHeader className="border-b-2 border-border/40 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-heading sm:text-lg">
            <Headphones className="size-5 text-main" />
            <span>{isContinuous ? "Lesson Transcript" : "Transcript & Review"}</span>
          </CardTitle>
          {!isContinuous && (
            <Badge className="text-xs font-heading" variant="neutral">
              {review.completed_segments}/{review.total_segments} Recorded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <ScrollArea className="h-[520px] pr-3">
          <div className="space-y-3.5">
            {review.segments.map((segment) => {
              const isSelected = selectedReviewIndex === segment.segment_index;
              const isPlayingOriginal = activeOriginalIndex === segment.segment_index;
              const isPlayingUser = playingUserIndex === segment.segment_index;
              const isCurrentFocus =
                segment.segment_index ===
                (isContinuous && activeOriginalIndex >= 0
                  ? activeOriginalIndex
                  : selectedReviewIndex);
              const startMs = segment.start_time_ms ?? 0;
              const endMs = segment.end_time_ms ?? 0;

              return (
                <div
                  aria-current={isCurrentFocus ? "true" : undefined}
                  className={cn(
                    "cursor-pointer rounded-base border-2 p-4 transition-all",
                    isCurrentFocus
                      ? "border-main bg-main/15 shadow-shadow ring-2 ring-main/30"
                      : isPlayingOriginal
                        ? "border-main/50 bg-main/5"
                        : segment.recorded
                          ? "border-border bg-background"
                          : "border-border/60 bg-background/60",
                  )}
                  key={segment.segment_index}
                  onClick={() => selectReview(segment.segment_index)}
                  ref={isCurrentFocus ? activeSegmentRef : null}
                >
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      {!isContinuous && (
                        <span
                          className={cn(
                            "rounded-base border px-2 py-0.5 font-heading text-xs",
                            isSelected
                              ? "border-main bg-main font-bold text-main-foreground"
                              : "border-border bg-secondary-background text-foreground/80",
                          )}
                        >
                          Segment #{segment.segment_index + 1}
                        </span>
                      )}
                      <span className="font-mono text-xs text-foreground/60">
                        [{formatTime(startMs)} - {formatTime(endMs)}]
                      </span>
                    </div>

                    {isPlayingOriginal && (
                      <span className="inline-flex items-center gap-1 font-heading text-xs text-main">
                        <Volume2 className="size-3.5 animate-pulse" />
                        <span>Speaking</span>
                      </span>
                    )}

                    {!isContinuous && (
                      <>
                        {segment.similarity_score !== null &&
                          segment.similarity_score !== undefined && (
                            <span
                              className={cn(
                                "rounded-base border px-2 py-0.5 font-heading text-xs",
                                segment.similarity_score >= 80
                                  ? "border-success/40 bg-success/10 text-success"
                                  : segment.similarity_score >= 50
                                    ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
                                    : "border-destructive/40 bg-destructive/10 text-destructive",
                              )}
                            >
                              Accuracy: {Number(segment.similarity_score).toFixed(0)}%
                            </span>
                          )}
                        {segment.recorded ? (
                          <span className="inline-flex items-center gap-1 font-heading text-xs text-success">
                            <CheckCircle2 className="size-3.5" />
                            <span>
                              Recorded
                              {segment.duration_seconds ? ` (${segment.duration_seconds}s)` : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-heading text-xs text-foreground/50">
                            <XCircle className="size-3.5" />
                            <span>Not recorded</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <ShadowingWordTokens fallbackText={segment.script} words={segment.words} />

                  {segment.user_transcript && (
                    <div className="mb-3 space-y-1 rounded-base border border-border/70 bg-background/90 p-2.5 text-xs">
                      <span className="flex items-center gap-1 font-heading text-[11px] text-foreground/70">
                        <Mic className="size-3 text-main" /> Recognized Voice:
                      </span>
                      <p className="font-heading text-sm text-foreground">
                        {segment.user_transcript}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {review.audio_url && (
                      <Button
                        className="gap-1 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePlayOriginalSegment(segment.segment_index, startMs, endMs);
                        }}
                        size="sm"
                        variant={isPlayingOriginal ? "default" : "neutral"}
                      >
                        {isPlayingOriginal ? (
                          <>
                            <Pause className="size-3.5" /> Pause Original
                          </>
                        ) : (
                          <>
                            <Volume2 className="size-3.5 text-main" /> Listen Original
                          </>
                        )}
                      </Button>
                    )}

                    {!isContinuous && segment.recorded && segment.playback_url ? (
                      <Button
                        className="gap-1 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePlayUserRecording(segment.segment_index, segment.playback_url);
                        }}
                        size="sm"
                        variant={isPlayingUser ? "default" : "neutral"}
                      >
                        {isPlayingUser ? (
                          <>
                            <Pause className="size-3.5" /> Pause Voice
                          </>
                        ) : (
                          <>
                            <Mic className="size-3.5" /> Listen My Recording
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
