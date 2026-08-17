import { Lightbulb, MessageSquareText, ScrollText, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AiRequestResult as AiRequestResultData } from "./ai-request-state";

type AiRequestResultProps = {
  result: AiRequestResultData;
  title?: string;
};

const RESULT_SECTIONS = [
  { icon: ScrollText, key: "transcript", label: "Transcript" },
  { icon: MessageSquareText, key: "feedback", label: "Feedback" },
  { icon: Lightbulb, key: "suggestion", label: "Suggestion" },
] as const;

export function AiRequestResult({ result, title = "AI feedback" }: AiRequestResultProps) {
  const score = getDisplayScore(result.score);
  const sections = RESULT_SECTIONS.flatMap(({ icon, key, label }) => {
    const content = getDisplayText(result[key]);

    return content === null ? [] : [{ content, icon, key, label }];
  });

  return (
    <Card aria-live="polite" className="bg-secondary-background" data-ai-request-status="success">
      <CardHeader className="border-b-2 border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles aria-hidden="true" className="size-5" />
            {title}
          </CardTitle>
          {score !== null && (
            <p
              aria-label={`Score: ${score} out of 100`}
              className="min-w-20 rounded-base border-2 border-border bg-main px-3 py-2 text-center text-lg font-heading text-main-foreground"
            >
              {score}/100
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sections.length > 0 ? (
          <dl className="grid gap-5">
            {sections.map(({ content, icon: Icon, key, label }) => (
              <div className="grid gap-2" key={key}>
                <dt className="flex items-center gap-2 text-sm font-heading">
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </dt>
                <dd className="whitespace-pre-wrap break-words leading-relaxed text-foreground/80">
                  {content}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/70">
            The request completed without additional written feedback.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getDisplayScore(score: number | null | undefined): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function getDisplayText(value: string | null | undefined): string | null {
  const text = value?.trim();

  return text ? text : null;
}
