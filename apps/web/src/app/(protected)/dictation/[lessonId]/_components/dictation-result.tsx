"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Headphones,
  LoaderCircle,
  Play,
  RotateCcw,
  Trophy,
  VideoOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DictationResultProps } from "../../_types/dictation-practice";

import { formatDictationTimestamp, getYouTubeVideoId } from "../../_utils/dictation-formatters";

const scoreFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function DictationResult({
  attempt,
  completion,
  content,
  isStarting,
  onTryAgain,
  review,
  startError,
}: DictationResultProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackRequest, setPlaybackRequest] = useState(0);

  const firstIncorrectPosition = review.details.findIndex((detail) => !detail.is_correct);
  const [activeReviewPosition, setActiveReviewPosition] = useState(
    firstIncorrectPosition >= 0 ? firstIncorrectPosition : 0,
  );
  const activeReview = review.details.at(activeReviewPosition);
  const activeSegment = activeReview
    ? attempt.segments.find((segment) => segment.segment_index === activeReview.segment_index)
    : undefined;

  const youtubeVideoId = useMemo(() => getYouTubeVideoId(attempt.audio_url), [attempt.audio_url]);

  if (!activeReview || !activeSegment) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Attempt review is out of sync</AlertTitle>
        <AlertDescription>
          The review details do not match the segments returned when this attempt started.
        </AlertDescription>
      </Alert>
    );
  }

  const startSeconds = Math.floor(activeSegment.start_time_ms / 1_000);
  const endSeconds = Math.ceil(activeSegment.end_time_ms / 1_000);
  const embedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?start=${startSeconds}&end=${endSeconds}&autoplay=${playbackRequest > 0 ? 1 : 0}&rel=0&playsinline=1`
    : undefined;

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = activeSegment.start_time_ms / 1_000;
      void audioRef.current.play();
      return;
    }
    setPlaybackRequest((current) => current + 1);
  };

  const isUnanswered = !activeReview.user_answer.trim();

  return (
    <section aria-labelledby="dictation-result-heading" className="space-y-8">
      <ExpRewardOverlay expEarned={completion.earned_exp} />

      <div className="overflow-hidden rounded-base border-4 border-border bg-main text-main-foreground shadow-shadow">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <Badge
              className="gap-2 bg-secondary-background text-foreground shadow-shadow"
              variant="neutral"
            >
              <Trophy aria-hidden="true" />
              Attempt {attempt.attempt_number} completed
            </Badge>
            <h2
              className="mt-6 font-heading text-3xl leading-tight sm:text-4xl"
              id="dictation-result-heading"
            >
              Dictation complete.
            </h2>
            <p className="mt-4 max-w-[620px] leading-relaxed text-main-foreground/75 sm:text-lg">
              Your attempt is now locked. The score and EXP below come from the completion response;
              the segment review comes from the saved attempt.
            </p>
          </div>

          <dl className="grid grid-cols-3 border-t-4 border-border bg-secondary-background text-foreground lg:border-t-0 lg:border-l-4">
            <div className="flex flex-col justify-center p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Correct
              </dt>
              <dd className="mt-2 font-heading text-2xl tabular-nums sm:text-3xl">
                {completion.correct_count}/{completion.total_count}
              </dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Score
              </dt>
              <dd className="mt-2 font-heading text-2xl tabular-nums sm:text-3xl">
                {scoreFormatter.format(completion.score)}%
              </dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                EXP
              </dt>
              <dd className="mt-2 font-heading text-2xl tabular-nums sm:text-3xl">
                +{completion.earned_exp}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-span-5 lg:z-20">
          {/* Review Video Player Card */}
          <section
            aria-labelledby="dictation-review-listen-heading"
            className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
              <div className="flex items-center gap-2">
                <Headphones aria-hidden="true" className="size-5" />
                <h3
                  className="text-sm font-heading tracking-wide uppercase"
                  id="dictation-review-listen-heading"
                >
                  Listen to segment
                </h3>
              </div>
              <Badge className="bg-secondary-background text-foreground" variant="neutral">
                #{activeSegment.segment_index + 1}
              </Badge>
            </div>

            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {embedUrl ? (
                <iframe
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full border-0"
                  key={`${activeSegment.segment_index}-${playbackRequest}`}
                  src={embedUrl}
                  title={`${content.title}, segment ${activeSegment.segment_index + 1}`}
                />
              ) : attempt.audio_url ? (
                <div className="flex size-full items-center justify-center p-5">
                  <audio
                    className="w-full"
                    controls
                    onTimeUpdate={(event) => {
                      if (event.currentTarget.currentTime * 1_000 >= activeSegment.end_time_ms) {
                        event.currentTarget.pause();
                      }
                    }}
                    ref={audioRef}
                    src={attempt.audio_url}
                  />
                </div>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-secondary-background">
                  <VideoOff aria-hidden="true" className="size-10" />
                  <p className="font-heading">Audio is unavailable for this attempt.</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                    Timestamp
                  </p>
                  <p className="mt-0.5 font-heading text-lg tabular-nums">
                    {formatDictationTimestamp(activeSegment.start_time_ms)}–
                    {formatDictationTimestamp(activeSegment.end_time_ms)}
                  </p>
                </div>
                <Button
                  className="min-h-10 font-heading text-xs"
                  onClick={handleReplay}
                  size="sm"
                  type="button"
                  variant="neutral"
                >
                  {playbackRequest > 0 ? (
                    <RotateCcw aria-hidden="true" />
                  ) : (
                    <Play aria-hidden="true" />
                  )}
                  Replay segment
                </Button>
              </div>
            </div>
          </section>

          {/* Review Segment Map */}
          <section className="rounded-base border-4 border-border bg-secondary-background p-5 shadow-shadow">
            <p className="text-xs font-heading tracking-wide uppercase text-foreground/60">
              Review map
            </p>
            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-6">
              {review.details.map((detail, reviewPosition) => {
                const isActive = reviewPosition === activeReviewPosition;
                const label = detail.is_correct
                  ? "correct"
                  : detail.user_answer.trim()
                    ? "incorrect"
                    : "unanswered";

                return (
                  <button
                    aria-label={`Review segment ${detail.segment_index + 1}, ${label}`}
                    aria-pressed={isActive}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-base border-2 border-border font-heading tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      detail.is_correct ? "bg-main text-main-foreground" : "bg-background",
                      isActive && "shadow-shadow",
                    )}
                    key={detail.segment_index}
                    onClick={() => {
                      setActiveReviewPosition(reviewPosition);
                      setPlaybackRequest(0);
                    }}
                    type="button"
                  >
                    {detail.segment_index + 1}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <div className="space-y-5 lg:col-span-7">
          <section className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border p-5 sm:p-6">
              <div>
                <p className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                  Answer review
                </p>
                <h3 className="mt-1 font-heading text-2xl">
                  Segment {activeReview.segment_index + 1}
                </h3>
              </div>
              <Badge
                className={cn(activeReview.is_correct && "bg-main text-main-foreground")}
                variant="neutral"
              >
                {activeReview.is_correct ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <XCircle aria-hidden="true" />
                )}
                {activeReview.is_correct ? "Correct" : isUnanswered ? "Unanswered" : "Needs review"}
              </Badge>
            </div>

            <dl className="space-y-6 bg-background p-5 sm:p-7">
              <div>
                <dt className="flex flex-wrap items-center justify-between gap-2 text-xs font-heading tracking-wide uppercase text-foreground/60">
                  <span>Your checked answer</span>
                  <span className="tabular-nums">
                    {formatDictationTimestamp(activeSegment.start_time_ms)}–
                    {formatDictationTimestamp(activeSegment.end_time_ms)}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "mt-2 min-h-20 whitespace-pre-wrap rounded-base border-2 border-border bg-secondary-background p-4 text-lg leading-relaxed",
                    isUnanswered && "text-foreground/55 italic",
                  )}
                  lang={isUnanswered ? undefined : "ja"}
                >
                  {isUnanswered ? "No checked answer was submitted." : activeReview.user_answer}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/60">
                  Correct transcript
                </dt>
                <dd
                  className="mt-2 rounded-base border-2 border-border bg-secondary-background p-4 font-heading text-lg leading-relaxed sm:text-xl"
                  lang="ja"
                >
                  {activeReview.correct_script}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3 border-t-2 border-border p-5 sm:p-6">
              <Button
                disabled={activeReviewPosition === 0}
                onClick={() => {
                  setActiveReviewPosition((position) => position - 1);
                  setPlaybackRequest(0);
                }}
                type="button"
                variant="neutral"
              >
                <ArrowLeft aria-hidden="true" />
                Previous
              </Button>
              <Button
                disabled={activeReviewPosition === review.details.length - 1}
                onClick={() => {
                  setActiveReviewPosition((position) => position + 1);
                  setPlaybackRequest(0);
                }}
                type="button"
                variant="neutral"
              >
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </section>

          <section className="rounded-base border-4 border-border bg-secondary-background p-5 shadow-shadow sm:p-6">
            <h3 className="font-heading text-lg">What next?</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">
              Start a fresh attempt to practice again, or return to the lesson catalog.
            </p>
            {startError ? (
              <Alert className="mt-4" variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Unable to start another attempt</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" disabled={isStarting} onClick={onTryAgain} type="button">
                {isStarting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" />
                )}
                {isStarting ? "Starting..." : "Try this lesson again"}
              </Button>
              <Button asChild className="flex-1" variant="neutral">
                <Link href="/lessons">
                  <BookOpenCheck aria-hidden="true" />
                  Back to lessons
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
