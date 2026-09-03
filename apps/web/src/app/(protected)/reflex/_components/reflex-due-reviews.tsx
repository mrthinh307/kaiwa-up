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
  const hasDueReviews = dueReviews.length > 0;

  return (
    <Card
      className={
        hasDueReviews
          ? "border-2 border-chart-2 bg-secondary-background"
          : "border-2 bg-secondary-background"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center gap-2 text-lg ${hasDueReviews ? "text-chart-2" : ""}`}
          >
            <CalendarClock aria-hidden="true" className="size-5" /> Due for review
          </CardTitle>
          <Badge
            className={hasDueReviews ? "bg-chart-2 text-main-foreground" : ""}
            variant={hasDueReviews ? "default" : "neutral"}
          >
            {dueReviews.length} due
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {!hasDueReviews ? (
          <div className="flex items-start gap-3 rounded-base border border-border bg-background p-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-success/20 text-success">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-xs font-heading">All caught up for today!</p>
              <p className="mt-0.5 text-xs text-foreground/70 leading-relaxed">
                No reviews due right now. Complete lessons on the left to schedule spaced reviews.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dueReviews.map((review) => (
              <div
                className="flex flex-col justify-between gap-2.5 rounded-base border border-border bg-background p-3"
                key={review.lesson_id}
              >
                <div>
                  <p className="line-clamp-1 text-sm font-heading">{review.lesson_title}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-foreground/65">
                    <span>
                      Score: <strong>{Math.round(review.last_score)}/100</strong>
                    </span>
                    <span>{formatDueDate(review.due_at)}</span>
                  </div>
                </div>
                <Button asChild className="h-8 w-full text-xs" size="sm">
                  <Link
                    aria-label={`Review ${review.lesson_title}`}
                    href={`/reflex/${review.lesson_id}`}
                  >
                    Review now
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
