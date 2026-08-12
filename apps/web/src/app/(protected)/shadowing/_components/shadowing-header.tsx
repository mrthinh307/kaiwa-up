import { ArrowLeft, Mic2, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

interface ShadowingHeaderProps {
  title: string;
}

export function ShadowingHeader({ title }: ShadowingHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-main text-main-foreground" variant="neutral">
            <Mic2 className="mr-1 size-3.5" />
            Shadowing
          </Badge>
          <Badge variant="neutral">JLPT N4</Badge>
          <Badge variant="neutral">
            <Sparkles className="mr-1 size-3.5 text-rank-gold" />
            Self-Comparison
          </Badge>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl">{title}</h1>
        <p className="text-sm text-foreground/80 sm:text-base">
          Listen to the speaker, shadow line by line, and record your voice to compare your
          pronunciation.
        </p>
      </div>

      <Link
        className="inline-flex h-10 items-center justify-center gap-2 rounded-base border-2 border-border bg-background px-4 font-heading text-sm outline-hidden transition-all hover:bg-main hover:text-main-foreground focus-visible:ring-2 focus-visible:ring-ring shrink-0"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>
    </div>
  );
}
