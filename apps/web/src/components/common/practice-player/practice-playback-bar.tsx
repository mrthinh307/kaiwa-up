"use client";

import type { ReactNode } from "react";

import { Gauge, Pause, Play, Repeat2, RotateCcw, Volume1, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface PracticePlaybackBarProps {
  className?: string;
  currentTime: number;
  duration: number;
  formatTime?: (seconds: number) => string;
  isLoopEnabled?: boolean;
  isMuted?: boolean;
  isPlaying: boolean;
  label?: ReactNode;
  onLoopToggle?: () => void;
  onPlaybackRateChange?: () => void;
  onReplay: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute?: () => void;
  onTogglePlay: () => void;
  onVolumeChange?: (volume: number) => void;
  playbackRate?: number;
  showLoop?: boolean;
  showSpeed?: boolean;
  showVolume?: boolean;
  volume?: number;
}

function defaultFormatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function PracticePlaybackBar({
  className,
  currentTime,
  duration,
  formatTime = defaultFormatTime,
  isLoopEnabled = false,
  isMuted = false,
  isPlaying,
  label,
  onLoopToggle,
  onPlaybackRateChange,
  onReplay,
  onSeek,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
  playbackRate = 1,
  showLoop = true,
  showSpeed = true,
  showVolume = true,
  volume = 100,
}: PracticePlaybackBarProps) {
  const hasHeader = Boolean(label) || showLoop || showSpeed || showVolume;

  const handleSliderChange = (values: number[]) => {
    const val = values[0];
    if (typeof val === "number") {
      onSeek(val);
    }
  };

  return (
    <div
      className={cn(
        "border-b-2 border-border bg-secondary-background p-3.5 sm:px-5 sm:py-4",
        className,
      )}
    >
      {hasHeader && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label ? (
            <div className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wide text-foreground/70">
              {label}
            </div>
          ) : (
            <div />
          )}

          {/* Utility Controls: Speed, Loop, Volume */}
          <div className="flex items-center gap-1.5">
            {showSpeed && onPlaybackRateChange && (
              <Button
                aria-label={`Playback speed ${playbackRate}x`}
                className={cn(
                  "h-7 min-w-11 gap-1 px-2 text-xs font-heading shadow-none!",
                  playbackRate !== 1 && "bg-secondary-background font-bold text-main",
                )}
                onClick={onPlaybackRateChange}
                size="sm"
                type="button"
                variant="neutral"
              >
                <Gauge aria-hidden="true" className="size-3" />
                <span>{playbackRate}x</span>
              </Button>
            )}

            {showLoop && onLoopToggle && (
              <Button
                aria-label={`Loop current segment ${isLoopEnabled ? "on" : "off"}`}
                aria-pressed={isLoopEnabled}
                className={cn(
                  "h-7 gap-1 px-2 text-xs font-heading shadow-none!",
                  isLoopEnabled
                    ? "border-status-correct-border bg-status-correct-bg font-bold text-status-correct-text"
                    : "text-foreground/75",
                )}
                onClick={onLoopToggle}
                size="sm"
                type="button"
                variant={isLoopEnabled ? "default" : "neutral"}
              >
                <Repeat2 aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">Loop {isLoopEnabled ? "on" : "off"}</span>
              </Button>
            )}

            {showVolume && onVolumeChange && onToggleMute && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    aria-label={isMuted ? "Unmute audio" : "Adjust volume"}
                    className="size-7 p-0 shadow-none!"
                    size="icon"
                    type="button"
                    variant="neutral"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX aria-hidden="true" className="size-3.5" />
                    ) : volume < 50 ? (
                      <Volume1 aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Volume2 aria-hidden="true" className="size-3.5" />
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
                        className="size-7 shrink-0 shadow-none!"
                        onClick={onToggleMute}
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
                          if (typeof val === "number") onVolumeChange(val);
                        }}
                        step={1}
                        value={[isMuted ? 0 : volume]}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}

      {/* Controls Strip */}
      <div className="flex items-center gap-2 sm:gap-3 rounded-base border-2 border-border bg-background p-2.5 sm:px-4">
        <Button
          aria-label={isPlaying ? "Pause audio (Space)" : "Play audio (Space)"}
          className="size-9 sm:size-10 shrink-0 rounded-base text-main-foreground shadow-xs"
          onClick={onTogglePlay}
          size="icon"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          type="button"
        >
          {isPlaying ? (
            <Pause className="size-4.5 sm:size-5" />
          ) : (
            <Play className="ml-0.5 size-4.5 sm:size-5" />
          )}
        </Button>

        <Button
          aria-label="Replay segment from start"
          className="size-8.5 sm:size-9 shrink-0 text-foreground/80 hover:text-foreground shadow-none!"
          onClick={onReplay}
          size="icon"
          title="Replay from start (Ctrl+Space)"
          type="button"
          variant="neutral"
        >
          <RotateCcw aria-hidden="true" className="size-3.5 sm:size-4" />
        </Button>

        {/* Current Time */}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/75 sm:text-xs">
          {formatTime(currentTime)}
        </span>

        {/* Scrubbing Slider */}
        <div className="min-w-0 flex-1 px-1">
          <Slider
            aria-label="Playback timeline"
            className="cursor-pointer"
            max={Math.max(duration, 0.1)}
            min={0}
            onValueChange={handleSliderChange}
            step={0.1}
            value={[Math.min(currentTime, Math.max(duration, 0.1))]}
          />
        </div>

        {/* Duration */}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/60 sm:text-xs">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
