"use client";

import {
  AlertCircle,
  ArrowLeft,
  Headphones,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import Link from "next/link";

import { AiRequestPanel } from "@/components/common/ai-request/ai-request-panel";
import { AI_REQUEST_IDLE_STATE } from "@/components/common/ai-request/ai-request-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReflexLesson } from "../../_lib/reflex-api";

import { useReflexSession } from "../_hooks/use-reflex-session";
import { ReflexResult } from "./reflex-result";

export function ReflexPractice({ lesson }: { lesson: ReflexLesson }) {
  const {
    aiRequestState,
    audioRef,
    countdown,
    errorMessage,
    handleAudioEnded,
    handleAudioError,
    handlePracticeAgain,
    handleRecordingPlaybackEnded,
    handleStart,
    handleStop,
    handleSubmit,
    isPlayingRecording,
    phase,
    recordingUrl,
    recordedAudio,
    recordingPlaybackRef,
    result,
    toggleRecordingPlayback,
  } = useReflexSession(lesson);

  if (phase === "result" && result) {
    return <ReflexResult onPracticeAgain={handlePracticeAgain} result={result} />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild size="sm" variant="neutral">
          <Link href="/reflex">
            <ArrowLeft /> Lesson list
          </Link>
        </Button>
        <span className="text-sm font-heading">
          Limit: {lesson.response_start_limit_seconds} seconds
        </span>
      </div>
      {phase !== "processing" && (
        <Card className="overflow-hidden py-0">
          <div className="border-b-2 border-border bg-main p-6 sm:p-8">
            <p className="mb-3 flex items-center gap-2 text-sm font-heading uppercase">
              <Headphones className="size-4" /> {lesson.scenario_ja}
            </p>
            <h1 className="text-2xl leading-relaxed font-heading sm:text-4xl" lang="ja">
              {lesson.prompt_ja}
            </h1>
          </div>
          <CardContent className="grid min-h-80 place-items-center py-10 text-center">
            <audio
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              preload="metadata"
              ref={audioRef}
              src={lesson.audio_url}
            />
            <div className="grid max-w-xl justify-items-center gap-6">
              {phase === "playing" && (
                <>
                  <Volume2 className="size-14 animate-pulse" />
                  <p className="text-xl font-heading">Listen to the question...</p>
                </>
              )}
              {phase === "thinking" && (
                <>
                  <div
                    className={cn(
                      "grid size-32 place-items-center rounded-full border-4 border-border text-5xl font-heading",
                      countdown === 0 ? "bg-chart-3" : "bg-main",
                    )}
                  >
                    {countdown.toFixed(1)}
                  </div>
                  <p aria-live="polite" className="text-xl font-heading">
                    Think about your answer
                  </p>
                  <p className="text-sm text-foreground/70">
                    Recording starts automatically when the timer reaches zero.
                  </p>
                </>
              )}
              {phase === "recording" && (
                <>
                  <div className="grid size-32 place-items-center rounded-full border-4 border-border bg-chart-2">
                    <Mic className="size-14" />
                  </div>
                  <p aria-live="polite" className="flex items-center gap-2 text-xl font-heading">
                    Recording your answer
                  </p>
                  <Button onClick={handleStop} variant="neutral">
                    <Square /> Stop recording
                  </Button>
                </>
              )}
              {phase === "ready" && (
                <>
                  <Mic className="size-14" />
                  <p className="text-lg">
                    Listen first, then take three seconds to think. Recording starts automatically
                    after the countdown.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {recordedAudio ? (
                      <>
                        <audio
                          onEnded={handleRecordingPlaybackEnded}
                          ref={recordingPlaybackRef}
                          src={recordingUrl ?? undefined}
                        />
                        <Button onClick={toggleRecordingPlayback} variant="neutral">
                          {isPlayingRecording ? <Pause /> : <Play />}
                          {isPlayingRecording ? "Pause playback" : "Play recording"}
                        </Button>
                        <Button onClick={handleStart} variant="neutral">
                          <RotateCcw /> Record again
                        </Button>
                        <Button disabled={!recordedAudio} onClick={handleSubmit}>
                          <Send /> Submit for evaluation
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleStart}>
                        <Mic /> Start
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <AiRequestPanel
        failedTitle="AI evaluation failed"
        onRetry={recordedAudio ? handleSubmit : undefined}
        processingDescription="Keep this page open while your recording is evaluated. The request will not be submitted twice."
        processingTitle="AI is analyzing your answer"
        state={aiRequestState.status === "success" ? AI_REQUEST_IDLE_STATE : aiRequestState}
      />
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>
            <p>{errorMessage}</p>
            {recordedAudio && (
              <Button className="mt-3" onClick={handleSubmit} size="sm" variant="neutral">
                <RotateCcw /> Retry submission
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
