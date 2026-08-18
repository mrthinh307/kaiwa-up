"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { parseApiFailure } from "@/lib/api-errors";

import type { ReflexLesson } from "../../_lib/reflex-api";

import { getReflexLesson } from "../../_lib/reflex-api";
import { ReflexPractice } from "./reflex-practice";

type State =
  | { status: "loading" }
  | { message: string; status: "failed" }
  | { lesson: ReflexLesson; status: "success" };

export function ReflexLessonLoader({ lessonId }: { lessonId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const load = useCallback(async () => {
    const response = await getReflexLesson(lessonId);
    if (!response.data) {
      setState({ message: parseApiFailure(response).message, status: "failed" });
      return;
    }
    setState({ lesson: response.data, status: "success" });
  }, [lessonId]);
  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(loadTimer);
  }, [load]);

  const handleRetry = () => {
    setState({ status: "loading" });
    void load();
  };
  if (state.status === "loading")
    return <p className="py-24 text-center font-heading">Preparing your lesson...</p>;
  if (state.status === "failed")
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Unable to load this lesson</AlertTitle>
        <AlertDescription>
          <p>{state.message}</p>
          <Button className="mt-3" onClick={handleRetry} size="sm" variant="neutral">
            <RotateCcw /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  return <ReflexPractice lesson={state.lesson} />;
}
