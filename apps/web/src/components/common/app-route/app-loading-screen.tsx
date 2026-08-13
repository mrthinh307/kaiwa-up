import { LoaderCircle } from "lucide-react";

type AppLoadingScreenProps = {
  description?: string;
  title?: string;
};

export function AppLoadingScreen({
  description = "We’re preparing your learning space. This should only take a moment.",
  title = "Getting your practice ready",
}: AppLoadingScreenProps) {
  return (
    <main
      aria-busy="true"
      aria-label={title}
      className="landing-grid relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-14 sm:px-8"
    >
      <div
        aria-hidden="true"
        className="absolute -left-12 top-16 size-32 rotate-12 border-4 border-border bg-main shadow-shadow sm:left-[8%] sm:size-40"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-14 -right-10 size-36 -rotate-12 border-4 border-border bg-secondary-background shadow-shadow sm:right-[10%] sm:size-48"
      />

      <section
        aria-live="polite"
        className="relative z-10 w-full max-w-xl rounded-base border-4 border-border bg-secondary-background p-6 shadow-shadow sm:p-9"
      >
        <div className="flex items-center gap-3 border-b-2 border-border pb-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-2xl font-heading text-main-foreground shadow-shadow">
            K
          </span>
          <div>
            <p className="text-xl font-heading">KaiwaUp</p>
            <p className="text-sm text-foreground/65" lang="ja">
              会話の準備中
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center py-8 text-center sm:py-10">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
            <LoaderCircle
              aria-hidden="true"
              className="size-8 animate-spin motion-reduce:animate-none"
            />
          </span>
          <h1 className="mt-7 text-2xl leading-tight sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-md leading-relaxed text-foreground/70">{description}</p>

          <div aria-hidden="true" className="mt-7 flex items-center gap-2">
            <span className="size-3 animate-pulse rounded-full border-2 border-border bg-main motion-reduce:animate-none" />
            <span className="size-3 animate-pulse rounded-full border-2 border-border bg-secondary-background motion-reduce:animate-none" />
            <span className="size-3 animate-pulse rounded-full border-2 border-border bg-main motion-reduce:animate-none" />
          </div>
        </div>

        <p className="border-t-2 border-border pt-5 text-center text-sm text-foreground/65">
          <span className="font-heading" lang="ja">
            ちょっと待ってね。
          </span>{" "}
          Just a moment.
        </p>
      </section>
    </main>
  );
}
