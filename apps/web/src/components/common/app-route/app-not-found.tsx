"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AppNotFound() {
  const router = useRouter();

  return (
    <main className="landing-grid flex min-h-dvh items-center px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="grid overflow-hidden rounded-base border-4 border-border bg-secondary-background shadow-shadow lg:min-h-[620px] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative flex flex-col justify-between overflow-hidden border-b-4 border-border bg-main p-6 text-main-foreground sm:p-9 lg:border-r-4 lg:border-b-0 lg:p-12">
            <Link
              aria-label="KaiwaUp home"
              className="relative z-10 inline-flex w-fit items-center gap-3 font-heading outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/"
            >
              <span className="flex size-11 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-2xl text-foreground shadow-shadow">
                K
              </span>
              <span className="text-2xl">KaiwaUp</span>
            </Link>

            <div aria-hidden="true" className="py-8 lg:py-0">
              <p className="text-[clamp(6rem,18vw,12rem)] leading-none tracking-[-0.08em]">404</p>
            </div>

            <div className="relative z-10 border-2 border-border bg-secondary-background p-5 text-foreground shadow-shadow sm:p-6">
              <p className="text-2xl leading-relaxed sm:text-3xl" lang="ja">
                ページが見つかりません。
              </p>
              <p className="mt-2 text-sm text-foreground/70">This page could not be found.</p>
            </div>
          </section>

          <section className="flex items-center p-6 sm:p-9 lg:p-12">
            <div className="w-full max-w-[560px]">
              <Badge className="gap-2 shadow-shadow" variant="neutral">
                <SearchX aria-hidden="true" />
                Page not found
              </Badge>
              <h1 className="mt-7 text-3xl leading-tight sm:text-4xl lg:text-5xl">
                This page wandered off course.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-foreground/75 sm:text-lg">
                The address may be incorrect, or the page may have moved. Head back home or continue
                from your learning dashboard.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.back()} type="button">
                  <ArrowLeft aria-hidden="true" />
                  I&apos;m back, I&apos;m back
                </Button>
              </div>

              <div className="mt-9 border-t-2 border-border pt-6">
                <p className="font-heading">Still looking for something?</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                  Check the URL for a typo, then use the main navigation to find the lesson or page
                  you need.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
