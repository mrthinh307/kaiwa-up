import type { ReactNode } from "react";

import {
  Bot,
  Check,
  Clock3,
  Flame,
  Headphones,
  Languages,
  Mic,
  Play,
  Sparkles,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

type HeroComponentWallProps = {
  className?: string;
  reverse?: boolean;
  side: "left" | "right";
};

type LearningWidgetProps = {
  children: ReactNode;
  className?: string;
};

const waveformBars = [35, 60, 45, 80, 55, 95, 65, 40, 75, 50, 85, 45, 70, 35];

function LearningWidget({ children, className }: LearningWidgetProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-background text-foreground shadow-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WidgetHeader({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-border bg-main px-4 py-3 text-main-foreground">
      {icon}
      <p className="font-heading">{children}</p>
    </div>
  );
}

function ShadowingWidget() {
  return (
    <LearningWidget>
      <WidgetHeader icon={<Headphones className="size-5" />}>Dual Shadowing</WidgetHeader>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-lg font-heading">今日はいい天気ですね。</p>
          <p className="text-xs text-foreground/70">It&apos;s a beautiful day, isn&apos;t it?</p>
        </div>
        <div className="flex h-12 items-center gap-1 rounded-base border-2 border-border bg-secondary-background px-3">
          <Volume2 className="mr-1 size-4 shrink-0" />
          {waveformBars.map((height, index) => (
            <span
              className="w-1 rounded-full bg-main"
              key={`${height}-${index}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-heading">
          <div className="flex items-center justify-center gap-1 rounded-base border-2 border-border bg-main px-2 py-2 text-main-foreground">
            <Play className="size-3.5 fill-current" /> Original
          </div>
          <div className="flex items-center justify-center gap-1 rounded-base border-2 border-border bg-secondary-background px-2 py-2">
            <Mic className="size-3.5" /> Your voice
          </div>
        </div>
      </div>
    </LearningWidget>
  );
}

function DictationWidget() {
  return (
    <LearningWidget className="bg-main text-main-foreground">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <div className="flex items-center gap-2 font-heading">
          <Headphones className="size-5" /> Dictation
        </div>
        <span className="rounded-base border-2 border-border bg-secondary-background px-2 py-1 text-xs text-foreground">
          2 / 3
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex size-10 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-foreground">
          <Play className="size-4 fill-current" />
        </div>
        <p className="text-lg font-heading">
          駅まで <span className="border-b-2 border-current px-5">___</span> かかりますか。
        </p>
        <div className="flex items-center gap-2 rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-sm text-foreground">
          <Check className="size-4 text-green-600" /> どのくらい
        </div>
      </div>
    </LearningWidget>
  );
}

function ProgressWidget() {
  return (
    <LearningWidget>
      <WidgetHeader icon={<Zap className="size-5 fill-current" />}>
        Today&apos;s progress
      </WidgetHeader>
      <div className="space-y-4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-foreground/70">Level 7</p>
            <p className="text-2xl font-heading">1,240 EXP</p>
          </div>
          <span className="rounded-base border-2 border-border bg-main px-2 py-1 text-xs font-heading text-main-foreground">
            +20 EXP
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full border-2 border-border bg-secondary-background">
          <div className="h-full w-[72%] bg-main" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>260 EXP to Level 8</span>
          <span className="flex items-center gap-1 font-heading">
            <Flame className="size-4 fill-main" /> 6 day streak
          </span>
        </div>
      </div>
    </LearningWidget>
  );
}

function PronunciationWidget() {
  return (
    <LearningWidget className="bg-main text-main-foreground">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <div className="flex items-center gap-2 font-heading">
          <Sparkles className="size-5" /> Pronunciation feedback
        </div>
        <span className="text-xl font-heading">86</span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-lg font-heading">ありがとうございます</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-foreground">
          {[
            ["Pitch", "90"],
            ["Rhythm", "84"],
            ["Clarity", "88"],
          ].map(([label, score]) => (
            <div
              className="rounded-base border-2 border-border bg-secondary-background p-2"
              key={label}
            >
              <p className="font-heading">{score}</p>
              <p>{label}</p>
            </div>
          ))}
        </div>
        <p className="rounded-base border-2 border-border bg-secondary-background p-3 text-xs text-foreground">
          Keep the final vowel shorter for a more natural rhythm.
        </p>
      </div>
    </LearningWidget>
  );
}

function ReviewWidget() {
  return (
    <LearningWidget>
      <WidgetHeader icon={<Clock3 className="size-5" />}>Smart review</WidgetHeader>
      <div className="space-y-3 p-4">
        {[
          ["Restaurant phrases", "Due now"],
          ["Train directions", "In 2 hours"],
          ["Weekend plans", "Tomorrow"],
        ].map(([lesson, due], index) => (
          <div className="flex items-center justify-between gap-3" key={lesson}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-3 rounded-full border-2 border-border",
                  index === 0 ? "bg-main" : "bg-secondary-background",
                )}
              />
              <span className="text-sm font-heading">{lesson}</span>
            </div>
            <span className="text-xs text-foreground/70">{due}</span>
          </div>
        ))}
      </div>
    </LearningWidget>
  );
}

function AiTutorWidget() {
  return (
    <LearningWidget>
      <WidgetHeader icon={<Bot className="size-5" />}>AI Tutor 1-on-1</WidgetHeader>
      <div className="space-y-3 p-4 text-sm">
        <div className="mr-8 rounded-base border-2 border-border bg-secondary-background p-3">
          いらっしゃいませ。ご注文は何になさいますか？
          <p className="mt-1 text-xs text-foreground/65">What would you like to order?</p>
        </div>
        <div className="ml-8 rounded-base border-2 border-border bg-main p-3 text-main-foreground">
          ラーメンを一つお願いします。
        </div>
        <div className="flex items-center gap-2 text-xs font-heading">
          <Sparkles className="size-4" /> Natural and polite response
        </div>
      </div>
    </LearningWidget>
  );
}

function ReflexWidget() {
  return (
    <LearningWidget className="bg-main text-main-foreground">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <div className="flex items-center gap-2 font-heading">
          <Zap className="size-5 fill-current" /> 3-Second Reflex
        </div>
        <span className="rounded-base border-2 border-border bg-secondary-background px-2 py-1 text-xs text-foreground">
          Speaking
        </span>
      </div>
      <div className="flex items-center gap-4 p-4">
        <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-border bg-secondary-background text-foreground">
          <span className="text-2xl font-heading">2.4</span>
          <span className="text-[10px]">seconds</span>
        </div>
        <div>
          <p className="text-xs">Respond to:</p>
          <p className="mt-1 text-lg font-heading">週末は何をしますか？</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-heading">
            <Mic className="size-4" /> Listening to your answer…
          </div>
        </div>
      </div>
    </LearningWidget>
  );
}

function TranslationWidget() {
  return (
    <LearningWidget>
      <WidgetHeader icon={<Languages className="size-5" />}>Listen & Translate</WidgetHeader>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground">
            <Volume2 className="size-4" />
          </div>
          <p className="font-heading">明日は雨が降るそうです。</p>
        </div>
        <div className="rounded-base border-2 border-border bg-secondary-background p-3 text-sm">
          It looks like it will rain tomorrow.
        </div>
        <div className="flex items-center gap-1 text-xs font-heading text-green-700 dark:text-green-400">
          <Check className="size-4" /> Meaning matched
        </div>
      </div>
    </LearningWidget>
  );
}

function LeaderboardWidget() {
  return (
    <LearningWidget className="bg-main text-main-foreground">
      <div className="flex items-center gap-2 border-b-2 border-border px-4 py-3 font-heading">
        <Trophy className="size-5" /> Weekly leaderboard
      </div>
      <div className="space-y-2 p-4">
        {[
          ["1", "Mika", "1,920"],
          ["2", "Haruto", "1,760"],
          ["3", "You", "1,640"],
        ].map(([rank, name, exp]) => (
          <div
            className={cn(
              "grid grid-cols-[24px_1fr_auto] items-center gap-2 rounded-base border-2 border-border px-3 py-2 text-sm",
              name === "You"
                ? "bg-secondary-background font-heading text-foreground"
                : "bg-main text-main-foreground",
            )}
            key={rank}
          >
            <span>{rank}</span>
            <span>{name}</span>
            <span>{exp} EXP</span>
          </div>
        ))}
      </div>
    </LearningWidget>
  );
}

function HeroLearningStack({ side }: Pick<HeroComponentWallProps, "side">) {
  return (
    <div className="flex flex-col gap-5 px-1.5 pb-5">
      {side === "left" ? (
        <>
          <ShadowingWidget />
          <ProgressWidget />
          <DictationWidget />
          <ReviewWidget />
          <PronunciationWidget />
        </>
      ) : (
        <>
          <AiTutorWidget />
          <ReflexWidget />
          <TranslationWidget />
          <LeaderboardWidget />
          <PronunciationWidget />
        </>
      )}
    </div>
  );
}

export function HeroComponentWall({ className, reverse = false, side }: HeroComponentWallProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-[70px] hidden h-[calc(100%-70px)] w-[340px] overflow-hidden lg:block",
        className,
      )}
    >
      <div className={reverse ? "animate-marquee-up-reverse" : "animate-marquee-up"}>
        <HeroLearningStack side={side} />
        <HeroLearningStack side={side} />
      </div>
    </div>
  );
}
