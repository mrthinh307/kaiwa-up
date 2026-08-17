"use client";

import { Gauge, Headphones, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { formatDictationTimestamp } from "../../_utils/dictation-formatters";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";

type SegmentAudioPlayerProps = {
  endTimeMs: number;
  hasPlayedActiveSegment: boolean;
  lessonTitle: string;
  onReplay: () => void;
  playbackRequest: number;
  segmentIndex: number;
  startTimeMs: number;
  youtubeVideoId: string;
};

type YouTubeCommand = {
  args?: Array<boolean | number>;
  func: "pauseVideo" | "playVideo" | "seekTo" | "setPlaybackRate";
};

function formatPlayerTime(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function postYouTubeCommand(iframe: HTMLIFrameElement | null, command: YouTubeCommand) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", ...command }),
    YOUTUBE_ORIGIN,
  );
}

export function SegmentAudioPlayer({
  endTimeMs,
  hasPlayedActiveSegment,
  lessonTitle,
  onReplay,
  playbackRequest,
  segmentIndex,
  startTimeMs,
  youtubeVideoId,
}: SegmentAudioPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousPlaybackRequestRef = useRef(playbackRequest);
  const pendingPlayRef = useRef(false);
  const hasReachedEndRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const startSeconds = startTimeMs / 1_000;
  const durationSeconds = Math.max((endTimeMs - startTimeMs) / 1_000, 0.1);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?start=${Math.floor(startSeconds)}&end=${Math.ceil(endTimeMs / 1_000)}&autoplay=0&controls=0&enablejsapi=1&rel=0&playsinline=1`;

  const sendCommand = useCallback((command: YouTubeCommand) => {
    postYouTubeCommand(iframeRef.current, command);
  }, []);

  const requestPlayback = useCallback(
    (timeSeconds: number) => {
      pendingPlayRef.current = true;
      hasReachedEndRef.current = false;
      sendCommand({ args: [startSeconds + timeSeconds, true], func: "seekTo" });
      sendCommand({ func: "setPlaybackRate", args: [playbackRate] });
      sendCommand({ func: "playVideo" });
    },
    [playbackRate, sendCommand, startSeconds],
  );

  const handleIframeLoad = () => {
    if (!pendingPlayRef.current) {
      return;
    }

    window.setTimeout(() => {
      pendingPlayRef.current = false;
      requestPlayback(currentTime);
    }, 100);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pendingPlayRef.current = false;
      setIsPlaying(false);
      sendCommand({ func: "pauseVideo" });
      return;
    }

    const nextTime = currentTime >= durationSeconds ? 0 : currentTime;
    setCurrentTime(nextTime);
    setIsPlaying(true);

    if (!hasPlayedActiveSegment) {
      onReplay();
      return;
    }

    requestPlayback(nextTime);
  };

  const handleStop = () => {
    pendingPlayRef.current = false;
    hasReachedEndRef.current = false;
    setCurrentTime(0);
    setIsPlaying(false);
    sendCommand({ func: "pauseVideo" });
    sendCommand({ args: [startSeconds, true], func: "seekTo" });
  };

  const handleReplayRequest = useCallback(() => {
    hasReachedEndRef.current = false;
    setCurrentTime(0);
    setIsPlaying(true);
    requestPlayback(0);
  }, [requestPlayback]);

  const handleSeek = (values: number[]) => {
    const nextTime = values[0];
    if (typeof nextTime !== "number") {
      return;
    }

    hasReachedEndRef.current = nextTime >= durationSeconds;
    setCurrentTime(nextTime);
    if (nextTime >= durationSeconds) {
      setIsPlaying(false);
      sendCommand({ func: "pauseVideo" });
    }
    sendCommand({ args: [startSeconds + nextTime, true], func: "seekTo" });
  };

  const handlePlaybackRateChange = () => {
    const currentRateIndex = PLAYBACK_RATES.indexOf(
      playbackRate as (typeof PLAYBACK_RATES)[number],
    );
    const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length] ?? 1;

    setPlaybackRate(nextRate);
    sendCommand({ args: [nextRate], func: "setPlaybackRate" });
  };

  useEffect(() => {
    if (playbackRequest === previousPlaybackRequestRef.current) {
      return;
    }

    previousPlaybackRequestRef.current = playbackRequest;
    handleReplayRequest();
  }, [handleReplayRequest, playbackRequest]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime((previousTime) => {
        const nextTime = Math.min(previousTime + 0.1 * playbackRate, durationSeconds);

        if (nextTime >= durationSeconds && !hasReachedEndRef.current) {
          hasReachedEndRef.current = true;
          window.setTimeout(() => {
            setIsPlaying(false);
            sendCommand({ func: "pauseVideo" });
          }, 0);
        }

        return nextTime;
      });
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [durationSeconds, isPlaying, playbackRate, sendCommand]);

  return (
    <section
      aria-label="Audio-only segment player"
      className="border-b-2 border-border bg-secondary-background p-4 sm:p-6"
    >
      <div className="sr-only">
        <iframe
          allow="autoplay; encrypted-media; picture-in-picture"
          aria-hidden="true"
          className="size-px border-0"
          key={segmentIndex}
          onLoad={handleIframeLoad}
          ref={iframeRef}
          src={embedUrl}
          tabIndex={-1}
          title={`${lessonTitle}, audio-only segment ${segmentIndex + 1}`}
        />
      </div>

      <div className="rounded-base border-2 border-border bg-background p-4 shadow-xs sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-xs">
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-5" />
            ) : (
              <Headphones aria-hidden="true" className="size-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-heading text-sm">Audio-only mode</p>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground/60">
                {formatPlayerTime(currentTime)} / {formatPlayerTime(durationSeconds)}
              </span>
            </div>
            <Slider
              aria-label="Audio playback progress"
              className="mt-3"
              max={durationSeconds}
              min={0}
              onValueChange={handleSeek}
              step={0.1}
              value={[currentTime]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-foreground/65">
            <Headphones aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {formatDictationTimestamp(startTimeMs)}–{formatDictationTimestamp(endTimeMs)}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              aria-label="Stop segment playback"
              className="size-9 shrink-0"
              onClick={handleStop}
              size="icon"
              type="button"
              variant="neutral"
            >
              <Square aria-hidden="true" className="size-4 fill-current" />
            </Button>
            <Button
              aria-label={isPlaying ? "Pause segment playback" : "Play segment playback"}
              className="size-10 shrink-0 rounded-full"
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
          </div>
        </div>
      </div>
    </section>
  );
}
