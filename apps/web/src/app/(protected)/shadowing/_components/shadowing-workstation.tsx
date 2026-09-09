"use client";

import type { TranscriptSegment } from "@kaiwa-app/api-client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
} from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { PracticePlaybackBar } from "@/components/common/practice-player/practice-playback-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AudioPlayerState } from "../_hooks/use-audio-player";
import type { RecorderCardHandle } from "./recorder-card";

import { PLAYBACK_RATES } from "../_constants/shadowing-constants";
import { useVoiceRecorder } from "../_hooks/use-voice-recorder";

interface ShadowingWorkstationProps {
  activeSegment?: TranscriptSegment;
  activeSegmentIndex: number;
  hasNextSegment: boolean;
  hasPreviousSegment: boolean;
  isContinuous?: boolean;
  isRecorded?: boolean;
  isSubmitting?: boolean;
  onNextSegment?: () => void;
  onPreviousSegment?: () => void;
  onRecordComplete: (data: {
    audioBlob: Blob | null;
    durationMs: number;
    segmentIndex?: number;
  }) => void;
  onReplaySegment?: () => void;
  onTogglePlay?: () => void;
  player: AudioPlayerState;
  recorderRef: RefObject<RecorderCardHandle | null>;
  savedAudioUrl?: string;
  savedDurationSeconds?: number;
  totalSegments: number;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ShadowingWorkstation({
  activeSegment,
  activeSegmentIndex,
  hasNextSegment,
  hasPreviousSegment,
  isContinuous = false,
  isRecorded = false,
  isSubmitting = false,
  onNextSegment,
  onPreviousSegment,
  onRecordComplete,
  onReplaySegment,
  onTogglePlay,
  player,
  recorderRef,
  savedAudioUrl,
  savedDurationSeconds = 0,
  totalSegments,
}: ShadowingWorkstationProps) {
  // Voice recorder state
  const {
    audioBlob,
    audioUrl,
    errorMessage,
    recordingTime,
    resetRecording,
    startRecording,
    status: recorderStatus,
    stopRecording,
  } = useVoiceRecorder();

  const [isPlayingSelf, setIsPlayingSelf] = useState(false);
  const [isReRecording, setIsReRecording] = useState(false);
  const [isAutoComparing, setIsAutoComparing] = useState(false);
  const selfAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSubmittedBlobRef = useRef<Blob | null>(null);
  const isComparingRef = useRef(false);

  const effectiveAudioUrl = audioUrl || savedAudioUrl;

  // Expose recorder methods to parent via recorderRef
  useImperativeHandle(
    recorderRef,
    () => ({
      startRecording: () => {
        setIsReRecording(false);
        setIsAutoComparing(false);
        if (isPlayingSelf && selfAudioRef.current) {
          selfAudioRef.current.pause();
          setIsPlayingSelf(false);
        }
        if (player.isPlaying) {
          player.pause();
        }
        startRecording();
      },
      status: recorderStatus,
      stopRecording,
      toggleRecording: () => {
        if (recorderStatus === "recording") {
          stopRecording();
        } else {
          setIsReRecording(false);
          setIsAutoComparing(false);
          if (isPlayingSelf && selfAudioRef.current) {
            selfAudioRef.current.pause();
            setIsPlayingSelf(false);
          }
          if (player.isPlaying) {
            player.pause();
          }
          startRecording();
        }
      },
    }),
    [isPlayingSelf, player, recorderStatus, startRecording, stopRecording],
  );

  // Synchronize student self-audio instance
  useEffect(() => {
    if (!effectiveAudioUrl) {
      if (selfAudioRef.current) {
        selfAudioRef.current.pause();
        selfAudioRef.current = null;
      }
      return;
    }

    const audio = new Audio(effectiveAudioUrl);
    selfAudioRef.current = audio;

    const handleEnded = () => {
      setIsPlayingSelf(false);
      setIsAutoComparing(false);
      isComparingRef.current = false;
    };
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [effectiveAudioUrl]);

  // Auto-upload recording when new audioBlob is created
  useEffect(() => {
    if (recorderStatus === "recorded" && audioBlob && audioBlob !== lastSubmittedBlobRef.current) {
      lastSubmittedBlobRef.current = audioBlob;
      setIsReRecording(false);
      onRecordComplete({
        audioBlob,
        durationMs: Math.max(recordingTime * 1000, 1000),
        segmentIndex: isContinuous ? undefined : activeSegmentIndex,
      });
    }
  }, [
    activeSegmentIndex,
    audioBlob,
    isContinuous,
    onRecordComplete,
    recordingTime,
    recorderStatus,
  ]);

  const togglePlaySelf = useCallback(() => {
    if (!effectiveAudioUrl) return;

    if (!selfAudioRef.current) {
      selfAudioRef.current = new Audio(effectiveAudioUrl);
      selfAudioRef.current.addEventListener("ended", () => {
        setIsPlayingSelf(false);
        setIsAutoComparing(false);
        isComparingRef.current = false;
      });
    }

    if (isPlayingSelf) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
      setIsAutoComparing(false);
      isComparingRef.current = false;
    } else {
      if (player.isPlaying) {
        player.pause();
      }
      selfAudioRef.current
        .play()
        .then(() => setIsPlayingSelf(true))
        .catch(() => setIsPlayingSelf(false));
    }
  }, [effectiveAudioUrl, isPlayingSelf, player]);

  const handleResetRecord = () => {
    lastSubmittedBlobRef.current = null;
    setIsReRecording(true);
    setIsAutoComparing(false);
    isComparingRef.current = false;
    if (isPlayingSelf && selfAudioRef.current) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    }
    resetRecording();
  };

  const hasCompletedRecording =
    !isReRecording &&
    (recorderStatus === "recorded" ||
      (isRecorded && (savedDurationSeconds > 0 || Boolean(savedAudioUrl))));

  const displayDuration =
    recorderStatus === "recorded" ? recordingTime : savedDurationSeconds || recordingTime;

  // Segment-relative time calculations for native model player
  const startTime = isContinuous ? 0 : (activeSegment?.start_time_ms ?? 0) / 1000;
  const endTime = isContinuous ? player.duration || 0 : (activeSegment?.end_time_ms ?? 0) / 1000;
  const segmentDuration = isContinuous ? player.duration || 0 : Math.max(0.1, endTime - startTime);
  const relativeCurrentTime = isContinuous
    ? player.currentTime
    : Math.max(0, Math.min(player.currentTime - startTime, segmentDuration));

  const handleSeek = (val: number) => {
    if (isContinuous) {
      player.seek(val);
    } else {
      player.seek(startTime + val);
    }
  };

  const handlePlaybackRateChange = () => {
    const currentRateIndex = PLAYBACK_RATES.indexOf(
      player.playbackRate as (typeof PLAYBACK_RATES)[number],
    );
    const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length] ?? 1;
    player.changePlaybackRate(nextRate);
  };

  // A/B Comparison: Play Model Audio first, then automatically play user voice
  const handleAutoCompare = useCallback(() => {
    if (!effectiveAudioUrl) return;

    if (isAutoComparing) {
      // Cancel comparison
      setIsAutoComparing(false);
      isComparingRef.current = false;
      if (player.isPlaying) player.pause();
      if (isPlayingSelf && selfAudioRef.current) {
        selfAudioRef.current.pause();
        setIsPlayingSelf(false);
      }
      return;
    }

    setIsAutoComparing(true);
    isComparingRef.current = true;
    if (isPlayingSelf && selfAudioRef.current) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    }

    // Play model segment
    if (isContinuous) {
      player.seek(0);
      player.play();
    } else {
      player.playSegment(startTime, endTime);
    }
  }, [effectiveAudioUrl, isAutoComparing, isContinuous, isPlayingSelf, player, startTime, endTime]);

  // Monitor when model playback finishes during auto-comparison to start student voice
  useEffect(() => {
    if (isAutoComparing && !player.isPlaying && isComparingRef.current) {
      if (selfAudioRef.current) {
        selfAudioRef.current.currentTime = 0;
        selfAudioRef.current
          .play()
          .then(() => setIsPlayingSelf(true))
          .catch(() => {
            setIsPlayingSelf(false);
            setIsAutoComparing(false);
            isComparingRef.current = false;
          });
      }
    }
  }, [isAutoComparing, player.isPlaying]);

  return (
    <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow">
      {/* 1. Workstation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border bg-background px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-heading text-base sm:text-lg">
            <Sparkles aria-hidden="true" className="size-4.5 text-main" />
            {isContinuous ? "Continuous Shadowing Studio" : `Segment #${activeSegmentIndex + 1}`}
            {!isContinuous && (
              <span className="text-xs font-normal text-foreground/60 sm:text-sm">
                / {totalSegments}
              </span>
            )}
          </span>

          {/* Status badge */}
          {recorderStatus === "recording" ? (
            <Badge className="gap-1 border-destructive bg-destructive/15 font-heading text-destructive shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-destructive" />
              </span>
              Recording ({formatTime(recordingTime)})
            </Badge>
          ) : hasCompletedRecording ? (
            <Badge className="gap-1 border-status-correct-border bg-status-correct-bg font-heading text-status-correct-text shadow-xs">
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 aria-hidden="true" className="size-3.5 text-status-correct-text" />
                  Recorded ({formatTime(displayDuration)})
                </>
              )}
            </Badge>
          ) : (
            <Badge className="gap-1 opacity-75 font-heading" variant="neutral">
              Pending voice take
            </Badge>
          )}
        </div>

        {/* Timestamp */}
        {!isContinuous && activeSegment && (
          <div className="flex items-center gap-1.5 rounded-base border-2 border-border bg-secondary-background px-2.5 py-0.5 text-xs font-heading tabular-nums text-foreground/75 sm:text-sm">
            <Clock3 aria-hidden="true" className="size-3.5 text-foreground/60" />
            {formatTime(activeSegment.start_time_ms / 1000)}–
            {formatTime(activeSegment.end_time_ms / 1000)}
          </div>
        )}
      </div>

      {/* 2. Hero Target Japanese Text */}
      {!isContinuous && activeSegment?.script && (
        <div className="border-b-2 border-border bg-background/60 p-4 sm:p-6">
          <p className="mb-2 text-xs font-heading uppercase tracking-wider text-foreground/60">
            Target Japanese Speech
          </p>
          <p className="font-heading text-xl leading-relaxed text-foreground sm:text-2xl md:text-[26px]">
            {activeSegment.script}
          </p>
        </div>
      )}

      {/* Error alert if audio fails */}
      {player.hasError && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Audio Playback Error</AlertTitle>
            <AlertDescription>
              Could not stream the lesson audio. You can still record your voice below.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* 3. Track 1: Native Model Audio (Shared Modern Playback Bar) */}
      <PracticePlaybackBar
        currentTime={relativeCurrentTime}
        duration={segmentDuration}
        isLoopEnabled={player.isLoopEnabled}
        isMuted={player.isMuted}
        isPlaying={player.isPlaying}
        label={
          <>
            <Headphones aria-hidden="true" className="size-3.5 text-main" />
            Track 1: Native Model Audio
          </>
        }
        onLoopToggle={isContinuous ? undefined : player.toggleLoop}
        onPlaybackRateChange={handlePlaybackRateChange}
        onReplay={onReplaySegment ?? (() => player.seek(startTime))}
        onSeek={handleSeek}
        onToggleMute={player.toggleMute}
        onTogglePlay={onTogglePlay ?? player.togglePlay}
        onVolumeChange={player.setVolume}
        playbackRate={player.playbackRate}
        showLoop={!isContinuous}
        volume={player.volume}
      />

      {/* 4. Track 2: Student Voice Studio & Recording Deck */}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wide text-foreground/70">
            <Mic aria-hidden="true" className="size-3.5 text-destructive" />
            Track 2: Your Voice Take
          </span>

          {hasCompletedRecording && (
            <Button
              className="h-7 gap-1.5 text-xs font-heading"
              onClick={handleResetRecord}
              size="sm"
              type="button"
              variant="neutral"
            >
              <RefreshCw className="size-3" />
              Re-record (R)
            </Button>
          )}
        </div>

        {/* Recording States */}
        {recorderStatus === "permission_denied" && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Microphone Access Denied</AlertTitle>
            <AlertDescription>
              {errorMessage ??
                "Please allow microphone permissions in your browser to record your shadowing voice."}
            </AlertDescription>
          </Alert>
        )}

        {recorderStatus === "error" && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Microphone Error</AlertTitle>
            <AlertDescription>{errorMessage ?? "Could not access microphone."}</AlertDescription>
          </Alert>
        )}

        {/* State A: Currently Recording */}
        {recorderStatus === "recording" && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-base border-2 border-destructive/50 bg-destructive/5 p-5 text-center sm:p-6">
            <div className="flex items-center gap-3">
              <span className="relative flex size-4">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-4 rounded-full bg-destructive" />
              </span>
              <span className="font-mono text-3xl font-bold tracking-wider text-destructive">
                {formatTime(recordingTime)}
              </span>
            </div>

            <p className="text-xs text-foreground/80 sm:text-sm">
              {isContinuous
                ? "Recording continuously... Speak clearly and shadow the lesson audio. (Press R to stop)"
                : `Recording Segment #${activeSegmentIndex + 1}... Shadow with clear rhythm. (Press R to stop)`}
            </p>

            <Button
              className="gap-2 bg-destructive text-destructive-foreground font-heading shadow-shadow hover:bg-destructive/90"
              onClick={stopRecording}
              size="lg"
              type="button"
            >
              <Square className="size-4 fill-current" />
              Stop Recording (Press R)
            </Button>
          </div>
        )}

        {/* State B: Recorded Successfully (Voice Playback & A/B Compare) */}
        {hasCompletedRecording && recorderStatus !== "recording" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-base border-2 border-border bg-background p-3 sm:px-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  aria-label={isPlayingSelf ? "Pause your recording" : "Play your recording"}
                  className="size-10 shrink-0 text-main-foreground shadow-xs"
                  disabled={!effectiveAudioUrl}
                  onClick={togglePlaySelf}
                  size="icon"
                  type="button"
                >
                  {isPlayingSelf ? (
                    <Pause className="size-4.5" />
                  ) : (
                    <Play className="ml-0.5 size-4.5" />
                  )}
                </Button>
                <div className="text-left">
                  <p className="font-heading text-sm text-foreground">
                    {isContinuous
                      ? "Continuous Practice Voice"
                      : `Segment #${activeSegmentIndex + 1} Voice Take`}
                  </p>
                  <p className="font-mono text-xs text-foreground/60">
                    Duration: {formatTime(displayDuration)}
                  </p>
                </div>
              </div>

              {/* 5. Dual-Audio A/B Comparison Trigger */}
              <Button
                aria-label="Compare native model vs your voice"
                className={cn(
                  "w-full sm:w-auto gap-2 font-heading text-xs sm:text-sm",
                  isAutoComparing && "border-main bg-main/20 text-foreground ring-2 ring-main/30",
                )}
                disabled={!effectiveAudioUrl}
                onClick={handleAutoCompare}
                type="button"
                variant={isAutoComparing ? "default" : "neutral"}
              >
                <ArrowRightLeft
                  aria-hidden="true"
                  className={cn("size-3.5", isAutoComparing && "animate-spin")}
                />
                {isAutoComparing ? "Comparing A/B (Playing...)" : "Compare: Native vs You"}
              </Button>
            </div>
          </div>
        )}

        {/* State C: Idle / Pending Record */}
        {!hasCompletedRecording && recorderStatus === "idle" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-base border-2 border-dashed border-border/80 bg-background/50 p-5 text-center sm:p-6">
            <p className="text-xs text-foreground/75 sm:text-sm leading-relaxed max-w-md">
              {isContinuous
                ? "Click below or press R to start recording your continuous speech shadowing."
                : `Ready to speak aloud? Shadow segment #${activeSegmentIndex + 1} and press R to toggle recording.`}
            </p>
            <Button
              className="gap-2 font-heading shadow-shadow hover:scale-[1.02] transition-transform"
              onClick={() => {
                setIsReRecording(false);
                startRecording();
              }}
              size="lg"
              type="button"
            >
              <Mic className="size-4.5" />
              {isContinuous
                ? "Start Continuous Recording (R)"
                : `Record Segment #${activeSegmentIndex + 1} (R)`}
            </Button>
          </div>
        )}

        {/* Permission / Error Retry Button */}
        {(recorderStatus === "permission_denied" || recorderStatus === "error") && (
          <div className="mt-2 text-center">
            <Button className="gap-2 font-heading" onClick={startRecording} variant="neutral">
              <MicOff className="size-4" />
              Retry Microphone Access
            </Button>
          </div>
        )}
      </div>

      {/* 6. Footer Navigation Bar */}
      {!isContinuous && (
        <div className="flex items-center justify-between border-t-2 border-border bg-background px-4 py-3 sm:px-5">
          <Button
            aria-label="Previous segment (←)"
            className="gap-1.5 font-heading text-xs sm:text-sm"
            disabled={!hasPreviousSegment}
            onClick={onPreviousSegment}
            size="sm"
            type="button"
            variant="neutral"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Previous (←)</span>
          </Button>

          <span className="font-mono text-xs text-foreground/60 hidden sm:inline">
            Use ← and → keys to switch segments
          </span>

          <Button
            aria-label="Next segment (→)"
            className="gap-1.5 font-heading text-xs sm:text-sm"
            disabled={!hasNextSegment}
            onClick={onNextSegment}
            size="sm"
            type="button"
            variant="neutral"
          >
            <span>Next (→)</span>
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
