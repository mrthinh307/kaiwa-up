"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { type RecorderStatus, useVoiceRecorder } from "../_hooks/use-voice-recorder";

export interface RecorderCardHandle {
  startRecording: () => void;
  status: RecorderStatus;
  stopRecording: () => void;
  toggleRecording: () => void;
}

export interface RecorderCardProps {
  isRecorded?: boolean;
  isSubmitting?: boolean;
  mode?: "segmented" | "continuous";
  onComplete: (data: { audioBlob: Blob | null; durationMs: number; segmentIndex?: number }) => void;
  savedAudioUrl?: string;
  savedDurationSeconds?: number;
  segmentIndex?: number;
  segmentScript?: string;
  totalSegments?: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const RecorderCard = forwardRef<RecorderCardHandle, RecorderCardProps>(function RecorderCard(
  {
    isRecorded = false,
    isSubmitting = false,
    mode = "segmented",
    onComplete,
    savedAudioUrl,
    savedDurationSeconds = 0,
    segmentIndex = 0,
    segmentScript,
    totalSegments,
  },
  ref,
) {
  const {
    audioBlob,
    audioUrl,
    errorMessage,
    recordingTime,
    resetRecording,
    startRecording,
    status,
    stopRecording,
  } = useVoiceRecorder();

  const isContinuous = mode === "continuous";
  const [isPlayingSelf, setIsPlayingSelf] = useState(false);
  const [isReRecording, setIsReRecording] = useState(false);
  const selfAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSubmittedBlobRef = useRef<Blob | null>(null);

  const effectiveAudioUrl = audioUrl || savedAudioUrl;

  useImperativeHandle(
    ref,
    () => ({
      startRecording: () => {
        setIsReRecording(false);
        startRecording();
      },
      status,
      stopRecording,
      toggleRecording: () => {
        if (status === "recording") {
          stopRecording();
        } else {
          setIsReRecording(false);
          startRecording();
        }
      },
    }),
    [startRecording, status, stopRecording],
  );

  // Clean and synchronize audio player when effectiveAudioUrl changes
  useEffect(() => {
    if (!effectiveAudioUrl) return;

    const audio = new Audio(effectiveAudioUrl);
    selfAudioRef.current = audio;

    const handleEnded = () => setIsPlayingSelf(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [effectiveAudioUrl]);

  // When recording completes with a new audioBlob, automatically upload the recording
  useEffect(() => {
    if (status === "recorded" && audioBlob && audioBlob !== lastSubmittedBlobRef.current) {
      lastSubmittedBlobRef.current = audioBlob;
      setIsReRecording(false);
      onComplete({
        audioBlob,
        durationMs: Math.max(recordingTime * 1000, 1000),
        segmentIndex,
      });
    }
  }, [audioBlob, onComplete, recordingTime, segmentIndex, status]);

  const togglePlaySelf = () => {
    if (!selfAudioRef.current && effectiveAudioUrl) {
      selfAudioRef.current = new Audio(effectiveAudioUrl);
      selfAudioRef.current.addEventListener("ended", () => setIsPlayingSelf(false));
    }
    if (!selfAudioRef.current) return;

    if (isPlayingSelf) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    } else {
      selfAudioRef.current
        .play()
        .then(() => setIsPlayingSelf(true))
        .catch(() => setIsPlayingSelf(false));
    }
  };

  const handleReset = () => {
    lastSubmittedBlobRef.current = null;
    setIsReRecording(true);
    resetRecording();
  };

  const hasCompletedRecording =
    !isReRecording &&
    (status === "recorded" || (isRecorded && (savedDurationSeconds > 0 || Boolean(savedAudioUrl))));

  const displayDuration =
    status === "recorded" ? recordingTime : savedDurationSeconds || recordingTime;

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-5 sm:p-6 shadow-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/40 pb-4">
        <div className="flex items-center gap-2 font-heading text-base sm:text-lg">
          <Mic className="size-5 text-main" />
          <span>
            {isContinuous ? "Continuous Voice Shadowing" : `Segment #${segmentIndex + 1} Recording`}
          </span>
          {!isContinuous && totalSegments && (
            <Badge className="font-heading text-xs" variant="neutral">
              {segmentIndex + 1} / {totalSegments}
            </Badge>
          )}
        </div>

        {hasCompletedRecording && (
          <span className="inline-flex items-center gap-1.5 text-xs font-heading text-success">
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin text-main" />
                <span>Saving recording...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Recorded ({formatDuration(displayDuration)})</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Target script prompt to shadow (Segmented mode only) */}
      {!isContinuous && segmentScript && (
        <div className="my-4 rounded-base border-2 border-border bg-background p-4">
          <p className="text-xs font-heading uppercase text-foreground/60 mb-1">
            Target Japanese Speech
          </p>
          <p className="font-heading text-lg sm:text-xl leading-relaxed text-foreground">
            {segmentScript}
          </p>
        </div>
      )}

      {status === "permission_denied" && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Microphone Access Denied</AlertTitle>
          <AlertDescription>
            {errorMessage ??
              "Please allow microphone permissions in your browser settings to practice shadowing."}
          </AlertDescription>
        </Alert>
      )}

      {status === "error" && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Microphone Error</AlertTitle>
          <AlertDescription>{errorMessage ?? "Could not access microphone."}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex flex-col items-center justify-center rounded-base border-2 border-border bg-background p-6 text-center">
        {status === "requesting_permission" && (
          <div className="space-y-2 py-4">
            <p className="animate-pulse font-heading text-base">
              Requesting microphone permission...
            </p>
            <p className="text-xs text-foreground/70">
              Please click &quot;Allow&quot; in your browser popup.
            </p>
          </div>
        )}

        {status === "recording" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex size-4">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-4 rounded-full bg-destructive" />
              </span>
              <span className="font-mono text-2xl font-bold tracking-wider text-destructive">
                {formatDuration(recordingTime)}
              </span>
            </div>

            <p className="text-xs text-foreground/70">
              {isContinuous
                ? "Recording continuously... Shadow along with the lesson audio. (Press R to stop)"
                : `Recording Segment #${segmentIndex + 1}... Speak the sentence clearly. (Press R to stop)`}
            </p>

            <Button
              className="gap-2 bg-destructive text-destructive-foreground font-heading shadow-shadow hover:bg-destructive/90"
              onClick={stopRecording}
              size="lg"
              type="button"
            >
              <Square className="size-4 fill-current" />
              Stop Recording
            </Button>
          </div>
        )}

        {hasCompletedRecording && status !== "recording" && (
          <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-base border-2 border-border bg-secondary-background p-4">
              <div className="flex items-center gap-3">
                <Button
                  aria-label={isPlayingSelf ? "Pause your recording" : "Play your recording"}
                  className="size-12 shrink-0 text-main-foreground"
                  disabled={!effectiveAudioUrl}
                  onClick={togglePlaySelf}
                  size="icon"
                  type="button"
                >
                  {isPlayingSelf ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="ml-0.5 size-5" />
                  )}
                </Button>
                <div className="text-left">
                  <p className="font-heading text-sm">
                    {isContinuous
                      ? "Listen to Continuous Recording"
                      : `Listen to Segment #${segmentIndex + 1} Voice`}
                  </p>
                  <p className="font-mono text-xs text-foreground/70">
                    Duration: {formatDuration(displayDuration)}
                  </p>
                </div>
              </div>

              <Button
                className="gap-1.5 text-xs font-heading"
                onClick={handleReset}
                size="sm"
                type="button"
                variant="neutral"
              >
                <RefreshCw className="size-3.5" />
                Re-record
              </Button>
            </div>
          </div>
        )}

        {!hasCompletedRecording && status === "idle" && (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed">
              {isContinuous
                ? "Click below (or press R) to start your continuous shadowing recording."
                : `Speak aloud and shadow segment #${segmentIndex + 1}. Press R to toggle recording.`}
            </p>
            <Button
              className="gap-2 font-heading"
              onClick={() => {
                setIsReRecording(false);
                startRecording();
              }}
              size="lg"
            >
              <Mic className="size-5" />
              {isContinuous ? "Start Continuous Recording" : `Record Segment #${segmentIndex + 1}`}
            </Button>
          </div>
        )}

        {(status === "permission_denied" || status === "error") && (
          <div className="mt-4">
            <Button className="gap-2 font-heading" onClick={startRecording} variant="neutral">
              <MicOff className="size-4" />
              Retry Microphone Access
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
