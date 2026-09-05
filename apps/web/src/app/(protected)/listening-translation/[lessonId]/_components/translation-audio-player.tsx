"use client";

import { AlertCircle, Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import { useTranslationAudioPlayer } from "../_hooks/use-translation-audio-player";

type TranslationAudioPlayerProps = {
  audioUrl: string | null;
  lessonTitle: string;
};

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TranslationAudioPlayer({ audioUrl, lessonTitle }: TranslationAudioPlayerProps) {
  const {
    currentTime,
    duration,
    errorMessage,
    handleNativeDurationChange,
    handleNativeEnded,
    handleNativeError,
    handleNativeLoadedMetadata,
    handleNativePause,
    handleNativePlay,
    handleNativeTimeUpdate,
    handlePlayPause,
    handleReplay,
    handleSeek,
    handleVolumeChange,
    isControlDisabled,
    isPlaying,
    nativeAudioRef,
    volume,
    youtubeHostRef,
    youtubeVideoId,
  } = useTranslationAudioPlayer({ audioUrl });

  return (
    <section aria-labelledby="translation-audio-heading">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
          <Headphones aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
            Listening prompt
          </p>
          <h2 className="font-heading text-xl" id="translation-audio-heading">
            Listen before you translate
          </h2>
        </div>
      </div>

      {errorMessage ? (
        <Alert className="mt-5" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Audio unavailable</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 rounded-base border-2 border-border bg-background p-4 sm:p-5">
        {youtubeVideoId ? (
          <div aria-hidden="true" className="absolute size-px overflow-hidden" tabIndex={-1}>
            <div ref={youtubeHostRef} />
          </div>
        ) : audioUrl ? (
          <audio
            className="hidden"
            onDurationChange={handleNativeDurationChange}
            onEnded={handleNativeEnded}
            onError={handleNativeError}
            onLoadedMetadata={handleNativeLoadedMetadata}
            onPause={handleNativePause}
            onPlay={handleNativePlay}
            onTimeUpdate={handleNativeTimeUpdate}
            preload="metadata"
            ref={nativeAudioRef}
            src={audioUrl}
          />
        ) : null}

        <div className="flex items-center gap-3">
          <Button
            aria-label={isPlaying ? "Pause lesson audio" : "Play lesson audio"}
            disabled={isControlDisabled}
            onClick={handlePlayPause}
            size="icon"
            type="button"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-5" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 size-5" />
            )}
          </Button>
          <Button
            aria-label="Replay lesson audio from the beginning"
            disabled={isControlDisabled}
            onClick={handleReplay}
            size="icon"
            type="button"
            variant="neutral"
          >
            <RotateCcw aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs font-heading tabular-nums">
              <span className="truncate">{lessonTitle}</span>
              <span className="shrink-0 text-foreground/60">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <Slider
              aria-label="Audio playback position"
              className="mt-3"
              disabled={isControlDisabled}
              max={Math.max(duration, 1)}
              min={0}
              onValueChange={handleSeek}
              step={0.1}
              value={[Math.min(currentTime, Math.max(duration, 1))]}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t-2 border-border pt-4">
          <Volume2 aria-hidden="true" className="size-5 shrink-0" />
          <Slider
            aria-label={`Audio volume ${Math.round(volume)} percent`}
            disabled={isControlDisabled}
            max={100}
            min={0}
            onValueChange={handleVolumeChange}
            step={1}
            value={[volume]}
          />
          <span className="w-10 text-right text-xs font-heading tabular-nums">{volume}%</span>
        </div>
      </div>
    </section>
  );
}
