import type { ComponentType } from "react";

import { BookOpenCheck, Ear, MessageCircleMore, RefreshCcw } from "lucide-react";

import { DecorativeStar } from "./decorative-star";

const learnerProblems: Array<{
  description: string;
  icon: ComponentType<{ className?: string }>;
  number: string;
  title: string;
}> = [
  {
    description:
      "You know the vocabulary and grammar, but recalling them in real time is a different skill.",
    icon: BookOpenCheck,
    number: "01",
    title: "Knowledge stays passive",
  },
  {
    description:
      "Textbook audio rarely prepares your ears for natural rhythm, connected speech, and changing intonation.",
    icon: Ear,
    number: "02",
    title: "Real speech feels too fast",
  },
  {
    description:
      "You translate in your head, search for the perfect sentence, and miss the moment to respond.",
    icon: MessageCircleMore,
    number: "03",
    title: "Responses arrive too late",
  },
  {
    description:
      "Without a partner, useful feedback, or visible progress, consistent conversation practice is hard to sustain.",
    icon: RefreshCcw,
    number: "04",
    title: "Practice never becomes a habit",
  },
];

export function ProblemSection() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="border-b-4 border-border bg-background"
      id="problem"
    >
      <div className="mx-auto grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="landing-grid relative flex flex-col justify-between overflow-hidden border-b-4 border-border bg-secondary-background p-6 sm:p-10 lg:min-h-[690px] lg:border-b-0 lg:border-r-4 lg:p-14 xl:p-20">
          <DecorativeStar
            className="absolute -right-10 -top-10 size-36 opacity-20 sm:size-48 lg:-right-14 lg:-top-14 lg:size-64"
            variant={14}
          />
          <div className="relative z-10">
            <p className="mb-6 inline-flex border-2 border-border bg-main px-3 py-1 font-heading text-sm text-main-foreground shadow-shadow sm:text-base">
              THE CONVERSATION GAP
            </p>
            <h2
              className="max-w-[700px] text-3xl leading-tight sm:text-4xl md:text-5xl xl:text-6xl"
              id="problem-heading"
            >
              You know Japanese. So why does speaking still feel hard?
            </h2>
            <p className="mt-7 max-w-[650px] text-lg leading-relaxed sm:text-xl xl:text-2xl">
              Passing a test proves what you know. A real conversation tests how quickly you can
              hear, understand, and respond.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid grid-cols-2 border-2 border-border bg-background shadow-shadow sm:max-w-[560px]">
            <div className="border-r-2 border-border p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] sm:text-sm">On paper</p>
              <p className="mt-2 text-lg font-heading sm:text-2xl">“I know this.”</p>
            </div>
            <div className="bg-main p-4 text-main-foreground sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] sm:text-sm">In conversation</p>
              <p className="mt-2 text-lg font-heading sm:text-2xl">“What do I say?”</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2">
          {learnerProblems.map(({ description, icon: Icon, number, title }, index) => (
            <article
              className={`flex min-h-[300px] flex-col justify-between border-border p-6 sm:p-8 lg:min-h-0 lg:p-10 xl:p-12 ${
                index % 2 === 0 ? "sm:border-r-4" : ""
              } ${index < 2 ? "border-b-4" : index === 2 ? "border-b-4 sm:border-b-0" : ""} ${
                index === 1 || index === 2
                  ? "bg-main text-main-foreground"
                  : "bg-secondary-background"
              }`}
              key={number}
            >
              <div className="flex items-start justify-between gap-5">
                <span className="text-lg font-heading sm:text-xl">{number}</span>
                <Icon aria-hidden="true" className="size-10 stroke-[2.25] sm:size-12 xl:size-14" />
              </div>
              <div className="mt-14">
                <h3 className="text-2xl leading-tight sm:text-3xl xl:text-4xl">{title}</h3>
                <p className="mt-4 text-base leading-relaxed sm:text-lg xl:text-xl">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t-4 border-border bg-foreground px-5 py-6 text-center text-background sm:py-8">
        <p className="text-lg sm:text-2xl lg:text-3xl">
          More study is not the missing piece.{" "}
          <span className="text-main">You need practice that turns knowledge into reflex.</span>
        </p>
      </div>
    </section>
  );
}
