"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Mic,
  Pause,
  RotateCcw,
  Star,
  Trophy,
  Video,
  VideoOff,
  Volume2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { AudioPlayerCard } from "./audio-player-card";

interface ShadowingResultProps {
  onPracticeAgain: () => void;
  review: ShadowingAttemptReviewResponse;
}

export function ShadowingResult({ onPracticeAgain, review }: ShadowingResultProps) {
  const [playingUserIndex, setPlayingUserIndex] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(true);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const playerSegments = useMemo(
    () =>
      review.segments.map((seg) => ({
        end_time_ms: seg.end_time_ms ?? 0,
        start_time_ms: seg.start_time_ms ?? 0,
      })),
    [review.segments],
  );

  const player = useAudioPlayer(review.audio_url ?? "", 0, {
    segments: playerSegments,
  });

  const activeOriginalIndex =
    player.isPlaying && review.segments.length > 0
      ? review.segments.findIndex(
          (seg) =>
            player.currentTime >= (seg.start_time_ms ?? 0) / 1000 - 0.05 &&
            player.currentTime < (seg.end_time_ms ?? 0) / 1000,
        )
      : -1;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlayOriginalSegment = (index: number, startMs: number, endMs: number) => {
    if (!review.audio_url) return;

    if (userAudioRef.current) {
      userAudioRef.current.pause();
      setPlayingUserIndex(null);
    }

    if (activeOriginalIndex === index && player.isPlaying) {
      player.pause();
      return;
    }

    player.playSegment(startMs / 1000, endMs / 1000);
  };

  const handlePlayUserRecording = (index: number, url: string | null | undefined) => {
    if (!url) return;

    if (player.isPlaying) {
      player.pause();
    }

    if (playingUserIndex === index && userAudioRef.current) {
      userAudioRef.current.pause();
      setPlayingUserIndex(null);
      return;
    }

    if (!userAudioRef.current) {
      userAudioRef.current = new Audio(url);
    }

    const audio = userAudioRef.current;
    audio.src = url;
    setPlayingUserIndex(index);

    audio.play().catch(() => setPlayingUserIndex(null));
    audio.onended = () => setPlayingUserIndex(null);
  };

  const scoreFormatted =
    review.score !== null && review.score !== undefined ? Number(review.score).toFixed(0) : "0";

  return (
    <section aria-labelledby="shadowing-result-title" className="grid gap-6">
      <ExpRewardOverlay expEarned={review.earned_exp ?? 0} />

      {/* Header Result Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5">
        <div>
          <p className="text-sm font-heading uppercase text-foreground/70">Practice Result</p>
          <h1 className="text-3xl font-heading" id="shadowing-result-title">
            {review.title || "Shadowing Review"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-main text-main-foreground font-heading">
            <Trophy className="mr-1 size-3.5" /> Score: {scoreFormatted}%
          </Badge>
          <Badge className="bg-chart-3 font-heading">
            <Star className="mr-1 size-3.5 fill-current" /> +{review.earned_exp ?? 0} EXP
          </Badge>
          <Badge className="bg-secondary font-heading uppercase">{review.difficulty}</Badge>
          <Badge className="bg-chart-4 font-heading">
            <CheckCircle2 className="mr-1 size-3.5" /> {review.completed_segments}/
            {review.total_segments} Segments
          </Badge>
        </div>
      </div>

      {/* Audio Player Card supporting YouTube and direct Audio */}
      {review.audio_url && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="gap-1.5 text-xs"
              onClick={() => setShowVideo((prev) => !prev)}
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
          <AudioPlayerCard audioUrl={review.audio_url} player={player} showVideo={showVideo} />
        </div>
      )}

      {/* Summary Stat Card */}
      <Card className="border-2 border-border bg-secondary-background shadow-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-heading">
            <Headphones className="size-5 text-main" /> Segment Comparison & Self-Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/80">
            Listen back to each segment from the original audio and compare it with your own voice
            recordings to evaluate your pronunciation, pitch accent, and rhythm.
          </p>
        </CardContent>
      </Card>

      {/* Segment List */}
      <div className="grid gap-4">
        {review.segments.map((segment) => {
          const isPlayingOriginal = activeOriginalIndex === segment.segment_index;
          const isPlayingUser = playingUserIndex === segment.segment_index;
          const startMs = segment.start_time_ms ?? 0;
          const endMs = segment.end_time_ms ?? 0;

          return (
            <Card
              className={cn(
                "border-2 border-border shadow-shadow transition-all",
                segment.recorded ? "bg-background" : "bg-secondary-background/60",
              )}
              key={segment.segment_index}
            >
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-base border border-border bg-main/10 px-2 py-0.5 text-xs font-heading text-main">
                      Segment #{segment.segment_index + 1}
                    </span>
                    <span className="font-mono text-xs text-foreground/60">
                      {formatTime(startMs)} - {formatTime(endMs)}
                    </span>
                  </div>

                  {segment.recorded ? (
                    <span className="inline-flex items-center gap-1 font-heading text-xs text-success">
                      <CheckCircle2 className="size-3.5" /> Recorded (
                      {segment.duration_seconds ?? 0}
                      s)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-heading text-xs text-foreground/50">
                      <XCircle className="size-3.5" /> Not recorded
                    </span>
                  )}
                </div>

                {/* Japanese Script */}
                <div className="my-4">
                  <p className="font-heading text-xl leading-relaxed tracking-wide text-foreground">
                    {segment.script}
                  </p>
                </div>

                {/* Audio Comparison Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Play Original Audio */}
                  {review.audio_url && (
                    <Button
                      className="gap-1.5"
                      onClick={() =>
                        handlePlayOriginalSegment(segment.segment_index, startMs, endMs)
                      }
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

                  {/* Play User Recording */}
                  {segment.recorded && segment.playback_url ? (
                    <Button
                      className="gap-1.5"
                      onClick={() =>
                        handlePlayUserRecording(segment.segment_index, segment.playback_url)
                      }
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
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
