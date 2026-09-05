"use client";

import type { TranslationLessonDetail } from "@kaiwa-app/api-client";

import { AlertCircle, ArrowLeft, CheckCircle2, Languages } from "lucide-react";
import Link from "next/link";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useTranslationPractice } from "../_hooks/use-translation-practice";
import { TranslationAudioPlayer } from "./translation-audio-player";
import { TranslationResult } from "./translation-result";
import { TranslationSubmissionForm } from "./translation-submission-form";

type TranslationPracticeProps = {
  initialLesson: TranslationLessonDetail;
};

export function TranslationPractice({ initialLesson }: TranslationPracticeProps) {
  const {
    completion,
    detailSyncError,
    errorMessage,
    handleSubmit,
    handleTranslationChange,
    isStoredCompletion,
    isSubmitting,
    isTranslationEmpty,
    lesson,
    submittedTranslation,
    translation,
    translationLength,
  } = useTranslationPractice(initialLesson);

  return (
    <div>
      <Button asChild size="sm" variant="neutral">
        <Link href="/listening-translation">
          <ArrowLeft aria-hidden="true" />
          Back to lessons
        </Link>
      </Button>

      <ProtectedPageHeader
        aside={
          <div className="flex flex-wrap gap-2 lg:max-w-72 lg:justify-end">
            <Badge variant="neutral">JLPT {lesson.difficulty}</Badge>
            {lesson.is_completed ? (
              <Badge className="gap-1.5" variant="neutral">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Completed
              </Badge>
            ) : null}
            <Badge className="gap-2" variant="neutral">
              <Languages aria-hidden="true" />
              Free-text translation
            </Badge>
          </div>
        }
        className="mt-7"
        description={
          lesson.description ??
          "Listen carefully and translate the meaning into natural Vietnamese. AI evaluates semantic coverage, not exact word matching."
        }
        eyebrow="Listening & Translation"
        title={lesson.title}
      />

      {detailSyncError ? (
        <Alert className="mt-6" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Account progress unavailable</AlertTitle>
          <AlertDescription>
            {detailSyncError} The lesson audio and submission form remain available.
          </AlertDescription>
        </Alert>
      ) : null}

      {completion ? (
        <TranslationResult
          completion={completion}
          isStoredCompletion={isStoredCompletion}
          submittedTranslation={submittedTranslation}
        />
      ) : (
        <div className="mt-10 space-y-6">
          {lesson.is_completed ? (
            <Alert>
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>This lesson is already completed</AlertTitle>
              <AlertDescription>
                Submitting again loads the stored evaluation. The backend will not create another
                attempt or award EXP again.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <Card className="bg-secondary-background">
              <CardContent>
                <TranslationAudioPlayer
                  audioUrl={lesson.audio_url}
                  key={lesson.id}
                  lessonTitle={lesson.title}
                />
              </CardContent>
            </Card>

            <TranslationSubmissionForm
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
              isTranslationEmpty={isTranslationEmpty}
              onChange={handleTranslationChange}
              onSubmit={handleSubmit}
              translation={translation}
              translationLength={translationLength}
            />
          </div>
        </div>
      )}
    </div>
  );
}
