"use client";

import { CheckCircle2, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { TranslationEvaluationViewModel } from "../../_lib/listening-translation-client";

type TranslationResultProps = {
  completion: TranslationEvaluationViewModel;
  isStoredCompletion: boolean;
  submittedTranslation: string;
};

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

export function TranslationResult({
  completion,
  isStoredCompletion,
  submittedTranslation,
}: TranslationResultProps) {
  return (
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
  );
}
