import { cn } from "@/lib/utils";

import { DecorativeStar } from "./decorative-star";

type MarqueeContentType = "methods" | "outcomes";

type LandingMarqueeProps = {
  content?: MarqueeContentType;
  reverse?: boolean;
};

const marqueeItems = {
  methods: [
    { label: "Dual shadowing", star: 32 },
    { label: "Dictation", star: 22 },
    { label: "3-Second reflex", star: 11 },
    { label: "Smart review", star: 26 },
    { label: "AI tutor 1-on-1", star: 14 },
    { label: "Listen & Translate", star: 20 },
    { label: "Pronunciation analysis", star: 9 },
  ],
  outcomes: [
    { label: "Faster responses", star: 20 },
    { label: "Clearer pronunciation", star: 9 },
    { label: "Stronger listening", star: 32 },
    { label: "Lasting recall", star: 22 },
    { label: "Visible progress", star: 14 },
    { label: "Real conversation confidence", star: 11 },
  ],
} as const;

function MarqueeContent({
  content,
  isDuplicate = false,
}: {
  content: MarqueeContentType;
  isDuplicate?: boolean;
}) {
  return (
    <ul
      aria-hidden={isDuplicate || undefined}
      className="flex shrink-0 items-center gap-[35px] pr-[35px] md:gap-[50px] md:pr-[50px]"
    >
      {marqueeItems[content].map(({ label, star }) => (
        <li className="flex items-center gap-[35px] md:gap-[50px]" key={label}>
          <span>{label}</span>
          <DecorativeStar
            className="size-[30px] shrink-0 md:size-10 lg:size-[50px]"
            variant={star}
          />
        </li>
      ))}
    </ul>
  );
}

export function LandingMarquee({ content = "methods", reverse = false }: LandingMarqueeProps) {
  return (
    <div
      aria-label={content === "methods" ? "KaiwaUp learning methods" : "KaiwaUp learning outcomes"}
      className="overflow-hidden bg-secondary-background py-3 md:py-4"
      role="region"
    >
      <div
        className={cn(
          "flex w-max whitespace-nowrap text-base font-normal sm:text-xl md:text-2xl xl:text-3xl",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
      >
        <MarqueeContent content={content} />
        <MarqueeContent content={content} isDuplicate />
      </div>
    </div>
  );
}
