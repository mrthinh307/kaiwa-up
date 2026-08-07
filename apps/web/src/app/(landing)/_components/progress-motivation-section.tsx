import { Award, Check, Flame, Medal, Sparkles, Trophy, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

import { DecorativeStar } from "./decorative-star";

const weekDays = [
  { day: "M", isComplete: true },
  { day: "T", isComplete: true },
  { day: "W", isComplete: true },
  { day: "T", isComplete: true },
  { day: "F", isComplete: true },
  { day: "S", isComplete: true },
  { day: "S", isComplete: false },
];

const leaders = [
  { exp: "1,240", name: "Hana", rank: "1" },
  { exp: "1,080", name: "Ren", rank: "2" },
  { exp: "960", name: "You", rank: "3" },
  { exp: "875", name: "Mika", rank: "4" },
];

const achievements = [
  { detail: "Complete your first session", icon: Sparkles, title: "First Step" },
  { detail: "Answer 10 prompts on time", icon: Zap, title: "Quick Thinker" },
  { detail: "Practice six days in a row", icon: Flame, title: "Shadow Streak" },
];

export function ProgressMotivationSection() {
  return (
    <section
      aria-labelledby="progress-heading"
      className="relative overflow-hidden border-b-4 border-border bg-main px-5 py-16 text-main-foreground sm:px-8 lg:py-24"
      id="progress"
    >
      <DecorativeStar
        className="absolute -left-16 top-24 hidden size-52 opacity-20 xl:block"
        variant={20}
      />
      <DecorativeStar
        className="absolute -right-14 bottom-20 hidden size-48 opacity-20 xl:block"
        variant={14}
      />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <div className="max-w-[800px]">
            <p className="mb-5 inline-flex border-2 border-border bg-background px-3 py-1 font-heading text-sm text-foreground shadow-shadow sm:text-base">
              PROGRESS & MOTIVATION
            </p>
            <h2
              className="text-3xl leading-tight sm:text-4xl md:text-5xl xl:text-6xl"
              id="progress-heading"
            >
              Small wins that keep your Japanese moving.
            </h2>
          </div>
          <p className="max-w-[460px] text-base leading-relaxed sm:text-lg xl:text-xl">
            Every completed exercise becomes visible progress—so you always know what improved and
            what to practice next.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-5">
            <article className="rounded-base border-4 border-border bg-background p-5 text-foreground shadow-shadow sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-base border-2 border-border bg-main text-2xl font-heading text-main-foreground shadow-shadow sm:size-16">
                    K
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.12em]">Current level</p>
                    <h3 className="mt-1 text-2xl sm:text-3xl">Level 12 · Conversationalist</h3>
                  </div>
                </div>
                <span className="self-start border-2 border-border bg-main px-3 py-1 font-heading text-main-foreground shadow-shadow">
                  +320 EXP this week
                </span>
              </div>

              <div className="mt-8 flex items-end justify-between gap-4">
                <p className="font-heading sm:text-lg">2,480 / 3,000 EXP</p>
                <p className="text-sm">520 EXP to Level 13</p>
              </div>
              <div className="mt-3 h-7 overflow-hidden rounded-base border-2 border-border bg-secondary-background">
                <div className="h-full w-[82%] border-r-2 border-border bg-main" />
              </div>

              <div className="mt-8 grid gap-5 border-t-2 border-border pt-8 md:grid-cols-[0.9fr_1.1fr]">
                <div className="flex items-center gap-5">
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-border bg-main shadow-shadow">
                    <Flame aria-hidden="true" className="size-10" />
                  </div>
                  <div>
                    <p className="text-4xl font-heading sm:text-5xl">6 days</p>
                    <p className="mt-1 text-base sm:text-lg">Current learning streak</p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-heading sm:text-lg">This week</p>
                    <p className="text-sm">6 / 7 days</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {weekDays.map(({ day, isComplete }, index) => (
                      <div className="text-center" key={day + index}>
                        <div
                          className={cn(
                            "flex aspect-square items-center justify-center border-2 border-border",
                            isComplete ? "bg-main" : "bg-secondary-background",
                          )}
                        >
                          {isComplete ? (
                            <Check aria-hidden="true" className="size-4 sm:size-5" />
                          ) : (
                            <span className="size-2 rounded-full bg-foreground/25" />
                          )}
                        </div>
                        <p className="mt-1 text-xs sm:text-sm">{day}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-5 sm:grid-cols-3">
              {achievements.map(({ detail, icon: Icon, title }) => (
                <article
                  className="flex min-h-52 flex-col justify-between rounded-base border-4 border-border bg-secondary-background p-5 text-foreground shadow-shadow sm:min-h-60"
                  key={title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon aria-hidden="true" className="size-9 stroke-[2.25]" />
                    <Award aria-hidden="true" className="size-6 text-main" />
                  </div>
                  <div className="mt-10">
                    <h3 className="text-xl sm:text-2xl">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed sm:text-base">{detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <article className="rounded-base border-4 border-border bg-foreground p-5 text-background shadow-shadow sm:p-7">
            <div className="flex items-start justify-between gap-5 border-b-2 border-background/35 pb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.12em]">Weekly league</p>
                <h3 className="mt-2 text-2xl sm:text-3xl">Top learners</h3>
              </div>
              <Trophy aria-hidden="true" className="size-10 text-main" />
            </div>

            <ol className="mt-4">
              {leaders.map(({ exp, name, rank }) => (
                <li
                  className={cn(
                    "mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-2 p-3 sm:p-4",
                    name === "You"
                      ? "border-border bg-main text-main-foreground shadow-shadow"
                      : "border-background/35",
                  )}
                  key={rank}
                >
                  <span className="flex size-9 items-center justify-center border-2 border-current font-heading">
                    {rank}
                  </span>
                  <div>
                    <p className="font-heading sm:text-lg">{name}</p>
                    <p className="text-xs opacity-70 sm:text-sm">Weekly EXP</p>
                  </div>
                  <p className="font-heading sm:text-lg">{exp}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex items-center gap-3 border-t-2 border-background/35 pt-6">
              <Medal aria-hidden="true" className="size-7 text-main" />
              <p className="text-sm leading-relaxed sm:text-base">
                Stay in the top 5 to advance to the next league.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
