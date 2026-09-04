"use client";

import type { ShadowingContentDetail, ShadowingResumeResponse } from "@kaiwa-app/api-client";

import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock3,
  History,
  Info,
  Layers3,
  ListOrdered,
  LoaderCircle,
  PlayCircle,
  Radio,
  RotateCcw,
  Tag,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PracticeMethodGuide } from "@/components/common/practice-catalog/practice-method-guide";
import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SHADOWING_STEPS } from "../_constants/shadowing-constants";
import { formatShadowingDuration, getYouTubeVideoId } from "../_utils/shadowing-formatters";

type ShadowingStartPanelProps = {
  inProgressAttempt: ShadowingResumeResponse | null;
  isRestoring: boolean;
  isStarting: boolean;
  lesson: ShadowingContentDetail;
  onRestore: () => void;
  onResume: () => void;
  onStart: (mode: "segmented" | "continuous") => void;
  restoreError?: string;
  startError?: string;
  totalAttempts: number;
};

export function ShadowingStartPanel({
  inProgressAttempt,
  isRestoring,
  isStarting,
  lesson,
  onRestore,
  onResume,
  onStart,
  restoreError,
  startError,
  totalAttempts,
}: ShadowingStartPanelProps) {
  const [userSelectedMode, setUserSelectedMode] = useState<"segmented" | "continuous" | null>(null);

  const selectedMode = inProgressAttempt
    ? inProgressAttempt.mode === "continuous"
      ? "continuous"
      : "segmented"
    : (userSelectedMode ?? "segmented");

  const youtubeVideoId = useMemo(
    () => (lesson.audio_url ? getYouTubeVideoId(lesson.audio_url) : undefined),
    [lesson.audio_url],
  );

  const previewEmbedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&playsinline=1`
    : undefined;

  const segmentCount = lesson.transcript?.length ?? 0;

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
                <dd className="mt-1 font-heading text-lg">Shadowing</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/55">
                  Segments
                </dt>
                <dd className="mt-1 font-heading text-lg">{segmentCount}</dd>
              </div>
              <div className="border-l-2 border-border p-3 text-center sm:p-4">
                <dt className="text-xs font-heading tracking-wide uppercase text-foreground/55">
                  Duration
                </dt>
                <dd className="mt-1 font-heading text-lg">
                  {formatShadowingDuration(lesson.duration_seconds ?? 0)}
                </dd>
              </div>
            </dl>
          }
          className="mt-6"
          description={
            lesson.description ??
            "Practice Japanese listening and speaking reflexes with dual audio shadowing and self-comparison."
          }
          eyebrow="Shadowing Practice"
          title={lesson.title}
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {lesson.topic ? (
            <Badge className="gap-2" variant="neutral">
              <Tag aria-hidden="true" />
              {lesson.topic}
            </Badge>
          ) : null}
          <Badge className="gap-2" variant="neutral">
            <Layers3 aria-hidden="true" />
            JLPT {lesson.difficulty}
          </Badge>
          <Badge className="gap-2" variant="neutral">
            <Clock3 aria-hidden="true" />
            Synchronized speech practice
          </Badge>
          {totalAttempts > 0 && (
            <Badge className="gap-2" variant="neutral">
              <History aria-hidden="true" />
              {totalAttempts} {totalAttempts === 1 ? "attempt" : "attempts"}
            </Badge>
          )}
          {inProgressAttempt && (
            <Badge className="gap-1.5 bg-chart-3 font-heading">
              In progress ({inProgressAttempt.mode === "continuous" ? "Continuous" : "Segmented"} #
              {inProgressAttempt.attempt_number})
            </Badge>
          )}
        </div>
      </div>

      {/* Collapsible How Shadowing Works Guide */}
      <div className="mb-6">
        <PracticeMethodGuide
          heading="How Shadowing works"
          headingId="shadowing-method-heading"
          iconName="mic"
          steps={SHADOWING_STEPS}
          summary="Listen to native Japanese speech, shadow simultaneously with your voice, and self-compare."
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Video Preview */}
        <section
          aria-labelledby="shadowing-preview-heading"
          className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
            <div className="flex items-center gap-2">
              <Video aria-hidden="true" className="size-5" />
              <h2
                className="text-sm font-heading tracking-wide uppercase"
                id="shadowing-preview-heading"
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
                title={`Preview: ${lesson.title}`}
              />
            ) : lesson.audio_url ? (
              <div className="flex size-full items-center justify-center p-5">
                <audio className="w-full" controls src={lesson.audio_url} />
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
              You can watch or listen to the full lesson preview before starting.
            </p>
          </div>
        </section>

        {/* Right Column: Mode Selection & Practice Actions */}
        <section
          aria-labelledby="shadowing-actions-heading"
          className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow lg:col-span-5"
        >
          <div className="border-b-2 border-border bg-background p-5 sm:p-6">
            <Badge className="gap-2 bg-main text-main-foreground shadow-shadow">
              {inProgressAttempt ? "Resume practice" : "Ready to practice"}
            </Badge>
            <h2 className="mt-3 font-heading text-2xl" id="shadowing-actions-heading">
              Shadowing Practice
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/70 sm:text-sm">
              Select your practice mode to train Japanese speech rhythm, pitch accent, and reflexes.
            </p>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Bookmark aria-hidden="true" className="size-3.5" />
                  JLPT
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">{lesson.difficulty}</dd>
              </div>
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Layers3 aria-hidden="true" className="size-3.5" />
                  Segments
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">{segmentCount}</dd>
              </div>
              <div className="rounded-base border-2 border-border bg-background p-3 text-center sm:p-3.5">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-heading tracking-wide uppercase text-foreground/60 sm:text-xs">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  Duration
                </dt>
                <dd className="mt-1 font-heading text-xl sm:text-2xl">
                  {formatShadowingDuration(lesson.duration_seconds ?? 0)}
                </dd>
              </div>
            </dl>

            {inProgressAttempt ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-heading uppercase tracking-wide text-foreground/70">
                  Practice Mode
                </p>
                <div className="rounded-base border-2 border-border bg-background p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-heading text-sm text-foreground">
                      {inProgressAttempt.mode === "continuous" ? (
                        <Radio aria-hidden="true" className="size-4 text-foreground" />
                      ) : (
                        <ListOrdered aria-hidden="true" className="size-4 text-foreground" />
                      )}
                      <span>
                        {inProgressAttempt.mode === "continuous"
                          ? "Continuous Shadowing"
                          : "Segment by Segment"}
                      </span>
                    </div>
                    <Badge className="text-xs font-heading" variant="neutral">
                      Attempt #{inProgressAttempt.attempt_number}
                    </Badge>
                  </div>

                  <div className="mt-3 border-t border-border/40 pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading text-foreground/70">Saved progress:</span>
                      <span className="font-heading text-foreground">
                        {inProgressAttempt.mode === "continuous"
                          ? inProgressAttempt.continuous_recording
                            ? "Continuous audio recorded"
                            : "Session started"
                          : `${inProgressAttempt.recorded_segments?.length ?? 0} of ${segmentCount} segments recorded`}
                      </span>
                    </div>

                    {inProgressAttempt.mode === "segmented" && segmentCount > 0 && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-border/60 bg-secondary-background">
                        <div
                          className="h-full bg-foreground transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((inProgressAttempt.recorded_segments?.length ?? 0) /
                                  segmentCount) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-heading uppercase tracking-wide text-foreground/70">
                  Choose Practice Mode
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Segment-by-segment option */}
                  <button
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-base border-2 border-border transition-all",
                      selectedMode === "segmented"
                        ? "bg-main/15 border-main shadow-shadow ring-2 ring-main/20"
                        : "bg-background hover:bg-secondary-background",
                    )}
                    onClick={() => setUserSelectedMode("segmented")}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-heading text-sm">
                        <ListOrdered className="size-4 text-main" />
                        <span>Segment by Segment</span>
                      </div>
                      {selectedMode === "segmented" && (
                        <CheckCircle2 className="size-4 text-main fill-main/20" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-foreground/75 leading-relaxed">
                      Audio pauses at each boundary. Record and self-compare prompt by prompt.
                    </p>
                  </button>

                  {/* Continuous option */}
                  <button
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-base border-2 border-border transition-all",
                      selectedMode === "continuous"
                        ? "bg-main/15 border-main shadow-shadow ring-2 ring-main/20"
                        : "bg-background hover:bg-secondary-background",
                    )}
                    onClick={() => setUserSelectedMode("continuous")}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-heading text-sm">
                        <Radio className="size-4 text-chart-3" />
                        <span>Continuous Shadowing</span>
                      </div>
                      {selectedMode === "continuous" && (
                        <CheckCircle2 className="size-4 text-main fill-main/20" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-foreground/75 leading-relaxed">
                      Play the full material without interruptions. Record one complete voice take.
                    </p>
                  </button>
                </div>
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
                <AlertTitle>Unable to check saved attempt</AlertTitle>
                <AlertDescription>{restoreError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
            {restoreError ? (
              <Button
                className="min-h-12 w-full font-heading text-base"
                disabled={isRestoring || isStarting}
                onClick={onRestore}
                size="lg"
                type="button"
              >
                <RotateCcw aria-hidden="true" />
                Try checking again
              </Button>
            ) : inProgressAttempt ? (
              <Button
                className="min-h-12 w-full font-heading text-base"
                disabled={isRestoring || isStarting}
                onClick={onResume}
                size="lg"
                type="button"
              >
                {isRestoring ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Loading attempt...
                  </>
                ) : (
                  <>
                    <RotateCcw aria-hidden="true" />
                    Resume Attempt (
                    {inProgressAttempt.mode === "continuous" ? "Continuous" : "Segmented"})
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="min-h-12 w-full font-heading text-base"
                disabled={isRestoring || isStarting || segmentCount === 0}
                onClick={() => onStart(selectedMode)}
                size="lg"
                type="button"
              >
                {isRestoring ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Checking attempt...
                  </>
                ) : isStarting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle aria-hidden="true" />
                    Start {selectedMode === "continuous" ? "Continuous" : "Segmented"} Attempt
                  </>
                )}
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
