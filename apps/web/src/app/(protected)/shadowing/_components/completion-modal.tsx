"use client";

import { Award, CheckCircle2, RotateCcw, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ShadowingResult } from "../_validations/shadowing-schemas";

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onReview?: () => void;
  result: ShadowingResult | null;
}

export function CompletionModal({
  isOpen,
  onClose,
  onRetry,
  onReview,
  result,
}: CompletionModalProps) {
  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
            <Award className="size-8" />
          </div>
          <DialogTitle className="font-heading text-2xl">Shadowing Practice Completed!</DialogTitle>
          <DialogDescription className="text-base text-foreground/80">
            Great job! You completed your shadowing repetition and self-comparison.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 flex flex-col items-center justify-center rounded-base border-2 border-border bg-secondary-background p-6 text-center shadow-shadow space-y-2">
          <span className="text-xs font-heading uppercase tracking-wider text-foreground/70">
            Reward Earned
          </span>
          <div className="flex items-center gap-2 text-3xl font-heading text-main">
            <Zap className="size-7 fill-current text-rank-gold" />
            <span>+{result.exp_earned} EXP</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-success font-heading">
            <CheckCircle2 className="size-3.5" />
            Self-Comparison Recorded
          </span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {onReview && (
            <Button
              className="gap-2"
              onClick={() => {
                onClose();
                onReview();
              }}
              variant="default"
            >
              Review Attempt
            </Button>
          )}
          <Button className="gap-2" onClick={onRetry} variant="neutral">
            <RotateCcw className="size-4" />
            Practice Again
          </Button>
          <Button asChild className="gap-2" variant="neutral">
            <Link href="/shadowing">Back to Lessons</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
