"use client";

import {
  AlertCircle,
  Gauge,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { PLAYBACK_RATES } from "../_constants/shadowing-constants";
import { type AudioPlayerState, useAudioPlayer } from "../_hooks/use-audio-player";

interface AudioPlayerCardProps {
  audioUrl: string;
  durationSeconds?: number | null;
  hasNextSegment?: boolean;
  hasPreviousSegment?: boolean;
  mode?: "segmented" | "continuous";
  onNextSegment?: () => void;
  onPreviousSegment?: () => void;
  onTogglePlay?: () => void;
  player?: AudioPlayerState;
  showVideo?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayerCard({
  audioUrl,
  durationSeconds,
  hasNextSegment = false,
  hasPreviousSegment = false,
  mode = "segmented",
  onNextSegment,
  onPreviousSegment,
  onTogglePlay,
  player: externalPlayer,
  showVideo = false,
}: AudioPlayerCardProps) {
  const internalPlayer = useAudioPlayer(audioUrl, durationSeconds ?? 0);
  const player = externalPlayer ?? internalPlayer;

  const isContinuous = mode === "continuous";

  const {
    changePlaybackRate,
    currentTime,
    duration,
    handleIframeLoad,
    hasError,
    iframeRef,
    isMuted,
    isPlaying,
    isYouTube,
    playbackRate,
    seek,
    setVolume,
    toggleMute,
    togglePlay,
    volume,
    youtubeVideoId,
  } = player;

  const handlePlaybackRateChange = () => {
    const currentRateIndex = PLAYBACK_RATES.indexOf(
      playbackRate as (typeof PLAYBACK_RATES)[number],
    );
    const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length] ?? 1;
    changePlaybackRate(nextRate);
  };

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-5 sm:p-6 shadow-shadow">
      {isYouTube &&
        youtubeVideoId &&
        (showVideo ? (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-base border-2 border-border bg-black shadow-xs">
            <iframe
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="pointer-events-none absolute inset-0 size-full border-0"
              onLoad={handleIframeLoad}
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
              title="Shadowing lesson video"
            />
          </div>
        ) : (
          <div className="sr-only">
            <iframe
              allow="autoplay; encrypted-media; picture-in-picture"
              aria-hidden="true"
              className="size-px border-0"
              onLoad={handleIframeLoad}
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
              tabIndex={-1}
              title="Shadowing lesson audio"
            />
          </div>
        ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading text-base sm:text-lg">
          <Headphones className="size-5 text-main" />
          <span>Original Lesson Audio</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Volume Control Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label={isMuted ? "Unmute audio" : "Adjust volume"}
                className="size-8 gap-1.5 font-heading text-xs"
                size="icon"
                type="button"
                variant="neutral"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX aria-hidden="true" className="size-4" />
                ) : volume < 50 ? (
                  <Volume1 aria-hidden="true" className="size-4" />
                ) : (
                  <Volume2 aria-hidden="true" className="size-4" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" side="bottom">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-heading">
                  <span>Volume</span>
                  <span>{isMuted ? "0%" : `${Math.round(volume)}%`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="size-7 shrink-0"
                    onClick={toggleMute}
                    size="icon"
                    type="button"
                    variant="neutral"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </Button>
                  <Slider
                    aria-label="Volume slider"
                    max={100}
                    min={0}
                    onValueChange={(values) => {
                      const val = values[0];
                      if (typeof val === "number") setVolume(val);
                    }}
                    step={1}
                    value={[isMuted ? 0 : volume]}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Playback Speed Cycling Button */}
          <Button
            aria-label={`Playback speed ${playbackRate}x. Change playback speed.`}
            className={cn(
              "min-w-16 gap-1.5 font-heading text-xs",
              playbackRate !== 1 && "bg-secondary-background",
            )}
            onClick={handlePlaybackRateChange}
            size="sm"
            type="button"
            variant="neutral"
          >
            <Gauge aria-hidden="true" className="size-3.5" />
            {playbackRate}x
          </Button>
        </div>
      </div>

      {hasError ? (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Audio Playback Error</AlertTitle>
          <AlertDescription>
            Could not load audio resource. You can still practice recording your voice below.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {!isContinuous && onPreviousSegment && (
              <Button
                aria-label="Previous segment (←)"
                className="size-10 shrink-0 sm:size-11"
                disabled={!hasPreviousSegment}
                onClick={onPreviousSegment}
                size="icon"
                title="Previous segment (←)"
                variant="neutral"
              >
                <SkipBack className="size-4 sm:size-5" />
              </Button>
            )}

            <Button
              aria-label={isPlaying ? "Pause lesson audio (Space)" : "Play lesson audio (Space)"}
              className="size-12 shrink-0 rounded-base text-main-foreground sm:size-14"
              onClick={onTogglePlay ?? togglePlay}
              size="icon"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="size-5 sm:size-6" />
              ) : (
                <Play className="ml-0.5 size-5 sm:size-6" />
              )}
            </Button>

            {!isContinuous && onNextSegment && (
              <Button
                aria-label="Next segment (→)"
                className="size-10 shrink-0 sm:size-11"
                disabled={!hasNextSegment}
                onClick={onNextSegment}
                size="icon"
                title="Next segment (→)"
                variant="neutral"
              >
                <SkipForward className="size-4 sm:size-5" />
              </Button>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Slider
                aria-label="Audio playback seek"
                max={duration || 100}
                min={0}
                onValueChange={(values) => {
                  const val = values[0];
                  if (typeof val === "number") seek(val);
                }}
                step={0.1}
                value={[currentTime]}
              />

              <div className="flex justify-between font-mono text-xs text-foreground/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <Button
              aria-label="Reset audio playback"
              className="size-10 shrink-0"
              onClick={() => seek(0)}
              size="icon"
              variant="neutral"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
