"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Lightbulb,
  Mic,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Video,
  VideoOff,
  Volume2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { useAudioPlayer } from "../_hooks/use-audio-player";
import { useShadowingShortcuts } from "../_hooks/use-shadowing-shortcuts";
import { formatShadowingDuration } from "../_utils/shadowing-formatters";
import { AudioPlayerCard } from "./audio-player-card";

interface ShadowingResultProps {
  onPracticeAgain: () => void;
  review: ShadowingAttemptReviewResponse;
}

export function ShadowingResult({ onPracticeAgain, review }: ShadowingResultProps) {
  const isContinuous = review.mode === "continuous";
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [playingUserIndex, setPlayingUserIndex] = useState<number | null>(null);
  const [isPlayingContinuousVoice, setIsPlayingContinuousVoice] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const continuousAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!review.user_continuous_recording_url) return;

    const audio = new Audio(review.user_continuous_recording_url);
    continuousAudioRef.current = audio;

    const handleEnded = () => setIsPlayingContinuousVoice(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [review.user_continuous_recording_url]);

  const playerSegments = useMemo(
    () =>
      review.segments.map((seg) => ({
        end_time_ms: seg.end_time_ms ?? 0,
        start_time_ms: seg.start_time_ms ?? 0,
      })),
    [review.segments],
  );

  const player = useAudioPlayer(review.audio_url ?? "", 0, {
    segments: isContinuous ? [] : playerSegments,
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

  const handlePlayOriginalSegment = useCallback(
    (index: number, startMs: number, endMs: number) => {
      if (!review.audio_url) return;

      setSelectedReviewIndex(index);

      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
      }
      if (continuousAudioRef.current) {
        continuousAudioRef.current.pause();
        setIsPlayingContinuousVoice(false);
      }

      if (activeOriginalIndex === index && player.isPlaying) {
        player.pause();
        return;
      }

      if (isContinuous) {
        player.seek(startMs / 1000);
        player.play();
      } else {
        player.playSegment(startMs / 1000, endMs / 1000);
      }
    },
    [activeOriginalIndex, isContinuous, player, review.audio_url],
  );

  const handlePlayUserRecording = useCallback(
    (index: number, url: string | null | undefined) => {
      if (!url) return;

      setSelectedReviewIndex(index);

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
    },
    [player, playingUserIndex],
  );

  const toggleContinuousVoicePlayback = () => {
    if (!continuousAudioRef.current) return;

    if (isPlayingContinuousVoice) {
      continuousAudioRef.current.pause();
      setIsPlayingContinuousVoice(false);
    } else {
      if (player.isPlaying) {
        player.pause();
      }
      continuousAudioRef.current
        .play()
        .then(() => setIsPlayingContinuousVoice(true))
        .catch(() => setIsPlayingContinuousVoice(false));
    }
  };

  const handlePreviousSegment = useCallback(() => {
    if (selectedReviewIndex > 0) {
      const nextIdx = selectedReviewIndex - 1;
      setSelectedReviewIndex(nextIdx);
      const seg = review.segments[nextIdx];
      if (seg) {
        handlePlayOriginalSegment(nextIdx, seg.start_time_ms ?? 0, seg.end_time_ms ?? 0);
      }
    }
  }, [handlePlayOriginalSegment, review.segments, selectedReviewIndex]);

  const handleNextSegment = useCallback(() => {
    if (selectedReviewIndex < review.segments.length - 1) {
      const nextIdx = selectedReviewIndex + 1;
      setSelectedReviewIndex(nextIdx);
      const seg = review.segments[nextIdx];
      if (seg) {
        handlePlayOriginalSegment(nextIdx, seg.start_time_ms ?? 0, seg.end_time_ms ?? 0);
      }
    }
  }, [handlePlayOriginalSegment, review.segments, selectedReviewIndex]);

  // Keyboard shortcuts in review mode
  useShadowingShortcuts({
    onNext: isContinuous ? undefined : handleNextSegment,
    onPrevious: isContinuous ? undefined : handlePreviousSegment,
    onTogglePlay: () => player.togglePlay(),
  });

  // Auto-scroll to selected/playing segment in review list
  const activeFocusIndex =
    isContinuous && activeOriginalIndex >= 0 ? activeOriginalIndex : selectedReviewIndex;

  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeFocusIndex]);

  const scoreFormatted =
    review.score !== null && review.score !== undefined ? Number(review.score).toFixed(0) : "0";

  return (
    <section aria-labelledby="shadowing-result-title" className="grid gap-6">
      <ExpRewardOverlay expEarned={review.earned_exp ?? 0} />

      {/* Header Result Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-heading uppercase text-foreground/70">Practice Result</p>
            <Badge className="font-heading text-xs" variant="neutral">
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
          <h1 className="mt-1 text-2xl sm:text-3xl font-heading" id="shadowing-result-title">
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
          {!isContinuous && (
            <Badge className="bg-chart-4 font-heading">
              <CheckCircle2 className="mr-1 size-3.5" /> {review.completed_segments}/
              {review.total_segments} Segments
            </Badge>
          )}
        </div>
      </div>

      {/* Main Review Grid: Player on Left, Scrollable Transcript on Right */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Player & Continuous Voice Recording */}
        <div className="space-y-6 lg:col-span-7">
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
              <AudioPlayerCard
                audioUrl={review.audio_url}
                hasNextSegment={selectedReviewIndex < review.segments.length - 1}
                hasPreviousSegment={selectedReviewIndex > 0}
                mode={review.mode}
                onNextSegment={handleNextSegment}
                onPreviousSegment={handlePreviousSegment}
                player={player}
                showVideo={showVideo}
              />
            </div>
          )}

          {/* Continuous Voice Recording Card */}
          {isContinuous && review.user_continuous_recording_url && (
            <Card className="border-2 border-border bg-secondary-background shadow-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base font-heading">
                  <div className="flex items-center gap-2">
                    <Mic className="size-5 text-main" />
                    <span>Your Continuous Voice Recording</span>
                  </div>
                  <Badge className="bg-success text-success-foreground font-heading text-xs">
                    {formatShadowingDuration(review.user_continuous_duration_seconds ?? 0)} Recorded
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-foreground/75 leading-relaxed">
                  Listen to your full continuous audio session and self-evaluate your flow and
                  rhythm.
                </p>
                <div className="flex items-center gap-3 rounded-base border-2 border-border bg-background p-4">
                  <Button
                    aria-label={
                      isPlayingContinuousVoice
                        ? "Pause continuous recording"
                        : "Play continuous recording"
                    }
                    className="size-12 shrink-0 text-main-foreground"
                    onClick={toggleContinuousVoicePlayback}
                    size="icon"
                    type="button"
                  >
                    {isPlayingContinuousVoice ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="ml-0.5 size-5" />
                    )}
                  </Button>
                  <div>
                    <p className="font-heading text-sm">Play Full Voice Take</p>
                    <p className="font-mono text-xs text-foreground/60">
                      Duration:{" "}
                      {formatShadowingDuration(review.user_continuous_duration_seconds ?? 0)}
                    </p>
                  </div>
                </div>

                {review.user_continuous_transcript && (
                  <div className="rounded-base border-2 border-border/70 bg-background p-3.5 space-y-1">
                    <p className="text-xs font-heading text-foreground/70 flex items-center gap-1.5">
                      <Mic className="size-3.5 text-main" /> Recognized Speech (STT):
                    </p>
                    <p className="text-sm font-heading text-foreground leading-relaxed">
                      {review.user_continuous_transcript}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Learning Feedback Card (Informational Only) */}
          {review.ai_feedback && (
            <Card className="border-2 border-border bg-secondary-background shadow-shadow">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base font-heading">
                    <Sparkles className="size-5 text-main" />
                    <span>AI Learning Feedback</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {review.ai_feedback.similarity_score !== null &&
                      review.ai_feedback.similarity_score !== undefined && (
                        <Badge className="bg-main text-main-foreground font-heading text-xs">
                          AI Similarity: {Number(review.ai_feedback.similarity_score).toFixed(0)}%
                        </Badge>
                      )}
                    <Badge className="font-heading text-xs" variant="neutral">
                      Informational
                    </Badge>
                  </div>
                </div>
                <p className="text-[11px] text-foreground/60">
                  This AI evaluation is provided solely for your learning reference and does not
                  affect your lesson score or EXP.
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* AI Pedagogical Feedback */}
                {review.ai_feedback.feedback && (
                  <div className="space-y-1">
                    <p className="text-xs font-heading uppercase text-foreground/70">
                      Overall Assessment
                    </p>
                    <p className="text-sm text-foreground leading-relaxed bg-background/80 rounded-base border border-border/70 p-3">
                      {review.ai_feedback.feedback}
                    </p>
                  </div>
                )}

                {/* Corrections List */}
                {review.ai_feedback.corrections && review.ai_feedback.corrections.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-heading uppercase text-foreground/70 flex items-center gap-1">
                      <AlertCircle className="size-3.5 text-chart-4" />
                      Pronunciation & Word Corrections
                    </p>
                    <div className="space-y-2">
                      {review.ai_feedback.corrections.map((corr, idx) => (
                        <div
                          className="rounded-base border border-border/80 bg-background p-3 text-xs space-y-1"
                          key={idx}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="line-through text-destructive font-heading bg-destructive/10 px-1.5 py-0.5 rounded">
                              {corr.original}
                            </span>
                            <span className="text-foreground/60">→</span>
                            <span className="text-success font-heading bg-success/10 px-1.5 py-0.5 rounded">
                              {corr.corrected}
                            </span>
                          </div>
                          {corr.reason && (
                            <p className="text-foreground/75 text-[11px]">{corr.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pronunciation Hints */}
                {review.ai_feedback.hints && review.ai_feedback.hints.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-heading uppercase text-foreground/70 flex items-center gap-1">
                      <Lightbulb className="size-3.5 text-chart-3" />
                      Actionable Improvement Tips
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-foreground/80 bg-background/60 rounded-base border border-border/60 p-3">
                      {review.ai_feedback.hints.map((hint, idx) => (
                        <li key={idx}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips / Shortcuts card */}
          <Card className="border-2 border-border bg-secondary-background/70 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 font-heading text-sm text-foreground/80 mb-2">
                <Headphones className="size-4 text-main" />
                <span>Self-Comparison Guide</span>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {isContinuous
                  ? "Click any sentence in the transcript to jump playback to that point. Compare your voice recording with the original video."
                  : "Click any segment on the right to seek the original audio. Compare your voice side-by-side to review pronunciation and intonation."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scrollable Segment Transcript & Comparison List */}
        <div className="lg:col-span-5">
          <Card className="border-2 border-border bg-secondary-background shadow-shadow">
            <CardHeader className="pb-3 border-b-2 border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-heading">
                  <Headphones className="size-5 text-main" />
                  <span>{isContinuous ? "Lesson Transcript" : "Transcript & Review"}</span>
                </CardTitle>
                {!isContinuous && (
                  <Badge className="font-heading text-xs" variant="neutral">
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
                          "rounded-base border-2 p-4 transition-all cursor-pointer",
                          isCurrentFocus
                            ? "border-main bg-main/15 shadow-shadow ring-2 ring-main/30"
                            : isPlayingOriginal
                              ? "border-main/50 bg-main/5"
                              : segment.recorded
                                ? "border-border bg-background"
                                : "border-border/60 bg-background/60",
                        )}
                        key={segment.segment_index}
                        onClick={() => setSelectedReviewIndex(segment.segment_index)}
                        ref={isCurrentFocus ? activeSegmentRef : null}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-2.5">
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
                              {segment.recorded ? (
                                <span className="inline-flex items-center gap-1 font-heading text-xs text-success">
                                  <CheckCircle2 className="size-3.5" />
                                  <span>
                                    Recorded
                                    {segment.duration_seconds
                                      ? ` (${segment.duration_seconds}s)`
                                      : ""}
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

                        {/* Japanese Script */}
                        <p className="font-heading text-lg sm:text-xl leading-relaxed text-foreground mb-3">
                          {segment.script}
                        </p>

                        {/* Recognized Voice Transcript (if available) */}
                        {segment.user_transcript && (
                          <div className="rounded-base border border-border/70 bg-background/90 p-2.5 mb-3 text-xs space-y-1">
                            <span className="font-heading text-foreground/70 flex items-center gap-1 text-[11px]">
                              <Mic className="size-3 text-main" /> Recognized Voice:
                            </span>
                            <p className="font-heading text-foreground text-sm">
                              {segment.user_transcript}
                            </p>
                          </div>
                        )}

                        {/* Audio Comparison Controls */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Play Original Audio */}
                          {review.audio_url && (
                            <Button
                              className="gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
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

                          {/* Play User Recording (Segmented mode) */}
                          {!isContinuous && segment.recorded && segment.playback_url ? (
                            <Button
                              className="gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayUserRecording(
                                  segment.segment_index,
                                  segment.playback_url,
                                );
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
        </div>
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
