"use client";

import { ChevronDown, Headphones, Mic, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const REFLEX_GUIDE_STEPS = [
  {
    description: "Listen to the prompt without seeing text.",
    icon: Headphones,
    number: "01",
    title: "Hear the scenario",
  },
  {
    description: "Speak your Japanese response within 3s.",
    icon: Mic,
    number: "02",
    title: "Speak within 3s",
  },
  {
    description: "Get instant AI fluency and accuracy scoring.",
    icon: Sparkles,
    number: "03",
    title: "Instant AI score",
  },
] as const;

export function ReflexMethodGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-2 bg-secondary-background">
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headphones aria-hidden="true" className="size-5" /> How it works
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button className="h-7 px-2 text-xs" size="sm" type="button" variant="neutral">
                {isOpen ? "Hide" : "Show"}
                <ChevronDown
                  aria-hidden="true"
                  className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-foreground/70">
            Rapid 3-step reflex training under time pressure.
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-2.5 border-t-2 border-border pt-3">
            {REFLEX_GUIDE_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  className="flex items-start gap-2.5 rounded-base border border-border bg-background p-2.5 text-xs"
                  key={step.number}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-base border border-border bg-main font-heading text-[10px] text-main-foreground">
                    {step.number}
                  </span>
                  <div>
                    <p className="font-heading text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-foreground/70 leading-relaxed">{step.description}</p>
                  </div>
                  <Icon aria-hidden="true" className="ml-auto size-4 shrink-0 text-foreground/50" />
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
