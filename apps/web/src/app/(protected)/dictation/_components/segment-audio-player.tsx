"use client";

import { Gauge, Pause, Play, Repeat2, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { useSegmentAudioPlayer } from "../_hooks/use-segment-audio-player";

type SegmentAudioPlayerProps = {
  autoPlayDelayMs: number;
  canContinuePlayback: boolean;
  endTimeMs: number;
  hasPlayedActiveSegment: boolean;
  isAutoPlayEnabled: boolean;
  isLoopEnabled: boolean;
  lessonTitle: string;
  onEnded: () => void;
  onLoopToggle: () => void;
  onReplay: () => void;
  onStop: () => void;
  playbackRequest: number;
  segmentIndex: number;
  showVideo?: boolean;
  startTimeMs: number;
  youtubeVideoId: string;
};

function formatPlayerTime(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function SegmentAudioPlayer({
  autoPlayDelayMs,
  canContinuePlayback,
  endTimeMs,
  hasPlayedActiveSegment,
  isAutoPlayEnabled,
  isLoopEnabled,
  lessonTitle,
  onEnded,
  onLoopToggle,
  onReplay,
  onStop: _onStop,
  playbackRequest,
  segmentIndex,
  showVideo = false,
  startTimeMs,
  youtubeVideoId,
}: SegmentAudioPlayerProps) {
  const {
    currentTime,
    dockElement,
    durationSeconds,
    embedUrl,
    handlePlayPause,
    handlePlaybackRateChange,
    handleSeek,
    iframeRef,
    isPlaying,
    playbackRate,
  } = useSegmentAudioPlayer({
    autoPlayDelayMs,
    canContinuePlayback,
    endTimeMs,
    hasPlayedActiveSegment,
    isAutoPlayEnabled,
    isLoopEnabled,
    onEnded,
    onReplay,
    playbackRequest,
    segmentIndex,
    startTimeMs,
    youtubeVideoId,
  });

  const videoContent = (
    <div
      className={
        dockElement && showVideo
          ? "relative aspect-video size-full overflow-hidden bg-black"
          : "sr-only"
      }
    >
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={showVideo}
        aria-hidden={showVideo ? undefined : true}
        className={
          dockElement && showVideo
            ? "pointer-events-none absolute inset-0 size-full border-0"
            : "size-px border-0"
        }
        ref={iframeRef}
        src={embedUrl}
        tabIndex={showVideo ? undefined : -1}
        title={`${lessonTitle}, segment ${segmentIndex + 1}`}
      />
    </div>
  );

  return (
    <section
      aria-label="Segment playback controls"
      className="border-b-2 border-border bg-background"
    >
      {dockElement && showVideo ? createPortal(videoContent, dockElement) : videoContent}

      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <Button
          aria-label={isPlaying ? "Pause segment (Space)" : "Play segment (Space)"}
          className="size-8.5 shrink-0 rounded-full font-heading shadow-xs sm:size-9"
          onClick={handlePlayPause}
          size="icon"
          title={isPlaying ? "Pause" : "Play"}
          type="button"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 size-4" />
          )}
        </Button>

        <Button
          aria-label="Replay segment from start"
          className="size-8 shrink-0 text-foreground/80 shadow-none! hover:text-foreground"
          onClick={onReplay}
          size="icon"
          title="Replay from start (Ctrl+Space)"
          type="button"
          variant="neutral"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
        </Button>

        <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/75 sm:text-xs">
          {formatPlayerTime(currentTime)}
        </span>

        <div className="min-w-0 flex-1 px-1">
          <Slider
            aria-label="Audio playback progress"
            className="cursor-pointer"
            max={durationSeconds}
            min={0}
            onValueChange={handleSeek}
            step={0.1}
            value={[currentTime]}
          />
        </div>

        <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/60 sm:text-xs">
          {formatPlayerTime(durationSeconds)}
        </span>

        <div className="hidden h-4 w-px bg-border/40 sm:block" />

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            aria-label={`Loop current segment ${isLoopEnabled ? "on" : "off"}`}
            aria-pressed={isLoopEnabled}
            className={cn(
              "h-7 gap-1 px-2 text-xs font-heading shadow-none! sm:h-8",
              isLoopEnabled
                ? "border-status-correct-border bg-status-correct-bg font-bold text-status-correct-text"
                : "text-foreground/75",
            )}
            onClick={onLoopToggle}
            size="sm"
            title={`Loop: ${isLoopEnabled ? "On" : "Off"}`}
            type="button"
            variant={isLoopEnabled ? "default" : "neutral"}
          >
            <Repeat2 aria-hidden="true" className="size-3.5" />
          </Button>

          <Button
            aria-label={`Playback speed ${playbackRate}x. Change playback speed.`}
            className={cn(
              "h-7 min-w-12 gap-1 px-2 text-xs font-heading shadow-none! sm:h-8",
              playbackRate !== 1 && "bg-secondary-background font-bold text-main",
            )}
            onClick={handlePlaybackRateChange}
            size="sm"
            title="Change speed"
            type="button"
            variant="neutral"
          >
            <Gauge aria-hidden="true" className="size-3" />
            <span>{playbackRate}x</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
