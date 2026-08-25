import { ArrowLeft, CalendarClock, CheckCircle2, ClockAlert, RotateCcw, Star } from "lucide-react";
import Link from "next/link";

import { AiRequestResult } from "@/components/common/ai-request/ai-request-result";
import { ExpRewardOverlay } from "@/components/common/exp-reward/exp-reward-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReflexEvaluation } from "../../_lib/reflex-api";

type ReflexResultProps = {
  onPracticeAgain: () => void;
  result: ReflexEvaluation;
};

export function ReflexResult({ onPracticeAgain, result }: ReflexResultProps) {
  const TimingIcon = result.is_on_time ? CheckCircle2 : ClockAlert;
  const reviewDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(result.next_review_at));

  return (
    <section aria-labelledby="reflex-result-title" className="grid gap-6">
      <ExpRewardOverlay expEarned={result.exp_earned} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5">
        <div>
          <p className="text-sm font-heading uppercase">Result</p>
          <h1 className="text-3xl font-heading" id="reflex-result-title">
            Reflex complete
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={result.is_on_time ? "bg-chart-4" : "bg-chart-3"}>
            <TimingIcon /> {result.is_on_time ? "On time" : "Late response"} ·{" "}
            {(result.response_start_ms / 1000).toFixed(1)}s
          </Badge>
          <Badge className="bg-chart-3">
            <Star /> +{result.exp_earned} EXP
          </Badge>
        </div>
      </div>

      <AiRequestResult
        result={{
          feedback: result.ai_feedback.naturalness_evaluation,
          score: result.ai_score,
          suggestion: result.ai_feedback.suggestions,
          transcript: result.ai_feedback.transcribed_text,
        }}
        title="Reflex evaluation"
      />

      <Card className="bg-secondary-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock /> Next review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-heading">In {result.next_review_days} days</p>
          <p className="mt-1 text-sm text-foreground/70">{reviewDate}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3 border-t-2 border-border pt-6">
        <Button asChild variant="neutral">
          <Link href="/reflex">
            <ArrowLeft /> Back to lessons
          </Link>
        </Button>
        <Button onClick={onPracticeAgain} type="button">
          <RotateCcw /> Practice again
        </Button>
      </div>
    </section>
  );
}
