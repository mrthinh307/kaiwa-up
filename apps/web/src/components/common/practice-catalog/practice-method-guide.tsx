"use client";

import { BookOpenCheck, ChevronDown, Headphones, Mic, PencilLine, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const PRACTICE_ICON_MAP = {
  book: BookOpenCheck,
  headphones: Headphones,
  mic: Mic,
  pencil: PencilLine,
  volume: Volume2,
} as const;

export type PracticeIconName = keyof typeof PRACTICE_ICON_MAP;

export type PracticeMethodGuideStep = {
  description: string;
  iconName?: PracticeIconName;
  number: string;
  title: string;
};

type PracticeMethodGuideProps = {
  className?: string;
  defaultOpen?: boolean;
  heading: string;
  headingId: string;
  iconName?: PracticeIconName;
  steps: readonly PracticeMethodGuideStep[];
  summary: string;
};

export function PracticeMethodGuide({
  className,
  defaultOpen = false,
  heading,
  headingId,
  iconName = "headphones",
  steps,
  summary,
}: PracticeMethodGuideProps) {
  const HeaderIcon = PRACTICE_ICON_MAP[iconName] ?? Headphones;

  return (
    <Collapsible
      className={cn(
        "group rounded-base border-2 border-border bg-secondary-background shadow-shadow",
        className,
      )}
      defaultOpen={defaultOpen}
    >
      <section aria-labelledby={headingId}>
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-[2px_2px_0px_0px_var(--border)]">
              <HeaderIcon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-heading text-base sm:text-lg" id={headingId}>
                {heading}
              </h3>
              <p className="text-xs text-foreground/65 sm:text-sm">{summary}</p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button className="w-full shrink-0 sm:w-auto" size="sm" type="button" variant="neutral">
              View steps
              <ChevronDown
                aria-hidden="true"
                className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <ol className="grid border-t-2 border-border sm:grid-cols-3">
            {steps.map(({ description, iconName: stepIconName, number, title }, index) => {
              const StepIcon = stepIconName
                ? (PRACTICE_ICON_MAP[stepIconName] ?? Headphones)
                : Headphones;
              return (
                <li
                  className={`p-4 sm:p-5 ${index > 0 ? "border-t-2 border-border sm:border-t-0 sm:border-l-2" : ""}`}
                  key={number}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-base border-2 border-border bg-main px-2 font-heading text-sm text-main-foreground shadow-shadow">
                      {number}
                    </span>
                    <StepIcon aria-hidden="true" className="size-6 text-foreground/75" />
                  </div>
                  <h4 className="mt-4 font-heading text-base sm:text-lg">{title}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/70 sm:text-sm">
                    {description}
                  </p>
                </li>
              );
            })}
          </ol>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
