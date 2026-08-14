"use client";

import { ArrowRight, RotateCcw, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DictationResultProps } from "../../_types/dictation-practice";

import { DictationVideoPlayer } from "./dictation-video-player";
import { ExpectedTranscript } from "./expected-transcript";

export function DictationResult({ lesson, onTryAgain, result }: DictationResultProps) {
  return (
    <section aria-labelledby="dictation-result-heading" className="space-y-8">
      <ExpRewardOverlay expEarned={result.expEarned} key={result.attemptId} />

      <div
        className={cn(
          "overflow-hidden rounded-base border-4 border-border shadow-shadow",
          result.isPassed ? "bg-success" : "bg-chart-3",
        )}
      >
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(400px,0.8fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <Badge className="gap-2 bg-secondary-background text-foreground shadow-shadow">
              {result.isPassed ? <Trophy aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              Attempt complete
            </Badge>
            <h2
              className="mt-6 font-heading text-3xl leading-tight sm:text-4xl"
              id="dictation-result-heading"
            >
              {result.isPassed
                ? "Great listening — you passed!"
                : "Good effort — review and retry."}
            </h2>
            <p className="mt-4 max-w-[620px] text-main-foreground/75 leading-relaxed sm:text-lg">
              {result.isPassed
                ? "You caught the key details. Check the expected transcript below to verify your phrasing."
                : "Compare your answers with the expected transcript below, then give the video another listen."}
            </p>
          </div>

          <dl className="grid grid-cols-3 border-t-4 border-border bg-secondary-background text-foreground lg:border-t-0 lg:border-l-4">
            <div className="flex flex-col justify-center p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Correct
              </dt>
              <dd className="mt-2 font-heading text-2xl sm:text-3xl">
                {result.correctCount}/{result.totalQuestions}
              </dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Score
              </dt>
              <dd className="mt-2 font-heading text-2xl sm:text-3xl">{result.scorePercentage}%</dd>
            </div>
            <div className="flex flex-col justify-center border-l-2 border-border p-4 text-center sm:p-6">
              <dt className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                EXP
              </dt>
              <dd className="mt-2 font-heading text-2xl sm:text-3xl">+{result.expEarned}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Video Player */}
        <div className="lg:sticky lg:top-24 lg:col-span-5 lg:z-20">
          <DictationVideoPlayer lessonTitle={lesson.title} youtubeVideoId={lesson.youtubeVideoId} />
        </div>

        {/* Right Column: Expected Transcript & Next Action Buttons */}
        <div className="space-y-6 lg:col-span-7">
          <section className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
            <div className="border-b-2 border-border p-5 sm:p-6">
              <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Answer Review
              </p>
              <h3 className="mt-1 font-heading text-2xl">Expected Transcript</h3>
              <p className="mt-1.5 text-xs text-foreground/70 leading-relaxed">
                Check every blank answer in full context with colored indicator tags below.
              </p>
            </div>

            <div className="bg-background p-5 sm:p-7">
              <ExpectedTranscript lesson={lesson} result={result} />
            </div>

            {result.translation ? (
              <div className="border-t-2 border-border bg-secondary-background p-5 sm:p-6">
                <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                  Meaning / Translation
                </p>
                <p className="mt-2 text-sm text-foreground/85 leading-relaxed sm:text-base">
                  {result.translation}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-base border-4 border-border bg-secondary-background p-5 shadow-shadow sm:p-6">
            <h3 className="font-heading text-lg">What next?</h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={onTryAgain} type="button">
                <RotateCcw aria-hidden="true" />
                Try this lesson again
              </Button>
              {lesson.nextLessonId ? (
                <Button asChild className="flex-1" variant="neutral">
                  <Link href={`/dictation/${encodeURIComponent(lesson.nextLessonId)}`}>
                    Next lesson
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
