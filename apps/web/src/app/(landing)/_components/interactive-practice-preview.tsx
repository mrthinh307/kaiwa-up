"use client";

import { ArrowRight, Check, Headphones, Mic, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PracticeStep = "listen" | "respond" | "review";

const practiceSteps: Array<{
  icon: typeof Headphones;
  label: string;
  step: PracticeStep;
}> = [
  { icon: Headphones, label: "Listen", step: "listen" },
  { icon: Mic, label: "Respond", step: "respond" },
  { icon: Sparkles, label: "Review", step: "review" },
];

const waveformBars = [
  "h-4",
  "h-8",
  "h-6",
  "h-12",
  "h-9",
  "h-16",
  "h-11",
  "h-7",
  "h-14",
  "h-9",
  "h-12",
  "h-6",
  "h-10",
  "h-5",
  "h-12",
  "h-8",
];

function ListenStep({ onNext }: { onNext: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        <p className="mb-3 text-sm uppercase tracking-[0.14em] sm:text-base">Listen and shadow</p>
        <p className="text-2xl leading-relaxed sm:text-3xl lg:text-4xl">
          すみません、駅はどちらですか。
        </p>
        <p className="mt-3 text-base text-foreground/70 sm:text-lg">
          Excuse me, which way is the station?
        </p>

        <div className="mt-8 flex h-24 items-center gap-1.5 border-2 border-border bg-secondary-background px-4 shadow-shadow sm:px-6">
          <button
            aria-label={isPlaying ? "Pause sample audio" : "Play sample audio"}
            className="mr-3 flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground sm:size-12"
            onClick={() => setIsPlaying((current) => !current)}
            type="button"
          >
            <Volume2 aria-hidden="true" className="size-5 sm:size-6" />
          </button>
          {waveformBars.map((height, index) => (
            <span
              className={cn(
                "w-full max-w-3 rounded-full bg-foreground",
                height,
                isPlaying ? "animate-pulse" : "opacity-55",
              )}
              key={height + index}
            />
          ))}
          <span className="ml-2 shrink-0 text-sm font-heading">0:08</span>
        </div>
      </div>

      <Button className="h-auto self-start px-5 py-3 text-base sm:text-lg" onClick={onNext}>
        Your turn
        <ArrowRight className="size-5" />
      </Button>
    </div>
  );
}

function RespondStep({ onNext }: { onNext: () => void }) {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center sm:py-12">
        <p className="text-sm uppercase tracking-[0.14em] sm:text-base">Repeat the phrase</p>
        <div
          className={cn(
            "my-8 flex size-28 items-center justify-center rounded-full border-4 border-border shadow-shadow transition-colors sm:size-36",
            isRecording ? "bg-main" : "bg-secondary-background",
          )}
        >
          <Mic
            aria-hidden="true"
            className={cn("size-11 sm:size-14", isRecording && "animate-pulse")}
          />
        </div>
        <p aria-live="polite" className="text-2xl font-heading sm:text-3xl">
          {isRecording ? "Listening to you..." : "Ready when you are"}
        </p>
        <p className="mt-3 max-w-md text-base text-foreground/70 sm:text-lg">
          Record your response, then compare it with the original speaker.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="h-auto px-5 py-3 text-base sm:text-lg"
          onClick={() => setIsRecording((current) => !current)}
          variant={isRecording ? "neutral" : "default"}
        >
          {isRecording ? "Stop recording" : "Start recording"}
          <Mic className="size-5" />
        </Button>
        <Button
          className="h-auto bg-secondary-background px-5 py-3 text-base text-foreground sm:text-lg"
          onClick={onNext}
          variant="neutral"
        >
          Get feedback
          <Sparkles className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center py-7 sm:py-10">
        <div className="mb-7 flex items-center justify-between gap-5">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] sm:text-base">
              AI pronunciation feedback
            </p>
            <p className="mt-2 text-3xl font-heading sm:text-4xl">Great rhythm!</p>
          </div>
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-border bg-main text-2xl font-heading shadow-shadow sm:size-24 sm:text-3xl">
            88
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["92", "Pronunciation"],
            ["86", "Pitch"],
            ["84", "Rhythm"],
          ].map(([score, label]) => (
            <div className="border-2 border-border bg-secondary-background p-4" key={label}>
              <p className="text-2xl font-heading sm:text-3xl">{score}</p>
              <p className="mt-1 text-sm sm:text-base">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3 border-2 border-border bg-main p-4 text-main-foreground shadow-shadow sm:p-5">
          <Check aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <p className="text-base leading-relaxed sm:text-lg">
            Your timing sounds natural. Keep the final vowel in ですか shorter for a more
            conversational rhythm.
          </p>
        </div>
      </div>

      <Button className="h-auto self-start px-5 py-3 text-base sm:text-lg" onClick={onRestart}>
        Practice again
        <RotateCcw className="size-5" />
      </Button>
    </div>
  );
}

export function InteractivePracticePreview() {
  const [activeStep, setActiveStep] = useState<PracticeStep>("listen");

  return (
    <section
      aria-labelledby="practice-preview-heading"
      className="landing-grid border-b-4 border-border bg-background px-5 py-16 sm:px-8 lg:py-24"
      id="how-it-works"
    >
      <div className="mx-auto max-w-[1300px]">
        <div className="mx-auto mb-10 max-w-[850px] text-center md:mb-14">
          <p className="mb-5 inline-flex border-2 border-border bg-main px-3 py-1 font-heading text-sm text-main-foreground shadow-shadow sm:text-base">
            INTERACTIVE PREVIEW
          </p>
          <h2
            className="text-3xl leading-tight sm:text-4xl md:text-5xl xl:text-6xl"
            id="practice-preview-heading"
          >
            One short loop. Three active skills.
          </h2>
          <p className="mx-auto mt-5 max-w-[700px] text-base leading-relaxed sm:text-lg xl:text-xl">
            Preview how KaiwaUp moves you from careful listening to a spoken response and useful
            feedback.
          </p>
        </div>

        <div className="overflow-hidden rounded-base border-4 border-border bg-background shadow-shadow">
          <div className="flex flex-col border-b-4 border-border bg-secondary-background lg:flex-row lg:items-center lg:justify-between">
            <div className="border-b-4 border-border px-5 py-4 lg:border-b-0 lg:border-r-4 lg:px-7">
              <p className="font-heading sm:text-lg">Asking for directions</p>
              <p className="mt-1 text-sm">Beginner · 45 sec</p>
            </div>
            <div aria-label="Practice steps" className="grid flex-1 grid-cols-3" role="tablist">
              {practiceSteps.map(({ icon: Icon, label, step }, index) => (
                <button
                  aria-selected={activeStep === step}
                  className={cn(
                    "flex min-h-16 items-center justify-center gap-2 border-border px-3 py-3 text-sm font-heading transition-colors sm:text-base",
                    index > 0 && "border-l-2",
                    activeStep === step ? "bg-main text-main-foreground" : "hover:bg-main/20",
                  )}
                  key={step}
                  onClick={() => setActiveStep(step)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[540px] p-5 sm:p-8 lg:p-12" role="tabpanel">
            {activeStep === "listen" && <ListenStep onNext={() => setActiveStep("respond")} />}
            {activeStep === "respond" && <RespondStep onNext={() => setActiveStep("review")} />}
            {activeStep === "review" && <ReviewStep onRestart={() => setActiveStep("listen")} />}
          </div>
        </div>
      </div>
    </section>
  );
}
