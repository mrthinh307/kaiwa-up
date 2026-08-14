"use client";

import { ChevronDown, Headphones, Keyboard, Video, VideoOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { DictationVideoPlayerProps } from "../../_types/dictation-practice";

import { DICTATION_STEPS, YOUTUBE_VIDEO_ID_PATTERN } from "../../_constants/dictation-constants";

export function DictationVideoPlayer({
  className,
  lessonTitle,
  youtubeVideoId,
}: DictationVideoPlayerProps) {
  const isValidVideoId = Boolean(youtubeVideoId && YOUTUBE_VIDEO_ID_PATTERN.test(youtubeVideoId));
  const embedUrl = isValidVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&enablejsapi=1&playsinline=1`
    : null;

  return (
    <section
      aria-labelledby="dictation-video-heading"
      className={cn(
        "overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground">
            <Video aria-hidden="true" className="size-4 text-destructive" />
          </span>
          <h2 className="text-xs font-heading tracking-wide uppercase" id="dictation-video-heading">
            Video Material
          </h2>
        </div>

        <Badge className="bg-secondary-background text-xs text-foreground" variant="neutral">
          YouTube Player
        </Badge>
      </div>

      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
            src={embedUrl}
            title={`Dictation video: ${lessonTitle}`}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-secondary-background">
            <VideoOff aria-hidden="true" className="size-10 text-destructive" />
            <div>
              <p className="text-base font-heading">Video material is currently unavailable</p>
              <p className="mt-1 text-xs text-secondary-background/70">
                Please try refreshing or select another lesson.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3.5 p-3.5 sm:p-4">
        {/* How Dictation Works Collapsible Guide */}
        <Collapsible
          className="group rounded-base border-2 border-border bg-background"
          defaultOpen={false}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3.5 text-left text-xs font-heading tracking-wide uppercase text-foreground/75 transition-colors hover:text-foreground">
            <span className="flex items-center gap-2">
              <Headphones aria-hidden="true" className="size-3.5 text-foreground/60" />
              How Dictation works
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t-2 border-border/40 p-3.5 pt-3">
              <ol className="space-y-2.5">
                {DICTATION_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <li
                      className="flex items-start gap-2.5 text-xs text-foreground/80"
                      key={step.number}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main font-heading text-[10px] text-main-foreground shadow-[1px_1px_0px_0px_var(--border)]">
                        {step.number}
                      </span>
                      <div className="flex-1 leading-relaxed">
                        <strong className="flex items-center gap-1 font-heading text-foreground">
                          <Icon aria-hidden="true" className="size-3 text-foreground/70" />
                          {step.title}:
                        </strong>
                        <span className="text-foreground/75">{step.description}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Keyboard Shortcuts - Hidden on mobile (<sm), shown on desktop */}
        <div className="hidden rounded-base border-2 border-border bg-background p-3.5 sm:block">
          <div className="flex items-center gap-2 text-xs font-heading tracking-wide text-foreground/60 uppercase">
            <Keyboard aria-hidden="true" className="size-3.5" />
            Keyboard shortcuts
          </div>
          <div className="mt-2.5 flex flex-col gap-2 text-xs text-foreground/80">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded-base border-2 border-border bg-secondary-background px-1.5 py-0.5 font-heading text-xs shadow-[2px_2px_0px_0px_var(--border)]">
                  Tab
                </kbd>
                <span>/</span>
                <kbd className="rounded-base border-2 border-border bg-secondary-background px-1.5 py-0.5 font-heading text-xs shadow-[2px_2px_0px_0px_var(--border)]">
                  Enter
                </kbd>
              </span>
              <span className="text-foreground/65">Next blank</span>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded-base border-2 border-border bg-secondary-background px-1.5 py-0.5 font-heading text-xs shadow-[2px_2px_0px_0px_var(--border)]">
                  Shift + Tab
                </kbd>
              </span>
              <span className="text-foreground/65">Previous blank</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
