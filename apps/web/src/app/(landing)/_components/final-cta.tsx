import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { DecorativeStar } from "./decorative-star";

const ctaBenefits = ["Practice at your pace", "Track every win", "Speak with useful feedback"];

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="landing-grid-dark relative flex w-full flex-col items-center justify-center overflow-hidden border-b-4 border-border bg-main px-5 py-24 text-main-foreground md:py-32 lg:py-40"
      id="get-started"
    >
      <DecorativeStar
        className="absolute -left-12 -top-12 hidden size-52 opacity-25 md:block"
        variant={14}
      />
      <DecorativeStar
        className="absolute -bottom-14 -right-12 hidden size-56 opacity-25 md:block"
        variant={20}
      />

      <div className="relative z-10 mx-auto flex max-w-[1050px] flex-col items-center text-center">
        <p className="mb-6 inline-flex border-2 border-border bg-background px-3 py-1 font-heading text-sm text-foreground shadow-shadow sm:text-base">
          YOUR NEXT CONVERSATION STARTS HERE
        </p>
        <h2
          className="text-3xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
          id="final-cta-heading"
        >
          Stop translating in your head. Start responding in Japanese.
        </h2>
        <p className="mt-7 max-w-[760px] text-lg leading-relaxed sm:text-xl md:text-2xl">
          Build the listening, pronunciation, and response skills that make real conversations feel
          possible.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-auto gap-2.5 bg-background px-6 py-3 text-lg text-foreground md:px-10 md:py-4 md:text-[22px]"
            variant="neutral"
          >
            <Link href="/register">
              Create your account
              <ArrowUpRight className="size-5 md:size-7" />
            </Link>
          </Button>
          <Button
            asChild
            className="h-auto bg-main px-6 py-3 text-lg text-main-foreground md:px-10 md:py-4 md:text-[22px]"
          >
            <Link href="#core-methods">Explore the methods</Link>
          </Button>
        </div>

        <ul className="mt-10 flex flex-col items-center gap-3 text-base sm:flex-row sm:gap-6 sm:text-lg">
          {ctaBenefits.map((benefit) => (
            <li className="flex items-center gap-2" key={benefit}>
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-border bg-background text-foreground">
                <Check aria-hidden="true" className="size-4" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
