import type { ComponentType } from "react";

import { Bot, Captions, Languages, Mic2, RefreshCcw, TimerReset } from "lucide-react";

import { cn } from "@/lib/utils";

const coreMethods: Array<{
  description: string;
  icon: ComponentType<{ className?: string }>;
  number: string;
  title: string;
  trains: string;
}> = [
  {
    description:
      "Follow natural audio, record your voice, and compare both tracks to improve rhythm, pitch, and pronunciation.",
    icon: Mic2,
    number: "01",
    title: "Dual Shadowing",
    trains: "Listening + speaking",
  },
  {
    description:
      "Rebuild conversations from what you hear, fill in the missing language, and reveal exactly what your ears missed.",
    icon: Captions,
    number: "02",
    title: "Dictation",
    trains: "Accurate listening",
  },
  {
    description:
      "Hear a question and begin answering within three seconds—before translation and overthinking slow you down.",
    icon: TimerReset,
    number: "03",
    title: "3-Second Reflex",
    trains: "Response speed",
  },
  {
    description:
      "Bring back the prompts you missed or answered slowly, using focused repetition to make weak responses automatic.",
    icon: RefreshCcw,
    number: "04",
    title: "Smart Review",
    trains: "Long-term recall",
  },
  {
    description:
      "Practice realistic situations with an AI partner and receive guidance on meaning, grammar, and natural expression.",
    icon: Bot,
    number: "05",
    title: "AI Tutor 1-on-1",
    trains: "Free conversation",
  },
  {
    description:
      "Listen for the real meaning of a Japanese exchange, choose or write a translation, and learn from the explanation.",
    icon: Languages,
    number: "06",
    title: "Listen & Translate",
    trains: "Active comprehension",
  },
];

export function CoreMethodsGrid() {
  return (
    <section
      aria-labelledby="core-methods-heading"
      className="border-b-4 border-border bg-secondary-background px-5 py-16 sm:px-8 lg:py-24"
      id="core-methods"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <div className="max-w-[820px]">
            <p className="mb-5 inline-flex border-2 border-border bg-main px-3 py-1 font-heading text-sm text-main-foreground shadow-shadow sm:text-base">
              CORE METHODS
            </p>
            <h2
              className="text-3xl leading-tight sm:text-4xl md:text-5xl xl:text-6xl"
              id="core-methods-heading"
            >
              Train every step between hearing and speaking.
            </h2>
          </div>
          <p className="max-w-[460px] text-base leading-relaxed sm:text-lg xl:text-xl">
            Short, focused exercises work together to turn passive Japanese knowledge into a usable
            conversation skill.
          </p>
        </div>

        <div className="grid border-l-2 border-t-2 border-border md:grid-cols-2 xl:grid-cols-3">
          {coreMethods.map(({ description, icon: Icon, number, title, trains }, index) => (
            <article
              className={cn(
                "group flex min-h-[390px] flex-col justify-between border-b-2 border-r-2 border-border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 xl:p-10",
                index === 1 || index === 3 || index === 5
                  ? "bg-main text-main-foreground"
                  : "bg-background",
              )}
              key={number}
            >
              <div className="flex items-start justify-between gap-6">
                <span className="font-heading text-lg sm:text-xl">{number}</span>
                <div className="flex size-14 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow sm:size-16">
                  <Icon aria-hidden="true" className="size-7 stroke-[2.25] sm:size-8" />
                </div>
              </div>

              <div className="mt-14">
                <p className="mb-4 inline-flex border-2 border-current px-2.5 py-1 text-xs uppercase tracking-[0.12em] sm:text-sm">
                  {trains}
                </p>
                <h3 className="text-2xl leading-tight sm:text-3xl xl:text-4xl">{title}</h3>
                <p className="mt-4 text-base leading-relaxed sm:text-lg">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
