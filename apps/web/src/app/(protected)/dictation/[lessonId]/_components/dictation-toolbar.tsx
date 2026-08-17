import type { ReactNode } from "react";

import { Headphones } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DictationToolbarProps = {
  children?: ReactNode;
  difficulty: string;
  lessonTitle: string;
  settings: ReactNode;
};

export function DictationToolbar({
  children,
  difficulty,
  lessonTitle,
  settings,
}: DictationToolbarProps) {
  return (
    <header
      aria-label="Dictation toolbar"
      className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-base border-2 border-border bg-background/95 p-2.5 shadow-shadow backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-3"
    >
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:gap-3">
        <Button asChild className="shrink-0" size="sm" variant="neutral">
          <Link href="/lessons">
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Badge className="shrink-0 font-heading" variant="neutral">
            JLPT {difficulty}
          </Badge>
          <div className="flex min-w-0 items-center gap-1.5">
            <Headphones aria-hidden="true" className="size-3.5 shrink-0 text-foreground/60" />
            <span className="min-w-0 truncate text-xs font-heading text-foreground/80 sm:text-sm">
              {lessonTitle}
            </span>
          </div>
        </div>
      </div>

      <div className="col-start-3 row-start-1 flex items-center gap-2">
        {settings}
        {children}
      </div>
    </header>
  );
}
