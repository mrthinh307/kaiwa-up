import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DueReview } from "../_lib/reflex-api";

type ReflexDueReviewsProps = {
  dueReviews: DueReview[];
};

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function ReflexDueReviews({ dueReviews }: ReflexDueReviewsProps) {
  return (
    <section aria-labelledby="due-reviews-title">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-heading" id="due-reviews-title">
          <CalendarClock aria-hidden="true" className="size-6" /> Due for review today
        </h2>
        <Badge variant={dueReviews.length > 0 ? "default" : "neutral"}>
          {dueReviews.length} {dueReviews.length === 1 ? "lesson" : "lessons"}
        </Badge>
      </div>

      {dueReviews.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-base border-2 border-border bg-secondary-background p-5 shadow-shadow sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-success/20 text-success shadow-[2px_2px_0px_0px_var(--border)]">
            <Sparkles aria-hidden="true" className="size-6" />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-heading sm:text-xl">All caught up for today!</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/75">
              You have no pending reflex reviews right now. Complete any of the lessons below to
              sharpen your speaking reflexes and automatically schedule your next spaced repetition
              session.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {dueReviews.map((review) => (
            <Card
              className="group border-2 bg-secondary-background transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
              key={review.lesson_id}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <Badge className="bg-chart-2 text-main-foreground">Due now</Badge>
                  <span className="text-xs font-heading text-foreground/65">
                    {formatDueDate(review.due_at)}
                  </span>
                </div>
                <CardTitle className="pt-2 text-lg leading-snug sm:text-xl">
                  {review.lesson_title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 pt-0">
                <div className="text-sm">
                  <span className="text-xs font-heading uppercase tracking-wider text-foreground/60">
                    Last score
                  </span>
                  <p className="text-lg font-heading">
                    {Math.round(review.last_score)}
                    <span className="text-xs font-base text-foreground/60"> / 100</span>
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link
                    aria-label={`Review ${review.lesson_title}`}
                    href={`/reflex/${review.lesson_id}`}
                  >
                    Review now
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
