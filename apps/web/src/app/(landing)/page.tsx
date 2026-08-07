import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  CoreMethodsGrid,
  DecorativeStar,
  FaqSection,
  FinalCta,
  HeroComponentWall,
  InteractivePracticePreview,
  LandingMarquee,
  ProblemSection,
  ProgressMotivationSection,
} from "./_components";

export default function Home() {
  return (
    <>
      <main
        className="landing-grid relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 py-[120px] pt-[190px] md:py-[200px]"
        id="hero"
      >
        <HeroComponentWall className="-left-[200px] xl:-left-[130px]" side="left" />
        <HeroComponentWall className="-right-[200px] xl:-right-[130px]" reverse side="right" />
        <div className="relative z-10 mx-auto w-[1300px] max-w-full">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl leading-normal sm:text-[33px] md:text-5xl xl:text-5xl 2xl:text-6xl">
              Turn Japanese knowledge into <br />
              real{" "}
              <span className="relative mr-0 rounded-base border-2 border-black/40 bg-main/50 px-2 sm:mr-2">
                conversation reflexes.
                <DecorativeStar
                  className="absolute -bottom-2.5 -right-2.5 hidden size-7 sm:block md:-bottom-4 md:-right-5 md:size-[45px]"
                  variant={9}
                />
                <DecorativeStar
                  className="absolute -left-2.5 -top-2.5 hidden size-7 sm:block md:-left-5 md:-top-4 md:size-[45px]"
                  variant={9}
                />
              </span>
            </h1>
            <p className="my-9 w-full max-w-[950px] text-xl leading-snug sm:mb-10 sm:mt-12 md:mb-[60px] md:mt-[50px] md:text-2xl xl:text-2xl 2xl:text-3xl">
              Practice listening, pronunciation, and natural responses with interactive exercises
              and AI-guided conversations.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button
                asChild
                className="h-auto gap-2.5 px-4 py-2 text-base md:px-10 md:py-3 md:text-[22px]"
              >
                <Link href="/register">
                  Start learning
                  <ArrowUpRight className="size-5 md:size-[30px]" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-auto bg-secondary-background px-4 py-2 text-base text-foreground md:px-10 md:py-3 md:text-[22px]"
                variant="neutral"
              >
                <Link href="#methods">Explore methods</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <div className="border-t-4 border-border" id="methods">
        <LandingMarquee />
      </div>
      <ProblemSection />
      <CoreMethodsGrid />
      <InteractivePracticePreview />

      <ProgressMotivationSection />
      <FaqSection />
      <div className="border-b-4 border-border">
        <LandingMarquee content="outcomes" reverse />
      </div>
      <FinalCta />
    </>
  );
}
