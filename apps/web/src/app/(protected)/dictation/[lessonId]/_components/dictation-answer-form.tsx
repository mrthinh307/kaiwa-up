"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Send, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DictationAnswerFormProps } from "../../_types/dictation-practice";

import { DictationPromptInputs } from "./dictation-prompt-inputs";

export function DictationAnswerForm({
  answers,
  isSubmitting,
  lesson,
  onAnswerChange,
  onSubmit,
  submitError,
}: DictationAnswerFormProps) {
  const answeredCount = lesson.blanks.filter((blank) => answers[blank.blankIndex]?.trim()).length;
  const areAllBlanksAnswered = answeredCount === lesson.blanks.length;
  const remainingBlankCount = lesson.blanks.length - answeredCount;

  return (
    <form className="space-y-6" noValidate onSubmit={onSubmit}>
      {submitError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Unable to check your answers</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-labelledby="dictation-answer-heading"
        className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow"
      >
        <div className="border-b-2 border-border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
              Rebuild the dialogue
            </p>
            <span className="flex items-center gap-1.5 rounded-base border-2 border-border bg-main px-2.5 py-1 text-xs font-heading text-main-foreground shadow-shadow">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {answeredCount}/{lesson.blanks.length} Completed
            </span>
          </div>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl" id="dictation-answer-heading">
            Complete every blank
          </h2>
          <p className="mt-1.5 text-sm text-foreground/70 leading-relaxed">
            Type directly into each numbered blank based on the video dialogue. Revise anytime
            before submitting.
          </p>
        </div>

        <div className="bg-background p-5 sm:p-7">
          <DictationPromptInputs
            answers={answers}
            isSubmitting={isSubmitting}
            lesson={lesson}
            onAnswerChange={onAnswerChange}
          />
        </div>

        <div className="border-t-2 border-border bg-secondary-background p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
                Your Progress
              </p>
              <p className="mt-1 font-heading text-lg">
                {answeredCount} of {lesson.blanks.length} blanks answered
              </p>
            </div>
            <div
              aria-label={`${answeredCount} of ${lesson.blanks.length} blanks answered`}
              className="flex w-full max-w-[220px] gap-1"
              role="progressbar"
              aria-valuemax={lesson.blanks.length}
              aria-valuemin={0}
              aria-valuenow={answeredCount}
            >
              {lesson.blanks.map((blank) => (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-3 flex-1 rounded-[2px] border-2 border-border bg-background transition-colors",
                    answers[blank.blankIndex]?.trim() && "bg-success",
                  )}
                  key={blank.blankIndex}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-base border-2 border-border bg-background p-4">
            <p className="flex items-center gap-2 text-xs font-heading tracking-wide text-foreground/65 uppercase">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Before you submit
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground/75 leading-relaxed">
              <li>Replay video timestamps around uncertain blanks to verify your answers.</li>
              <li>Pay close attention to long vowels (ー) and small kana (っ/ゃ/ゅ/ょ).</li>
              <li>Spacing and punctuation do not affect this score.</li>
            </ul>
          </div>

          <Button
            className="mt-5 min-h-12 w-full font-heading text-base shadow-shadow"
            disabled={isSubmitting || !areAllBlanksAnswered}
            size="lg"
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Checking answers...
              </>
            ) : (
              <>
                Check my answers
                <Send aria-hidden="true" />
              </>
            )}
          </Button>

          <p className="mt-2.5 text-center text-xs text-foreground/60 leading-relaxed">
            {areAllBlanksAnswered
              ? "All blanks filled! Click above to grade your attempt and see explanations."
              : `Complete ${remainingBlankCount} more ${remainingBlankCount === 1 ? "blank" : "blanks"} to submit.`}
          </p>
        </div>
      </section>
    </form>
  );
}
