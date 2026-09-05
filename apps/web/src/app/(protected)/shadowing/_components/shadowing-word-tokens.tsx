"use client";

import type { ShadowingWordFeedback } from "@kaiwa-app/api-client";

type ShadowingWordTokensProps = {
  fallbackText: string;
  words?: ShadowingWordFeedback[];
};

export function ShadowingWordTokens({ fallbackText, words }: ShadowingWordTokensProps) {
  if (!words || words.length === 0) {
    return (
      <p className="mb-3 font-heading text-lg leading-relaxed text-foreground sm:text-xl">
        {fallbackText}
      </p>
    );
  }

  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 font-heading text-lg leading-relaxed text-foreground sm:text-xl">
      {words.map((word, wordIndex) => {
        if (word.status === "incorrect") {
          return (
            <span
              className="group relative inline-block cursor-help rounded bg-destructive/15 px-1 py-0.5 font-bold text-destructive underline decoration-destructive decoration-wavy underline-offset-4"
              key={wordIndex}
              title={
                word.user_word
                  ? `Recognized: "${word.user_word}" (Expected: "${word.word}")`
                  : `Expected: "${word.word}"`
              }
            >
              {word.word}
              {word.user_word && (
                <span className="absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 flex-col items-center whitespace-nowrap rounded border border-border bg-popover px-2.5 py-1 text-[11px] text-popover-foreground shadow-md group-hover:flex">
                  <span>
                    Recognized: <strong className="text-destructive">{word.user_word}</strong>
                  </span>
                  <span className="text-[10px] text-foreground/60">Expected: {word.word}</span>
                </span>
              )}
            </span>
          );
        }
        if (word.status === "missing") {
          return (
            <span
              className="group relative inline-block cursor-help rounded bg-chart-3/20 px-1 py-0.5 font-bold text-chart-3 underline decoration-chart-3 decoration-dashed underline-offset-4"
              key={wordIndex}
              title={`Missing word: "${word.word}"`}
            >
              {word.word}
              <span className="absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 flex-col items-center whitespace-nowrap rounded border border-border bg-popover px-2.5 py-1 text-[11px] text-popover-foreground shadow-md group-hover:flex">
                <span>
                  Omitted: <strong>{word.word}</strong>
                </span>
              </span>
            </span>
          );
        }
        return (
          <span className="text-foreground" key={wordIndex}>
            {word.word}
          </span>
        );
      })}
    </div>
  );
}
