"use client";

import type { TranslationLessonDetail } from "@kaiwa-app/api-client";
import type { FormEvent } from "react";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Languages,
  LoaderCircle,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPageHeader } from "@/components/common/protected-route/protected-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { parseApiFailure } from "@/lib/api-errors";

import type { TranslationEvaluationViewModel } from "../../_lib/listening-translation-client";

import {
  parseTranslationEvaluation,
  requestListeningTranslationLesson,
  requestTranslationSubmission,
} from "../../_lib/listening-translation-client";
import { TranslationAudioPlayer } from "./translation-audio-player";

type TranslationPracticeProps = {
  initialLesson: TranslationLessonDetail;
};

const MAX_TRANSLATION_LENGTH = 2_000;

function EvaluationList({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: string[];
  title: string;
}) {
  return (
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/75">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/65">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TranslationPractice({ initialLesson }: TranslationPracticeProps) {
  const { protectedRequest } = useAuth();
  const [completion, setCompletion] = useState<TranslationEvaluationViewModel | null>(null);
  const [detailSyncError, setDetailSyncError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStoredCompletion, setIsStoredCompletion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lesson, setLesson] = useState(initialLesson);
  const [submittedTranslation, setSubmittedTranslation] = useState("");
  const [translation, setTranslation] = useState("");
  const trimmedTranslation = translation.trim();
  const isTranslationEmpty = trimmedTranslation.length === 0;

  useEffect(() => {
    let isActive = true;

    void protectedRequest(() => requestListeningTranslationLesson(initialLesson.id))
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.data) {
          setLesson(result.data);
          setDetailSyncError(null);
          return;
        }

        setDetailSyncError(parseApiFailure(result).message);
      })
      .catch(() => {
        if (isActive) {
          setDetailSyncError("We could not refresh this lesson from your account.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [initialLesson.id, protectedRequest]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isTranslationEmpty || isSubmitting || completion) {
      if (isTranslationEmpty) {
        setErrorMessage("Enter a Vietnamese translation before submitting.");
      }
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    const wasAlreadyCompleted = lesson.is_completed;

    try {
      const result = await protectedRequest(() =>
        requestTranslationSubmission(lesson.id, trimmedTranslation),
      );

      if (!result.data) {
        setErrorMessage(parseApiFailure(result).message);
        return;
      }

      const parsedCompletion = parseTranslationEvaluation(result.data);
      if (!parsedCompletion) {
        setErrorMessage(
          "The evaluation request returned an unexpected response. Your translation is still available; check your progress before submitting it again.",
        );
        return;
      }

      setCompletion(parsedCompletion);
      setIsStoredCompletion(wasAlreadyCompleted);
      setLesson((currentLesson) => ({ ...currentLesson, is_completed: true }));
      setSubmittedTranslation(trimmedTranslation);
    } catch {
      setErrorMessage(
        "We could not reach the evaluation service. Your translation is still available so you can try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <section aria-labelledby="translation-result-heading" className="mt-10 space-y-6">
          <div className="overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="bg-background p-6 sm:p-8">
                <Badge className="gap-2" variant="neutral">
                  <CheckCircle2 aria-hidden="true" />
                  {completion.status}
                </Badge>
                <h2 className="mt-5 text-3xl sm:text-4xl" id="translation-result-heading">
                  {isStoredCompletion ? "Stored evaluation loaded." : "Translation submitted."}
                </h2>
                <p className="mt-3 max-w-[650px] leading-relaxed text-foreground/70">
                  {isStoredCompletion
                    ? "This lesson was already completed, so the backend returned the saved attempt without creating another attempt or EXP transaction."
                    : "The backend completed this attempt and recorded the AI evaluation. Your completion state and reward below come directly from that response."}
                </p>
              </div>

              <div className="grid grid-cols-2 border-t-2 border-border bg-main text-center text-main-foreground lg:border-t-0 lg:border-l-2">
                <div className="flex flex-col items-center justify-center border-r-2 border-border p-6">
                  <Sparkles aria-hidden="true" className="size-8" />
                  <p className="mt-3 text-xs font-heading tracking-wide uppercase">AI score</p>
                  <p className="mt-1 text-4xl font-heading tabular-nums">{completion.score}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-6">
                  <Trophy aria-hidden="true" className="size-8" />
                  <p className="mt-3 text-xs font-heading tracking-wide uppercase">EXP recorded</p>
                  <p className="mt-1 text-4xl font-heading tabular-nums">+{completion.expEarned}</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-secondary-background">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles aria-hidden="true" />
                  AI evaluation
                </CardTitle>
                <Badge variant={completion.isAcceptable ? "default" : "neutral"}>
                  {completion.isAcceptable ? "Meaning accepted" : "Needs revision"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-foreground/75">{completion.feedback}</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="text-xl">
                  {isStoredCompletion
                    ? "Text entered to load the result"
                    : "Your Vietnamese translation"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="min-h-32 whitespace-pre-wrap rounded-base border-2 border-border bg-background p-4 leading-relaxed">
                  {submittedTranslation}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="text-xl">Reference translation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="min-h-32 whitespace-pre-wrap rounded-base border-2 border-border bg-background p-4 leading-relaxed">
                  {completion.referenceTranslationVi}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <EvaluationList
              emptyMessage="No covered ideas were returned."
              items={completion.coveredIdeas}
              title="Covered ideas"
            />
            <EvaluationList
              emptyMessage="No important ideas were missing."
              items={completion.missingIdeas}
              title="Missing ideas"
            />
            <EvaluationList
              emptyMessage="No additional suggestions were needed."
              items={completion.suggestions}
              title="Suggestions"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/listening-translation">Choose another lesson</Link>
            </Button>
            <Button asChild variant="neutral">
              <Link href="/dashboard">View progress</Link>
            </Button>
          </div>
        </section>
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

            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="text-xl">Write your Vietnamese translation</CardTitle>
                <p className="text-sm leading-relaxed text-foreground/70">
                  Focus on the meaning and intent. You do not need to translate word for word.
                </p>
              </CardHeader>
              <CardContent>
                <form noValidate onSubmit={handleSubmit}>
                  <Label htmlFor="translation-vi">Vietnamese translation</Label>
                  <Textarea
                    aria-describedby={errorMessage ? "translation-error" : "translation-help"}
                    aria-invalid={Boolean(errorMessage)}
                    className="mt-2 min-h-52 resize-y text-base leading-relaxed"
                    disabled={isSubmitting}
                    id="translation-vi"
                    lang="vi"
                    maxLength={MAX_TRANSLATION_LENGTH}
                    name="translation_vi"
                    onChange={(event) => {
                      setTranslation(event.target.value);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="Nhập bản dịch tiếng Việt của bạn…"
                    required
                    value={translation}
                  />
                  <div className="mt-2 flex items-start justify-between gap-4 text-xs">
                    <p className="text-foreground/60" id="translation-help">
                      Free text only. Your answer is graded by the backend AI evaluation.
                    </p>
                    <span className="shrink-0 tabular-nums text-foreground/60">
                      {translation.length}/{MAX_TRANSLATION_LENGTH}
                    </span>
                  </div>

                  {errorMessage ? (
                    <Alert className="mt-4" id="translation-error" variant="destructive">
                      <AlertCircle aria-hidden="true" />
                      <AlertTitle>Translation not submitted</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  {isSubmitting ? (
                    <Alert aria-live="polite" className="mt-4">
                      <LoaderCircle aria-hidden="true" className="animate-spin" />
                      <AlertTitle>AI is evaluating your translation</AlertTitle>
                      <AlertDescription>
                        Keep this page open. Your text will remain in the form if the request fails.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    className="mt-5 w-full"
                    disabled={isTranslationEmpty || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    {isSubmitting ? "Evaluating…" : "Submit translation"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
