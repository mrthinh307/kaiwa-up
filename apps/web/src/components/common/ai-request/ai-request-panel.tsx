"use client";

import { AlertCircle, LoaderCircle, RotateCcw } from "lucide-react";

import type { AiRequestState } from "@/components/common/ai-request/ai-request-state";

import { AiRequestResult } from "@/components/common/ai-request/ai-request-result";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AiRequestPanelProps = {
  failedTitle?: string;
  onRetry?: () => void;
  processingDescription?: string;
  processingTitle?: string;
  resultTitle?: string;
  state: AiRequestState;
};

export function AiRequestPanel({
  failedTitle = "AI request failed",
  onRetry,
  processingDescription = "This can take a moment. You can stay on this page while the result is prepared.",
  processingTitle = "AI is processing your request",
  resultTitle,
  state,
}: AiRequestPanelProps) {
  switch (state.status) {
    case "idle":
      return null;
    case "processing":
      return (
        <Card
          aria-busy="true"
          aria-live="polite"
          className="bg-secondary-background"
          data-ai-request-status="processing"
          role="status"
        >
          <CardContent className="grid gap-5">
            <div className="flex items-start gap-3">
              <LoaderCircle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 animate-spin motion-reduce:animate-none"
              />
              <div className="grid gap-1">
                <p className="font-heading">{processingTitle}</p>
                <p className="text-sm leading-relaxed text-foreground/70">
                  {processingDescription}
                </p>
              </div>
            </div>
            <div aria-hidden="true" className="grid gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>
      );
    case "success":
      return <AiRequestResult result={state.result} title={resultTitle} />;
    case "failed":
      return (
        <Alert data-ai-request-status="failed" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{failedTitle}</AlertTitle>
          <AlertDescription>
            <p>{state.errorMessage}</p>
            {onRetry && (
              <Button className="mt-3" onClick={onRetry} size="sm" type="button" variant="neutral">
                <RotateCcw aria-hidden="true" />
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
  }
}
