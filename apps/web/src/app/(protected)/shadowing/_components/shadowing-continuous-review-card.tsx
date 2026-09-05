"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { Mic, Pause, Play, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatShadowingDuration } from "../_utils/shadowing-formatters";
import { ShadowingWordTokens } from "./shadowing-word-tokens";

type ShadowingContinuousReviewCardProps = {
  isPlaying: boolean;
  onTogglePlayback: () => void;
  review: ShadowingAttemptReviewResponse;
};

export function ShadowingContinuousReviewCard({
  isPlaying,
  onTogglePlayback,
  review,
}: ShadowingContinuousReviewCardProps) {
  if (!review.user_continuous_recording_url && !review.user_continuous_transcript) {
    return null;
  }

  return (
    <Card className="border-2 border-border bg-secondary-background shadow-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-heading">
          <div className="flex items-center gap-2">
            <Mic className="size-5 text-main" />
            <span>Your Continuous Voice Recording</span>
          </div>
          {review.user_continuous_duration_seconds !== undefined &&
            review.user_continuous_duration_seconds !== null && (
              <Badge className="bg-success text-xs font-heading text-success-foreground">
                {formatShadowingDuration(review.user_continuous_duration_seconds)} Recorded
              </Badge>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-foreground/75">
          Listen to your full continuous audio session and self-evaluate your flow and rhythm.
        </p>
        {review.user_continuous_recording_url && (
          <div className="flex items-center gap-3 rounded-base border-2 border-border bg-background p-4">
            <Button
              aria-label={isPlaying ? "Pause continuous recording" : "Play continuous recording"}
              className="size-12 shrink-0 text-main-foreground"
              onClick={onTogglePlayback}
              size="icon"
              type="button"
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
            </Button>
            <div>
              <p className="font-heading text-sm">Play Full Voice Take</p>
              <p className="font-mono text-xs text-foreground/60">
                Duration: {formatShadowingDuration(review.user_continuous_duration_seconds ?? 0)}
              </p>
            </div>
          </div>
        )}

        {review.user_continuous_transcript && (
          <div className="space-y-1 rounded-base border-2 border-border/70 bg-background p-3.5">
            <p className="flex items-center gap-1.5 font-heading text-xs text-foreground/70">
              <Mic className="size-3.5 text-main" /> Recognized Speech (STT):
            </p>
            <p className="font-heading text-sm leading-relaxed text-foreground">
              {review.user_continuous_transcript}
            </p>
          </div>
        )}

        {review.ai_feedback?.words && review.ai_feedback.words.length > 0 && (
          <div className="space-y-2 rounded-base border-2 border-border/70 bg-background p-3.5">
            <p className="flex items-center gap-1.5 font-heading text-xs text-foreground/70">
              <Sparkles className="size-3.5 text-main" /> Word-Level Accuracy Breakdown:
            </p>
            <ShadowingWordTokens
              fallbackText={review.user_continuous_transcript ?? ""}
              words={review.ai_feedback.words}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-1 text-[11px] text-foreground/60">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-foreground/40" /> Normal: Correct
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-destructive" /> Red wavy: Mispronounced
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-chart-3" /> Amber dashed: Omitted
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
