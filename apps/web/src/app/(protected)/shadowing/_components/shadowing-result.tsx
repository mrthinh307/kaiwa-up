"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Radio,
  RotateCcw,
  Star,
  Trophy,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useShadowingReview } from "../_hooks/use-shadowing-review";
import { AudioPlayerCard } from "./audio-player-card";
import { ShadowingAiFeedbackCard } from "./shadowing-ai-feedback-card";
import { ShadowingContinuousReviewCard } from "./shadowing-continuous-review-card";
import { ShadowingTranscriptReview } from "./shadowing-transcript-review";

type ShadowingResultProps = {
  onPracticeAgain: () => void;
  review: ShadowingAttemptReviewResponse;
  shouldCelebrate?: boolean;
};

export function ShadowingResult({
  onPracticeAgain,
  review,
  shouldCelebrate = false,
}: ShadowingResultProps) {
  const [showVideo, setShowVideo] = useState(true);
  const {
    activeOriginalIndex,
    activeSegmentRef,
    handleNextSegment,
    handlePlayOriginalSegment,
    handlePlayUserRecording,
    handlePreviousSegment,
    handleReplaySegment,
    isContinuous,
    isPlayingContinuousVoice,
    player,
    playingUserIndex,
    selectReview,
    selectedReviewIndex,
    toggleContinuousVoicePlayback,
  } = useShadowingReview(review);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const scoreFormatted =
    review.score !== null && review.score !== undefined ? Number(review.score).toFixed(0) : "0";

  return (
    <section aria-labelledby="shadowing-result-title" className="grid gap-6">
      {shouldCelebrate ? <ExpRewardOverlay expEarned={review.earned_exp ?? 0} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-heading uppercase text-foreground/70">Practice Result</p>
            <Badge className="text-xs font-heading" variant="neutral">
              {isContinuous ? (
                <span className="inline-flex items-center gap-1">
                  <Radio className="size-3 text-chart-3" />
                  Continuous Mode
                </span>
              ) : (
                "Segment-by-Segment"
              )}
            </Badge>
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl" id="shadowing-result-title">
            {review.title || "Shadowing Review"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-main font-heading text-main-foreground">
            <Trophy className="mr-1 size-3.5" /> Score: {scoreFormatted}%
          </Badge>
          <Badge className="bg-chart-3 font-heading">
            <Star className="mr-1 size-3.5 fill-current" /> +{review.earned_exp ?? 0} EXP
          </Badge>
          <Badge className="bg-secondary font-heading uppercase">{review.difficulty}</Badge>
          {!isContinuous && (
            <Badge className="bg-chart-4 font-heading">
              <CheckCircle2 className="mr-1 size-3.5" /> {review.completed_segments}/
              {review.total_segments} Segments
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {review.audio_url && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  className="gap-1.5 text-xs"
                  onClick={() => setShowVideo((previous) => !previous)}
                  size="sm"
                  type="button"
                  variant="neutral"
                >
                  {showVideo ? (
                    <>
                      <VideoOff className="size-3.5" /> Hide Video
                    </>
                  ) : (
                    <>
                      <Video className="size-3.5" /> Show Video
                    </>
                  )}
                </Button>
              </div>
              <AudioPlayerCard
                audioUrl={review.audio_url}
                hasNextSegment={selectedReviewIndex < review.segments.length - 1}
                hasPreviousSegment={selectedReviewIndex > 0}
                mode={review.mode}
                onNextSegment={handleNextSegment}
                onPreviousSegment={handlePreviousSegment}
                onReplaySegment={isContinuous ? undefined : handleReplaySegment}
                player={player}
                showVideo={showVideo}
              />
            </div>
          )}

          {isContinuous ? (
            <ShadowingContinuousReviewCard
              isPlaying={isPlayingContinuousVoice}
              onTogglePlayback={toggleContinuousVoicePlayback}
              review={review}
            />
          ) : null}

          {review.ai_feedback ? <ShadowingAiFeedbackCard feedback={review.ai_feedback} /> : null}

          <Card className="border-2 border-border bg-secondary-background/70 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 font-heading text-sm text-foreground/80">
                <Headphones className="size-4 text-main" />
                <span>Self-Comparison Guide</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/70">
                {isContinuous
                  ? "Click any sentence in the transcript to jump playback to that point. Compare your voice recording with the original video."
                  : "Click any segment on the right to seek the original audio. Compare your voice side-by-side to review pronunciation and intonation."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <ShadowingTranscriptReview
            activeOriginalIndex={activeOriginalIndex}
            activeSegmentRef={activeSegmentRef}
            formatTime={formatTime}
            handlePlayOriginalSegment={handlePlayOriginalSegment}
            handlePlayUserRecording={handlePlayUserRecording}
            isContinuous={isContinuous}
            playingUserIndex={playingUserIndex}
            review={review}
            selectedReviewIndex={selectedReviewIndex}
            selectReview={selectReview}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t-2 border-border pt-6">
        <Button asChild variant="neutral">
          <Link href="/lessons">
            <ArrowLeft className="mr-1 size-4" /> Back to lessons
          </Link>
        </Button>
        <Button className="gap-2" onClick={onPracticeAgain} type="button">
          <RotateCcw className="size-4" /> Practice again
        </Button>
      </div>
    </section>
  );
}
