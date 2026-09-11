"use client";

import {
  ChevronDown,
  Gauge,
  Mic,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Square,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

import { PLAYBACK_RATES } from "../_constants/shadowing-constants";

interface ShadowingTransportBarProps {
  autoPlayOnSegmentChange: boolean;
  hasNextSegment: boolean;
  hasPreviousSegment: boolean;
  hasRecordedTake: boolean;
  isPlaying: boolean;
  isPlayingRecordedTake: boolean;
  isRecording: boolean;
  isContinuous: boolean;
  onNextSegment?: () => void;
  onNextUnrecordedSegment?: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onPreviousSegment?: () => void;
  onPreviousUnrecordedSegment?: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleAutoPause: (enabled: boolean) => void;
  onTogglePlay: () => void;
  onToggleRecordedTake: () => void;
  playbackRate: number;
  recordedDuration?: number;
  recordedTakeAvailable: boolean;
  recordingTime?: number;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ShadowingTransportBar({
  autoPlayOnSegmentChange,
  hasNextSegment,
  hasPreviousSegment,
  hasRecordedTake,
  isPlaying,
  isPlayingRecordedTake,
  isRecording,
  isContinuous,
  onNextSegment,
  onNextUnrecordedSegment,
  onPlaybackRateChange,
  onPreviousSegment,
  onPreviousUnrecordedSegment,
  onStartRecording,
  onStopRecording,
  onToggleAutoPause,
  onTogglePlay,
  onToggleRecordedTake,
  playbackRate,
  recordedDuration = 0,
  recordedTakeAvailable,
  recordingTime = 0,
}: ShadowingTransportBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-base border-2 border-border bg-secondary-background p-2.5 sm:px-4 sm:py-3 shadow-shadow">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {!isContinuous && (
          <Button
            aria-label="Previous segment (←) / Unrecorded (Ctrl+←)"
            className="size-8.5 sm:size-9 shrink-0"
            disabled={!hasPreviousSegment}
            onClick={(e) => {
              if ((e.ctrlKey || e.metaKey) && onPreviousUnrecordedSegment) {
                onPreviousUnrecordedSegment();
              } else {
                onPreviousSegment?.();
              }
            }}
            size="icon"
            title="Previous segment (←) / Unrecorded (Ctrl+←)"
            type="button"
            variant="neutral"
          >
            <SkipBack className="size-4" />
          </Button>
        )}

        <Button
          aria-label={isPlaying ? "Pause audio (Space)" : "Play audio (Space)"}
          className="size-9 sm:size-10 shrink-0 rounded-full text-main-foreground"
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

        {!isContinuous && (
          <Button
            aria-label="Next segment (→) / Unrecorded (Ctrl+→)"
            className="size-8.5 sm:size-9 shrink-0"
            disabled={!hasNextSegment}
            onClick={(e) => {
              if ((e.ctrlKey || e.metaKey) && onNextUnrecordedSegment) {
                onNextUnrecordedSegment();
              } else {
                onNextSegment?.();
              }
            }}
            size="icon"
            title="Next segment (→) / Unrecorded (Ctrl+→)"
            type="button"
            variant="neutral"
          >
            <SkipForward className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isRecording ? (
          <Button
            aria-label="Stop recording (R)"
            className="h-8.5 sm:h-9 gap-2 bg-destructive text-destructive-foreground font-heading hover:bg-destructive/90 animate-pulse"
            onClick={onStopRecording}
            size="sm"
            title="Stop recording (R)"
            type="button"
          >
            <Square className="size-3.5 fill-current" />
            <span>Stop ({formatDuration(recordingTime)})</span>
          </Button>
        ) : (
          <>
            {hasRecordedTake && (
              <Button
                aria-label={isPlayingRecordedTake ? "Pause your recording" : "Play your recording"}
                disabled={!recordedTakeAvailable}
                onClick={onToggleRecordedTake}
                size="sm"
                title={isPlayingRecordedTake ? "Pause your recording" : "Play your recording"}
                type="button"
                variant="default"
              >
                {isPlayingRecordedTake ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="ml-0.5 size-4" />
                )}
                <span>{formatDuration(recordedDuration)}</span>
              </Button>
            )}

            <Button
              aria-label={hasRecordedTake ? "Re-record voice take (R)" : "Start recording (R)"}
              onClick={onStartRecording}
              size="sm"
              title={hasRecordedTake ? "Re-record voice take (R)" : "Start voice recording (R)"}
              type="button"
              variant="neutral"
            >
              {hasRecordedTake ? (
                <RefreshCw className="size-4" />
              ) : (
                <Mic className="size-4 text-destructive" />
              )}
              <span>{hasRecordedTake ? "Re-record" : "Record"}</span>
              <Kbd className="h-5 min-w-5 bg-background px-1 font-mono text-[10px] text-foreground/80">
                R
              </Kbd>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {!isContinuous && (
          <Button
            aria-label="Toggle auto-pause per segment"
            aria-pressed={!autoPlayOnSegmentChange}
            className={cn(
              "h-7 sm:h-8 gap-1.5 px-2.5 text-xs font-heading",
              !autoPlayOnSegmentChange
                ? "border-main bg-main/15 text-foreground font-bold"
                : "text-foreground/75",
            )}
            onClick={() => onToggleAutoPause(!autoPlayOnSegmentChange)}
            size="sm"
            title={
              !autoPlayOnSegmentChange
                ? "Auto-pause: Active (pauses after each sentence)"
                : "Auto-pause: Inactive (continuous playback)"
            }
            type="button"
            variant={!autoPlayOnSegmentChange ? "default" : "neutral"}
          >
            <Timer className="size-3.5" />
            <span className="hidden sm:inline">Auto-pause</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Playback speed: ${playbackRate}x`}
              className={cn(
                "h-7 sm:h-8 min-w-15 gap-1.5 px-2 text-xs font-heading",
                playbackRate !== 1 && "bg-secondary-background font-bold text-main",
              )}
              size="sm"
              title="Playback speed"
              type="button"
              variant="neutral"
            >
              <Gauge className="size-3.5" />
              <span>{playbackRate}x</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs text-foreground/70">
              Playback Speed
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={String(playbackRate)}
              onValueChange={(val) => onPlaybackRateChange(Number(val))}
            >
              {PLAYBACK_RATES.map((rate) => (
                <DropdownMenuRadioItem
                  key={rate}
                  value={String(rate)}
                  className="cursor-pointer text-xs font-heading"
                >
                  <span className="flex w-full items-center justify-between">
                    <span>{rate}x</span>
                    {rate === 1 && (
                      <span className="text-[10px] font-normal text-foreground/50">Normal</span>
                    )}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
