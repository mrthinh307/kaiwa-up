"use client";

import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Clock3,
  History,
  Info,
  Layers3,
  LoaderCircle,
  PlayCircle,
  RotateCcw,
  Tag,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { PracticeMethodGuide } from "@/components/common/practice-catalog/practice-method-guide";
import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { DictationStartPanelProps } from "../_types/dictation-practice";

import { DICTATION_STEPS } from "../_constants/dictation-constants";
import { formatDictationDuration, getYouTubeVideoId } from "../_utils/dictation-formatters";

export function DictationStartPanel({
  content,
  inProgressAttempt,
  isRestoring,
  isStarting,
  onRestore,
  onResume,
  onStart,
  restoreError,
  startError,
  totalAttempts = 0,
}: DictationStartPanelProps) {
  const youtubeVideoId = useMemo(
    () => (content.audio_url ? getYouTubeVideoId(content.audio_url) : undefined),
    [content.audio_url],
  );

  const previewEmbedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&playsinline=1`
    : undefined;

  return (
    <>
      {/* Start Screen Header & Metadata */}
      <div className="mb-6">
        <Button asChild size="sm" variant="neutral">
          <Link href="/lessons">
            <ArrowLeft aria-hidden="true" />
            Back to lessons
          </Link>
        </Button>

        <ProtectedPageHeader
          aside={
            <dl className="grid grid-cols-3 overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow lg:min-w-[420px]">
              <div className="p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/55">
                  Practice
                </dt>
                <dd className="mt-1 font-heading text-lg">Dictation</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/55">
                  Segments
                </dt>
                <dd className="mt-1 font-heading text-lg">{content.prompts.length}</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/55">
                  Duration
                </dt>
                <dd className="mt-1 font-heading text-lg">
                  {formatDictationDuration(content.duration_seconds ?? 0)}
                </dd>
              </div>
            </dl>
          }
          className="mt-6"
          description={content.description ?? "Practice Japanese listening one segment at a time."}
          eyebrow="Dictation Practice"
          title={content.title}
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {content.topic ? (
            <Badge className="gap-2" variant="neutral">
              <Tag aria-hidden="true" />
              {content.topic}
            </Badge>
          ) : null}
          <Badge className="gap-2" variant="neutral">
            <Layers3 aria-hidden="true" />
            JLPT {content.difficulty}
          </Badge>
          <Badge className="gap-2" variant="neutral">
            <Clock3 aria-hidden="true" />
            Timestamped sentence practice
          </Badge>
          {totalAttempts > 0 && (
            <Badge className="gap-2" variant="neutral">
              <History aria-hidden="true" />
              {totalAttempts} {totalAttempts === 1 ? "attempt" : "attempts"}
            </Badge>
          )}
          {inProgressAttempt && (
            <Badge className="gap-1.5 bg-chart-3 font-heading">
              In progress (Segmented #{inProgressAttempt.attempt_number})
            </Badge>
          )}
        </div>
      </div>

      {/* Collapsible How Dictation Works Guide */}
      <div className="mb-6">
        <PracticeMethodGuide
          heading="How Dictation works"
          headingId="dictation-method-heading"
          iconName="headphones"
          steps={DICTATION_STEPS}
          summary="Practice Japanese listening and typing one timestamped segment at a time."
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Video Preview */}
        <section
          aria-labelledby="dictation-preview-heading"
          className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
            <div className="flex items-center gap-2">
              <Video aria-hidden="true" className="size-5" />
              <h2
                className="text-sm font-heading tracking-wide uppercase"
                id="dictation-preview-heading"
              >
                Video Preview
              </h2>
            </div>
            <Badge className="bg-secondary-background text-foreground" variant="neutral">
              Full Material
            </Badge>
          </div>

          <div className="relative aspect-video w-full bg-black">
            {previewEmbedUrl ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 size-full border-0"
                src={previewEmbedUrl}
                title={`Preview: ${content.title}`}
              />
            ) : content.audio_url ? (
              <div className="flex size-full items-center justify-center p-5">
                <audio className="w-full" controls src={content.audio_url} />
              </div>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-secondary-background">
                <VideoOff aria-hidden="true" className="size-10" />
                <p className="font-heading">Video material is currently unavailable.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t-2 border-border/30 p-4 text-xs text-foreground/70 sm:p-5 sm:text-sm">
            <Info aria-hidden="true" className="size-4 shrink-0 text-foreground/60" />
            <p className="leading-relaxed">
              You can watch or listen to the full lesson preview before you start.
            </p>
          </div>
        </section>

        {/* Right Column: Practice Overview & Actions */}
        <section
          aria-labelledby="dictation-actions-heading"
          className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow lg:col-span-5"
        >
          <div className="border-b-2 border-border bg-background p-5 sm:p-6">
            <Badge className="gap-2 bg-main text-main-foreground shadow-shadow">
              {inProgressAttempt ? "Resume practice" : "Ready to practice"}
            </Badge>
            <h2 className="mt-3 font-heading text-2xl" id="dictation-actions-heading">
              Dictation Practice
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/70 sm:text-sm">
              Listen to each timestamped segment and write the complete Japanese sentence you hear.
            </p>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Bookmark aria-hidden="true" className="size-3.5" />
                  JLPT
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">{content.difficulty}</dd>
              </div>
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Layers3 aria-hidden="true" className="size-3.5" />
                  Segments
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">{content.prompts.length}</dd>
              </div>
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  Duration
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">
                  {formatDictationDuration(content.duration_seconds ?? 0)}
                </dd>
              </div>
            </dl>

            {inProgressAttempt && (
              <div className="rounded-base border-2 border-border bg-background p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading text-foreground/70">Saved progress:</span>
                  <span className="font-heading text-foreground">
                    {inProgressAttempt.checked_segments?.length ?? 0} of {content.prompts.length}{" "}
                    segments answered
                  </span>
                </div>
                {content.prompts.length > 0 && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-border/60 bg-secondary-background">
                    <div
                      className="h-full bg-foreground transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((inProgressAttempt.checked_segments?.length ?? 0) /
                              content.prompts.length) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {startError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Unable to start attempt</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </Alert>
            ) : null}
            {restoreError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Unable to restore saved attempt</AlertTitle>
                <AlertDescription>{restoreError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
            <Button
              className="min-h-12 w-full font-heading text-base"
              disabled={isRestoring || isStarting || content.prompts.length === 0}
              onClick={restoreError ? onRestore : inProgressAttempt ? onResume : onStart}
              size="lg"
              type="button"
            >
              {isRestoring ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Checking saved attempt...
                </>
              ) : isStarting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Creating attempt...
                </>
              ) : restoreError ? (
                <>
                  <RotateCcw aria-hidden="true" />
                  Try restoring again
                </>
              ) : inProgressAttempt ? (
                <>
                  <RotateCcw aria-hidden="true" />
                  Resume Dictation Attempt
                </>
              ) : (
                <>
                  <PlayCircle aria-hidden="true" />
                  Start Dictation Attempt
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
