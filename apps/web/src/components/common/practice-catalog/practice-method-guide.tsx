"use client";

import type { LucideIcon } from "lucide-react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type PracticeMethodGuideStep = {
  description: string;
  icon: LucideIcon;
  number: string;
  title: string;
};

type PracticeMethodGuideProps = {
  heading: string;
  headingId: string;
  icon: LucideIcon;
  steps: readonly PracticeMethodGuideStep[];
  summary: string;
};

export function PracticeMethodGuide({
  heading,
  headingId,
  icon: HeaderIcon,
  steps,
  summary,
}: PracticeMethodGuideProps) {
  return (
    <Collapsible className="group mt-4 rounded-base border-2 border-border bg-secondary-background">
      <section aria-labelledby={headingId}>
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground">
              <HeaderIcon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg" id={headingId}>
                {heading}
              </h3>
              <p className="text-sm text-foreground/65">{summary}</p>
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
            {steps.map(({ description, icon: Icon, number, title }, index) => (
              <li
                className={`p-4 sm:p-5 ${index > 0 ? "border-t-2 border-border sm:border-t-0 sm:border-l-2" : ""}`}
                key={number}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-base border-2 border-border bg-main px-2 text-sm font-heading text-main-foreground shadow-shadow">
                    {number}
                  </span>
                  <Icon aria-hidden="true" className="size-6" />
                </div>
                <h4 className="mt-5 text-lg">{title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{description}</p>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
