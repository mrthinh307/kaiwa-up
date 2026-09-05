"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { AlertCircle, Lightbulb, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShadowingAiFeedback = NonNullable<ShadowingAttemptReviewResponse["ai_feedback"]>;

type ShadowingAiFeedbackCardProps = {
  feedback: ShadowingAiFeedback;
};

export function ShadowingAiFeedbackCard({ feedback }: ShadowingAiFeedbackCardProps) {
  return (
    <Card className="border-2 border-border bg-secondary-background shadow-shadow">
      <CardHeader className="border-b border-border/40 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Sparkles className="size-5 text-main" />
            <span>AI Learning Feedback</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {feedback.similarity_score !== null && feedback.similarity_score !== undefined && (
              <Badge className="bg-main text-xs font-heading text-main-foreground">
                AI Similarity: {Number(feedback.similarity_score).toFixed(0)}%
              </Badge>
            )}
            <Badge className="text-xs font-heading" variant="neutral">
              Informational
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-foreground/60">
          This AI evaluation is provided solely for your learning reference and does not affect your
          lesson score or EXP.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {feedback.feedback && (
          <div className="space-y-1">
            <p className="text-xs font-heading uppercase text-foreground/70">Overall Assessment</p>
            <p className="rounded-base border border-border/70 bg-background/80 p-3 text-sm leading-relaxed text-foreground">
              {feedback.feedback}
            </p>
          </div>
        )}

        {feedback.corrections && feedback.corrections.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1 text-xs font-heading uppercase text-foreground/70">
              <AlertCircle className="size-3.5 text-chart-4" />
              Pronunciation & Word Corrections
            </p>
            <div className="space-y-2">
              {feedback.corrections.map((correction, correctionIndex) => (
                <div
                  className="space-y-1 rounded-base border border-border/80 bg-background p-3 text-xs"
                  key={correctionIndex}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-heading text-destructive line-through">
                      {correction.original}
                    </span>
                    <span className="text-foreground/60">→</span>
                    <span className="rounded bg-success/10 px-1.5 py-0.5 font-heading text-success">
                      {correction.corrected}
                    </span>
                  </div>
                  {correction.reason && (
                    <p className="text-[11px] text-foreground/75">{correction.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback.hints && feedback.hints.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-xs font-heading uppercase text-foreground/70">
              <Lightbulb className="size-3.5 text-chart-3" />
              Actionable Improvement Tips
            </p>
            <ul className="list-inside list-disc space-y-1 rounded-base border border-border/60 bg-background/60 p-3 text-xs text-foreground/80">
              {feedback.hints.map((hint, hintIndex) => (
                <li key={hintIndex}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
