import type { ReactNode } from "react";

import { ArrowLeft, MessageCircleMore } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AuthPageShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  japaneseLine: string;
  japaneseTranslation: string;
  title: string;
};

export function AuthPageShell({
  children,
  description,
  eyebrow,
  japaneseLine,
  japaneseTranslation,
  title,
}: AuthPageShellProps) {
  return (
    <main className="landing-grid flex min-h-dvh items-center px-5 py-20 sm:px-8 lg:px-20 lg:py-6">
      <div className="relative mx-auto w-full max-w-[1180px]">
        <Button
          aria-label="Back to home"
          asChild
          className="absolute -top-14 left-0 z-30 bg-secondary-background text-foreground lg:-left-14 lg:top-0"
          size="icon"
          title="Back to home"
          variant="neutral"
        >
          <Link href="/">
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        </Button>

        <div className="grid w-full overflow-hidden border-4 border-border bg-secondary-background shadow-shadow lg:min-h-[min(680px,calc(100dvh-48px))] lg:grid-cols-[1.04fr_0.96fr]">
          <section className="landing-grid-dark relative flex flex-col overflow-hidden border-b-4 border-border bg-main p-6 text-main-foreground sm:p-8 lg:border-b-0 lg:border-r-4 lg:p-12 [@media(max-height:760px)]:py-8">
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-8 size-28 rotate-12 border-4 border-border bg-background/70"
            />
            <div className="relative z-10 mt-8 [@media(max-height:760px)]:mt-5">
              <Badge className="mb-5 bg-background text-foreground shadow-shadow" variant="neutral">
                {eyebrow}
              </Badge>
              <h1 className="max-w-[520px] text-3xl leading-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-[500px] text-base leading-relaxed sm:text-lg">
                {description}
              </p>
            </div>

            <div className="relative z-10 mt-8 hidden lg:block [@media(max-height:760px)]:mt-6">
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 size-full border-2 border-border bg-foreground"
              />
              <div className="relative border-2 border-border bg-secondary-background p-6 text-foreground [@media(max-height:760px)]:p-5">
                <div className="flex items-center gap-2 text-sm font-heading uppercase tracking-[0.12em]">
                  <MessageCircleMore aria-hidden="true" className="size-5" />
                  Today&apos;s conversation cue
                </div>
                <p
                  className="mt-5 text-3xl leading-relaxed [@media(max-height:760px)]:mt-4 [@media(max-height:760px)]:text-2xl"
                  lang="ja"
                >
                  {japaneseLine}
                </p>
                <p className="mt-2 text-sm text-foreground/70">{japaneseTranslation}</p>
              </div>
            </div>
          </section>

          <section className="flex items-center bg-secondary-background p-5 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-[500px]">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
