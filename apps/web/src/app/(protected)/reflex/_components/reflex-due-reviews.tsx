"use client";

import { ArrowRight, CalendarClock, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { DueReview } from "../_lib/reflex-api";

type ReflexDueReviewsProps = {
  className?: string;
  defaultOpen?: boolean;
  dueReviews: DueReview[];
};

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function ReflexDueReviews({
  className,
  defaultOpen = false,
  dueReviews,
}: ReflexDueReviewsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasDueReviews = dueReviews.length > 0;

  return (
    <Collapsible
      className={cn(
        "group rounded-base border-2 border-border bg-secondary-background shadow-shadow transition-colors",
        hasDueReviews && "border-chart-2/80",
        className,
      )}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <section aria-labelledby="due-reviews-heading">
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-base border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]",
                hasDueReviews ? "bg-chart-2 text-main-foreground" : "bg-main text-main-foreground",
              )}
            >
              <CalendarClock aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base sm:text-lg" id="due-reviews-heading">
                  Due for review today
                </h3>
                <Badge
                  className={hasDueReviews ? "bg-chart-2 text-main-foreground" : ""}
                  variant={hasDueReviews ? "default" : "neutral"}
                >
                  {dueReviews.length} due
                </Badge>
              </div>
              <p className="text-xs text-foreground/65 sm:text-sm">
                {hasDueReviews
                  ? `${dueReviews.length} ${dueReviews.length === 1 ? "lesson needs" : "lessons need"} spaced repetition review.`
                  : "All caught up for today. No pending spaced repetition reviews."}
              </p>
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button
              className="w-full shrink-0 gap-1.5 sm:w-auto"
              size="sm"
              type="button"
              variant="neutral"
            >
              {isOpen ? "Hide" : hasDueReviews ? "View reviews" : "View status"}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform motion-reduce:transition-none",
                  isOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          {!hasDueReviews ? (
            <div className="flex items-center gap-4 border-t-2 border-border p-4 sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-success/20 text-success shadow-[2px_2px_0px_0px_var(--border)]">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h4 className="text-sm font-heading sm:text-base">All caught up for today!</h4>
                <p className="mt-0.5 text-xs text-foreground/75 sm:text-sm">
                  You have no reflex reviews due right now. Complete any of the lessons below to
                  train your reflexes and automatically schedule your next spaced repetition
                  session.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 border-t-2 border-border p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
              {dueReviews.map((review) => (
                <Card
                  className="group flex flex-col justify-between border-2 bg-background transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
                  key={review.lesson_id}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className="bg-chart-2 text-main-foreground">Due now</Badge>
                      <span className="text-xs font-heading text-foreground/60">
                        {formatDueDate(review.due_at)}
                      </span>
                    </div>
                    <CardTitle className="pt-2 text-base leading-snug sm:text-lg">
                      {review.lesson_title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 p-4 pt-2">
                    <div className="text-xs text-foreground/70">
                      <span>Last score: </span>
                      <strong className="font-heading text-foreground text-sm">
                        {Math.round(review.last_score)}/100
                      </strong>
                    </div>
                    <Button asChild className="h-8 text-xs" size="sm">
                      <Link
                        aria-label={`Review ${review.lesson_title}`}
                        href={`/reflex/${review.lesson_id}`}
                      >
                        Review <ArrowRight aria-hidden="true" className="size-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
