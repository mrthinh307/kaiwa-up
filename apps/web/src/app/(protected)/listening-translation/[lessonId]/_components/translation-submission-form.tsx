"use client";

import type { FormEventHandler } from "react";

import { AlertCircle, LoaderCircle, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MAX_TRANSLATION_LENGTH } from "../_hooks/use-translation-practice";

type TranslationSubmissionFormProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  isTranslationEmpty: boolean;
  onChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  translation: string;
  translationLength: number;
};

export function TranslationSubmissionForm({
  errorMessage,
  isSubmitting,
  isTranslationEmpty,
  onChange,
  onSubmit,
  translation,
  translationLength,
}: TranslationSubmissionFormProps) {
  return (
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle className="text-xl">Write your Vietnamese translation</CardTitle>
        <p className="text-sm leading-relaxed text-foreground/70">
          Focus on the meaning and intent. You do not need to translate word for word.
        </p>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit}>
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
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nhập bản dịch tiếng Việt của bạn…"
            required
            value={translation}
          />
          <div className="mt-2 flex items-start justify-between gap-4 text-xs">
            <p className="text-foreground/60" id="translation-help">
              Free text only. Your answer is graded by the backend AI evaluation.
            </p>
            <span className="shrink-0 tabular-nums text-foreground/60">
              {translationLength}/{MAX_TRANSLATION_LENGTH}
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
  );
}
