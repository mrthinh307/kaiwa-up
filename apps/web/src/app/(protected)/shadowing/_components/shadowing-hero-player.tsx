"use client";

import {
  Headphones,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ShadowingHeroPlayerProps {
  currentTime: number;
  duration: number;
  handleIframeLoad: () => void;
  isMuted: boolean;
  isPlaying: boolean;
  isYouTube: boolean;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  playbackRate?: number;
  registerIframe: (element: HTMLIFrameElement | null) => void;
  showVideo: boolean;
  volume: number;
  youtubeVideoId: string | null;
}

function formatPlayerTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ShadowingHeroPlayer({
  currentTime,
  duration,
  handleIframeLoad,
  isMuted,
  isPlaying,
  isYouTube,
  onSeek,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
  playbackRate = 1,
  registerIframe,
  showVideo,
  volume,
  youtubeVideoId,
}: ShadowingHeroPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  if (!isYouTube || !youtubeVideoId) {
    return null;
  }

  if (!showVideo) {
    return (
      <section
        aria-label="Shadowing audio playback timeline"
        className="flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3.5 py-2.5 sm:px-4 shadow-shadow"
      >
        {/* Invisible YouTube iframe so audio continues uninterrupted */}
        <div className="sr-only">
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture"
            aria-hidden="true"
            className="size-px border-0"
            onLoad={handleIframeLoad}
            ref={registerIframe}
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
            tabIndex={-1}
            title="Shadowing lesson audio"
          />
        </div>

        {/* Audio Indicator Label */}
        <div className="flex items-center gap-1.5 text-xs font-heading text-foreground/80 shrink-0">
          <Headphones className="size-4 text-main" />
          <span className="hidden sm:inline">Audio Timeline</span>
        </div>

        {/* Current Time */}
        <span className="font-mono text-xs tabular-nums text-foreground/80 font-bold shrink-0">
          {formatPlayerTime(currentTime)}
        </span>

        {/* Scrubbing Slider */}
        <div className="min-w-0 flex-1 px-1">
          <Slider
            aria-label="Audio playback timeline"
            className="cursor-pointer"
            max={Math.max(duration, 0.1)}
            min={0}
            onValueChange={(values) => {
              const val = values[0];
              if (typeof val === "number") onSeek(val);
            }}
            step={0.1}
            value={[Math.min(currentTime, Math.max(duration, 0.1))]}
          />
        </div>

        {/* Total Duration */}
        <span className="font-mono text-xs tabular-nums text-foreground/60 shrink-0">
          {formatPlayerTime(duration)}
        </span>

        {/* Volume Control */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label={isMuted ? "Unmute audio" : "Adjust volume"}
              className="size-8 shrink-0 p-0"
              size="icon"
              type="button"
              variant="neutral"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-4" />
              ) : volume < 50 ? (
                <Volume1 className="size-4" />
              ) : (
                <Volume2 className="size-4" />
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
      </section>
    );
  }

  return (
    <section
      aria-label="Video shadowing hero player"
      className="group relative overflow-hidden rounded-base border-2 border-border bg-black shadow-shadow"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      ref={containerRef}
    >
      <div className="relative aspect-video w-full">
        {/* YouTube Video iframe */}
        <iframe
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={showVideo}
          aria-hidden={!showVideo ? true : undefined}
          className="pointer-events-none absolute inset-0 size-full border-0"
          onLoad={handleIframeLoad}
          ref={registerIframe}
          src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
          tabIndex={!showVideo ? -1 : undefined}
          title="Shadowing lesson video"
        />

        {/* Video Canvas Click Target (Pause / Resume when clicking anywhere on the video) */}
        {showVideo && (
          <div
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className={cn(
              "absolute inset-0 z-10 flex cursor-pointer items-center justify-center transition-colors duration-200",
              !isPlaying ? "bg-black/25 backdrop-blur-[1px] hover:bg-black/15" : "bg-transparent",
            )}
            onClick={onTogglePlay}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTogglePlay();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {/* Center Circular Play Button Overlay when Paused */}
            {!isPlaying && (
              <div
                aria-hidden="true"
                className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-main text-main-foreground shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <Play className="ml-1.5 size-8 sm:size-10 fill-current" />
              </div>
            )}
          </div>
        )}

        {/* Embedded Bottom Video Controls Bar */}
        {showVideo && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 sm:px-4 sm:pb-3 pt-6 transition-opacity duration-200",
              isPlaying && !isHovering ? "opacity-0" : "opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Timeline Scrub Slider */}
            <div className="mb-1.5 sm:mb-2 w-full">
              <Slider
                aria-label="Video playback progress"
                className="cursor-pointer"
                max={Math.max(duration, 0.1)}
                min={0}
                onValueChange={(values) => {
                  const val = values[0];
                  if (typeof val === "number") onSeek(val);
                }}
                step={0.1}
                value={[Math.min(currentTime, Math.max(duration, 0.1))]}
              />
            </div>

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between gap-2 text-white">
              {/* Left: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-2">
                <button
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  className="rounded-base p-1 hover:bg-white/20 transition-colors"
                  onClick={onTogglePlay}
                  type="button"
                >
                  {isPlaying ? (
                    <Pause className="size-4.5 sm:size-5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-4.5 sm:size-5 fill-current" />
                  )}
                </button>

                {/* Volume Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label={isMuted ? "Unmute" : "Adjust volume"}
                      className="rounded-base p-1 hover:bg-white/20 transition-colors"
                      type="button"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="size-4 sm:size-4.5" />
                      ) : volume < 50 ? (
                        <Volume1 className="size-4 sm:size-4.5" />
                      ) : (
                        <Volume2 className="size-4 sm:size-4.5" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-44 p-3 bg-background border-2 border-border text-foreground"
                    side="top"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded p-1 hover:bg-secondary-background"
                        onClick={onToggleMute}
                        type="button"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="size-4" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                      </button>
                      <Slider
                        aria-label="Volume slider"
                        max={100}
                        min={0}
                        onValueChange={(vals) => {
                          const val = vals[0];
                          if (typeof val === "number") onVolumeChange(val);
                        }}
                        step={1}
                        value={[isMuted ? 0 : volume]}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Timestamps */}
                <span className="font-mono text-xs text-white/90 tabular-nums">
                  {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
                </span>
              </div>

              {/* Right: Speed Badge & Fullscreen */}
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                  {playbackRate}x
                </span>

                <button
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className="rounded-base p-1 hover:bg-white/20 transition-colors"
                  onClick={handleToggleFullscreen}
                  type="button"
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4 sm:size-4.5" />
                  ) : (
                    <Maximize2 className="size-4 sm:size-4.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
