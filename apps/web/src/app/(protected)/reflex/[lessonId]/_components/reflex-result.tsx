import {
  CalendarClock,
  CheckCircle2,
  ClockAlert,
  Lightbulb,
  MessageSquareText,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReflexEvaluation } from "../../_lib/reflex-api";

export function ReflexResult({ result }: { result: ReflexEvaluation }) {
  const TimingIcon = result.is_on_time ? CheckCircle2 : ClockAlert;
  const reviewDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(result.next_review_at));

  return (
    <section aria-labelledby="reflex-result-title" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5">
        <div>
          <p className="text-sm font-heading uppercase">Result</p>
          <h2 className="text-3xl font-heading" id="reflex-result-title">
            {Math.round(result.ai_score)} points
          </h2>
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText /> Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl leading-relaxed" lang="ja">
              {result.ai_feedback.transcribed_text}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{result.ai_feedback.naturalness_evaluation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb /> Suggestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{result.ai_feedback.suggestions}</p>
          </CardContent>
        </Card>
        <Card>
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
      </div>
    </section>
  );
}
