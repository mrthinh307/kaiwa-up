"use client";

import { AlertCircle, Headphones, Pause, Play, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import { type AudioPlayerState, useAudioPlayer } from "../_hooks/use-audio-player";

interface AudioPlayerCardProps {
  audioUrl: string;
  durationSeconds?: number | null;
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
  player: externalPlayer,
  showVideo = false,
}: AudioPlayerCardProps) {
  const internalPlayer = useAudioPlayer(audioUrl, durationSeconds ?? 0);
  const player = externalPlayer ?? internalPlayer;

  const {
    changePlaybackRate,
    currentTime,
    duration,
    hasError,
    iframeRef,
    isPlaying,
    isYouTube,
    playbackRate,
    seek,
    togglePlay,
    youtubeVideoId,
  } = player;

  const speedOptions = [0.8, 1.0, 1.2];

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow">
      {isYouTube &&
        youtubeVideoId &&
        (showVideo ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-base border-2 border-border bg-black mb-6 shadow-xs">
            <iframe
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=1&rel=0&playsinline=1`}
              title="Shadowing lesson video"
            />
          </div>
        ) : (
          <div className="sr-only">
            <iframe
              allow="autoplay; encrypted-media; picture-in-picture"
              aria-hidden="true"
              className="size-px border-0"
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
              tabIndex={-1}
              title="Shadowing lesson audio"
            />
          </div>
        ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading text-lg">
          <Headphones className="size-5 text-main" />
          <span>Original Lesson Audio</span>
        </div>

        <div className="flex items-center gap-1.5">
          {speedOptions.map((rate) => (
            <Button
              className="h-8 px-2.5 text-xs"
              key={rate}
              onClick={() => changePlaybackRate(rate)}
              size="sm"
              variant={playbackRate === rate ? "default" : "neutral"}
            >
              {rate}x
            </Button>
          ))}
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
          <div className="flex items-center gap-4">
            <Button
              aria-label={isPlaying ? "Pause lesson audio" : "Play lesson audio"}
              className="size-14 rounded-base text-main-foreground shrink-0"
              onClick={togglePlay}
              size="icon"
            >
              {isPlaying ? <Pause className="size-6" /> : <Play className="ml-0.5 size-6" />}
            </Button>

            <div className="flex flex-1 flex-col gap-2">
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
