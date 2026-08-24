"use client";

import { ChevronDown, CirclePlay, History } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { DashboardViewModel } from "../_utils/dashboard-api-adapter";

import { getDashboardPracticeModeMetadata } from "../_utils/dashboard-formatters";

function getInProgressLessonHref(
  lesson: DashboardViewModel["progressSummary"]["inProgressLessons"][number],
): string {
  const encodedContentId = encodeURIComponent(lesson.contentId);
  if (lesson.contentType === "shadowing_dictation") {
    if (lesson.practiceMode === "shadowing") {
      return `/shadowing/${encodedContentId}`;
    }
    if (lesson.practiceMode === "dictation") {
      return `/dictation/${encodedContentId}`;
    }
    return "/lessons";
  }
  if (lesson.contentType === "reflex") {
    return `/reflex/${encodedContentId}`;
  }
  return `/listening-translation/${encodedContentId}`;
}

export function DashboardInProgressLessons({
  lessons,
}: {
  lessons: DashboardViewModel["progressSummary"]["inProgressLessons"];
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const handleCarouselApi = useCallback((api: CarouselApi) => {
    setCarouselApi(api);

    if (!api) {
      return;
    }

    setCurrentPage(api.selectedScrollSnap() + 1);
    setPageCount(Math.max(api.scrollSnapList().length, 1));
  }, []);

  const updatePagination = useCallback(() => {
    if (!carouselApi) {
      return;
    }

    setCurrentPage(carouselApi.selectedScrollSnap() + 1);
    setPageCount(Math.max(carouselApi.scrollSnapList().length, 1));
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    carouselApi.on("select", updatePagination);
    carouselApi.on("reInit", updatePagination);

    return () => {
      carouselApi.off("select", updatePagination);
      carouselApi.off("reInit", updatePagination);
    };
  }, [carouselApi, updatePagination]);

  return (
    <Collapsible
      asChild
      className="group rounded-base border-4 border-border bg-secondary-background shadow-shadow"
      defaultOpen={false}
    >
      <section aria-labelledby="dashboard-in-progress-heading">
        <div className="flex flex-col justify-between gap-4 bg-background p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-base border-2 border-border bg-chart-3 text-main-foreground shadow-shadow">
              <CirclePlay aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-heading uppercase tracking-[0.14em]">Progress summary</p>
              <h2 className="mt-1 text-2xl sm:text-3xl" id="dashboard-in-progress-heading">
                Lessons in progress
              </h2>
              <p className="mt-1 text-sm font-heading tabular-nums">
                {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button className="w-full shrink-0 sm:w-auto" type="button" variant="neutral">
              View details
              <ChevronDown
                aria-hidden="true"
                className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="border-t-4 border-border">
          {lessons.length > 0 ? (
            <div className="p-5 sm:p-7">
              <Carousel
                aria-labelledby="dashboard-in-progress-heading"
                className="w-full"
                opts={{ align: "start" }}
                setApi={handleCarouselApi}
              >
                <CarouselContent className="-ml-3 sm:-ml-4">
                  {lessons.map((lesson, index) => {
                    const practiceMetadata = getDashboardPracticeModeMetadata(lesson.practiceMode);
                    const PracticeIcon = practiceMetadata.icon;

                    return (
                      <CarouselItem
                        aria-label={`${index + 1} of ${lessons.length}`}
                        className="pt-2 pr-2 pb-2 pl-3 sm:pl-4 md:basis-1/2 2xl:basis-1/3"
                        key={lesson.id}
                      >
                        <Link
                          aria-label={`Continue ${practiceMetadata.label}: ${lesson.contentTitle}`}
                          className="block h-full rounded-base outline-hidden transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1 motion-reduce:transition-none"
                          href={getInProgressLessonHref(lesson)}
                        >
                          <article className="relative flex h-full min-h-48 flex-col rounded-base border-2 border-border bg-background p-5 shadow-shadow sm:p-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  className={cn(
                                    "gap-1.5 rounded-none font-heading",
                                    practiceMetadata.badgeClassName,
                                  )}
                                >
                                  <PracticeIcon aria-hidden="true" />
                                  {practiceMetadata.label}
                                </Badge>
                                <Badge className="rounded-none bg-secondary-background font-heading text-foreground">
                                  {lesson.difficulty}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 py-1 text-sm font-heading">
                                <History aria-hidden="true" className="size-4" />
                                <span>{lesson.attemptNumber}</span>
                              </div>
                            </div>
                            <h3 className="mt-4 line-clamp-3 text-xl leading-snug">
                              {lesson.contentTitle}
                            </h3>
                          </article>
                        </Link>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>

                <div className="mt-5 flex items-center justify-between gap-4 border-t-2 border-border pt-5">
                  <p
                    aria-atomic="true"
                    aria-live="polite"
                    className="text-sm font-heading tabular-nums"
                  >
                    Page {currentPage} of {pageCount}
                  </p>
                  <div className="flex items-center gap-3">
                    <CarouselPrevious className="static size-10 translate-y-0" />
                    <CarouselNext className="static size-10 translate-y-0" />
                  </div>
                </div>
              </Carousel>
            </div>
          ) : (
            <div className="p-6 sm:p-7">
              <h3 className="text-xl">No lessons in progress</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                Start a Shadowing or Dictation lesson and it will appear here until completion.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
