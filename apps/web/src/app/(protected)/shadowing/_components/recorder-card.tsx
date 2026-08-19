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
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useVoiceRecorder } from "../_hooks/use-voice-recorder";

interface RecorderCardProps {
  isSubmitting?: boolean;
  onComplete: (data: { audioBlob: Blob | null; durationMs: number }) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecorderCard({ isSubmitting = false, onComplete }: RecorderCardProps) {
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

  const [isPlayingSelf, setIsPlayingSelf] = useState(false);
  const selfAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSubmittedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    selfAudioRef.current = audio;

    const handleEnded = () => setIsPlayingSelf(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // When recording completes with a new audioBlob, automatically upload the segment recording
  useEffect(() => {
    if (status === "recorded" && audioBlob && audioBlob !== lastSubmittedBlobRef.current) {
      lastSubmittedBlobRef.current = audioBlob;
      onComplete({
        audioBlob,
        durationMs: Math.max(recordingTime * 1000, 1000),
      });
    }
  }, [audioBlob, onComplete, recordingTime, status]);

  const togglePlaySelf = () => {
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
    resetRecording();
  };

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading text-lg">
          <Mic className="size-5 text-main" />
          <span>Your Recording & Self-Comparison</span>
        </div>

        {status === "recorded" && (
          <span className="inline-flex items-center gap-1 text-xs font-heading text-success">
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin text-main" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Recorded ({formatDuration(recordingTime)})
              </>
            )}
          </span>
        )}
      </div>

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

      <div className="mt-6 flex flex-col items-center justify-center rounded-base border-2 border-border bg-background p-6 text-center">
        {status === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/75">
              Click the button below to start recording your voice for this segment.
            </p>
            <Button className="gap-2 font-heading" onClick={startRecording} size="lg">
              <Mic className="size-5" />
              Start Recording
            </Button>
          </div>
        )}

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
              <span className="font-mono text-2xl font-bold tracking-wider">
                {formatDuration(recordingTime)}
              </span>
            </div>

            <p className="text-xs text-foreground/70">
              Recording in progress... Speak along with the Japanese text.
            </p>

            <Button
              className="gap-2 bg-destructive text-destructive-foreground font-heading"
              onClick={stopRecording}
              variant="neutral"
            >
              <Square className="size-4 fill-current" />
              Stop Recording
            </Button>
          </div>
        )}

        {status === "recorded" && (
          <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-base border-2 border-border bg-secondary-background p-4">
              <div className="flex items-center gap-3">
                <Button
                  aria-label={isPlayingSelf ? "Pause your recording" : "Play your recording"}
                  className="size-12 shrink-0 text-main-foreground"
                  onClick={togglePlaySelf}
                  size="icon"
                >
                  {isPlayingSelf ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="ml-0.5 size-5" />
                  )}
                </Button>
                <div className="text-left">
                  <p className="font-heading text-sm">Listen to Your Voice</p>
                  <p className="font-mono text-xs text-foreground/70">
                    Duration: {formatDuration(recordingTime)}
                  </p>
                </div>
              </div>

              <Button
                className="gap-1.5 text-xs font-heading"
                onClick={handleReset}
                size="sm"
                variant="neutral"
              >
                <RefreshCw className="size-3.5" />
                Re-record
              </Button>
            </div>
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
}
