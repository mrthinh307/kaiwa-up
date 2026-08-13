"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ShadowingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shadowing practice error:", error);
  }, [error]);

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12 lg:py-14">
      <div className="mx-auto flex max-w-[600px] flex-col items-center justify-center rounded-base border-2 border-border bg-secondary-background p-8 text-center shadow-shadow space-y-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="font-heading text-xl">Shadowing Session Error</h2>
        <p className="text-sm text-foreground/80">
          Something went wrong while loading the shadowing practice interface.
        </p>
        <Button className="gap-2" onClick={() => reset()} variant="neutral">
          <RotateCcw className="size-4" />
          Try Again
        </Button>
      </div>
    </main>
  );
}
