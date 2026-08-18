"use client";

import { Gauge, Headphones, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { formatDictationTimestamp } from "../../_utils/dictation-formatters";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const YOUTUBE_PLAYER_STATE = {
  ended: 0,
  paused: 2,
  playing: 1,
  videoCued: 5,
} as const;

type SegmentAudioPlayerProps = {
  autoPlayDelayMs: number;
  canContinuePlayback: boolean;
  endTimeMs: number;
  hasPlayedActiveSegment: boolean;
  isAutoPlayEnabled: boolean;
  lessonTitle: string;
  onEnded: () => void;
  onReplay: () => void;
  onStop: () => void;
  playbackRequest: number;
  segmentIndex: number;
  showVideo?: boolean;
  startTimeMs: number;
  youtubeVideoId: string;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
};

type YouTubePlayerStateEvent = YouTubePlayerEvent & {
  data: number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerStateEvent) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | undefined;

function formatPlayerTime(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const resolveApi = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      }
    };
    const rejectApi = () => {
      youtubeApiPromise = undefined;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    const previousReadyCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();
      resolveApi();
    };

    const existingScript = document.getElementById(YOUTUBE_IFRAME_API_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", resolveApi, { once: true });
      existingScript.addEventListener("error", rejectApi, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = YOUTUBE_IFRAME_API_SCRIPT_ID;
    script.onerror = rejectApi;
    script.src = YOUTUBE_IFRAME_API_URL;
    document.head.append(script);
  });

  return youtubeApiPromise;
}

export function SegmentAudioPlayer({
  autoPlayDelayMs,
  canContinuePlayback,
  endTimeMs,
  hasPlayedActiveSegment,
  isAutoPlayEnabled,
  lessonTitle,
  onEnded,
  onReplay,
  onStop,
  playbackRequest,
  segmentIndex,
  showVideo = false,
  startTimeMs,
  youtubeVideoId,
}: SegmentAudioPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isPlayerReadyRef = useRef(false);
  const previousEndSecondsRef = useRef(endTimeMs / 1_000);
  const previousSegmentIndexRef = useRef(segmentIndex);
  const previousPlaybackRequestRef = useRef(playbackRequest);
  const pendingPlayRef = useRef(false);
  const hasReachedEndRef = useRef(false);
  const currentTimeRef = useRef(0);
  const endSecondsRef = useRef(endTimeMs / 1_000);
  const playbackRateRef = useRef(1);
  const startSecondsRef = useRef(startTimeMs / 1_000);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const startSeconds = startTimeMs / 1_000;
  const durationSeconds = Math.max((endTimeMs - startTimeMs) / 1_000, 0.1);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=0&controls=0&disablekb=1&enablejsapi=1&rel=0&playsinline=1`;

  useEffect(() => {
    currentTimeRef.current = currentTime;
    endSecondsRef.current = endTimeMs / 1_000;
    playbackRateRef.current = playbackRate;
    startSecondsRef.current = startSeconds;
  }, [currentTime, endTimeMs, playbackRate, startSeconds]);

  const requestPlayback = useCallback((timeSeconds: number) => {
    pendingPlayRef.current = true;
    hasReachedEndRef.current = false;
    const player = playerRef.current;
    if (!isPlayerReadyRef.current || !player) {
      setIsPlaying(false);
      return;
    }

    pendingPlayRef.current = false;
    player.seekTo(startSecondsRef.current + timeSeconds, true);
    player.setPlaybackRate(playbackRateRef.current);
    player.playVideo();
  }, []);

  useEffect(() => {
    let isDisposed = false;

    void loadYouTubeIframeApi()
      .then((youtubeApi) => {
        const iframe = iframeRef.current;
        if (isDisposed || !iframe) {
          return;
        }

        playerRef.current = new youtubeApi.Player(iframe, {
          events: {
            onReady: ({ target }) => {
              if (isDisposed) {
                return;
              }

              isPlayerReadyRef.current = true;
              target.pauseVideo();
              target.seekTo(startSecondsRef.current + currentTimeRef.current, true);
              target.setPlaybackRate(playbackRateRef.current);

              if (pendingPlayRef.current) {
                requestPlayback(currentTimeRef.current);
              }
            },
            onStateChange: ({ data, target }) => {
              if (isDisposed) {
                return;
              }

              if (data === YOUTUBE_PLAYER_STATE.playing) {
                const absoluteTime = target.getCurrentTime();
                if (
                  absoluteTime < startSecondsRef.current - 0.35 ||
                  absoluteTime >= endSecondsRef.current
                ) {
                  target.seekTo(startSecondsRef.current + currentTimeRef.current, true);
                }
                setIsPlaying(true);
                return;
              }

              if (
                data === YOUTUBE_PLAYER_STATE.ended ||
                data === YOUTUBE_PLAYER_STATE.paused ||
                data === YOUTUBE_PLAYER_STATE.videoCued
              ) {
                setIsPlaying(false);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!isDisposed) {
          pendingPlayRef.current = false;
          setIsPlaying(false);
        }
      });

    return () => {
      isDisposed = true;
      isPlayerReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [requestPlayback, youtubeVideoId]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pendingPlayRef.current = false;
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
      return;
    }

    const nextTime = currentTime >= durationSeconds ? 0 : currentTime;
    setCurrentTime(nextTime);

    if (!hasPlayedActiveSegment) {
      onReplay();
      return;
    }

    requestPlayback(nextTime);
  }, [currentTime, durationSeconds, hasPlayedActiveSegment, isPlaying, onReplay, requestPlayback]);

  const handleStop = () => {
    pendingPlayRef.current = false;
    hasReachedEndRef.current = false;
    onStop();
    setCurrentTime(0);
    setIsPlaying(false);
    playerRef.current?.pauseVideo();
    playerRef.current?.seekTo(startSeconds, true);
  };

  const handleReplayRequest = useCallback(() => {
    hasReachedEndRef.current = false;
    setCurrentTime(0);
    requestPlayback(0);
  }, [requestPlayback]);

  useEffect(() => {
    if (previousSegmentIndexRef.current === segmentIndex) {
      return;
    }

    const previousEndSeconds = previousEndSecondsRef.current;
    previousEndSecondsRef.current = endTimeMs / 1_000;
    previousSegmentIndexRef.current = segmentIndex;
    pendingPlayRef.current = false;
    hasReachedEndRef.current = false;
    setCurrentTime(0);

    if (!isPlayerReadyRef.current || !playerRef.current) {
      const timeoutId = window.setTimeout(() => setIsPlaying(false), 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (isAutoPlayEnabled && autoPlayDelayMs === 0 && isPlaying) {
      const isAdjacentSegment = Math.abs(startSeconds - previousEndSeconds) <= 0.35;
      if (!isAdjacentSegment) {
        playerRef.current.seekTo(startSeconds, true);
      }
      playerRef.current.playVideo();
      return;
    }

    playerRef.current.pauseVideo();
    playerRef.current.seekTo(startSeconds, true);
    const timeoutId = window.setTimeout(() => setIsPlaying(false), 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoPlayDelayMs, endTimeMs, isAutoPlayEnabled, isPlaying, segmentIndex, startSeconds]);

  const handleSeek = (values: number[]) => {
    const nextTime = values[0];
    if (typeof nextTime !== "number") {
      return;
    }

    hasReachedEndRef.current = nextTime >= durationSeconds;
    setCurrentTime(nextTime);
    if (nextTime >= durationSeconds) {
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
    }
    playerRef.current?.seekTo(startSeconds + nextTime, true);
  };

  const handlePlaybackRateChange = () => {
    const currentRateIndex = PLAYBACK_RATES.indexOf(
      playbackRate as (typeof PLAYBACK_RATES)[number],
    );
    const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length] ?? 1;

    setPlaybackRate(nextRate);
    playerRef.current?.setPlaybackRate(nextRate);
  };

  useEffect(() => {
    if (playbackRequest === previousPlaybackRequestRef.current) {
      return;
    }

    previousPlaybackRequestRef.current = playbackRequest;
    if (playbackRequest === 0) {
      return;
    }

    const timeoutId = window.setTimeout(handleReplayRequest, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleReplayRequest, playbackRequest]);

  useEffect(() => {
    const handleSpacebar = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        event.repeat
      ) {
        return;
      }

      event.preventDefault();
      handlePlayPause();
    };

    window.addEventListener("keydown", handleSpacebar);
    return () => {
      window.removeEventListener("keydown", handleSpacebar);
    };
  }, [handlePlayPause]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const absoluteTime = playerRef.current?.getCurrentTime();
      if (typeof absoluteTime !== "number" || !Number.isFinite(absoluteTime)) {
        return;
      }

      const nextTime = Math.min(Math.max(absoluteTime - startSeconds, 0), durationSeconds);
      setCurrentTime(nextTime);

      if (nextTime >= durationSeconds && !hasReachedEndRef.current) {
        hasReachedEndRef.current = true;
        const shouldContinueWithoutDelay =
          isAutoPlayEnabled && canContinuePlayback && autoPlayDelayMs === 0;
        if (!shouldContinueWithoutDelay) {
          setIsPlaying(false);
          playerRef.current?.pauseVideo();
        }
        onEnded();
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    autoPlayDelayMs,
    canContinuePlayback,
    durationSeconds,
    isAutoPlayEnabled,
    isPlaying,
    onEnded,
    startSeconds,
  ]);

  return (
    <section
      aria-label={showVideo ? "Video segment player" : "Audio-only segment player"}
      className={cn("border-b-2 border-border bg-secondary-background", !showVideo && "p-4 sm:p-6")}
    >
      <div
        className={showVideo ? "relative aspect-video w-full overflow-hidden bg-black" : "sr-only"}
      >
        <iframe
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={showVideo}
          aria-hidden={showVideo ? undefined : true}
          className={
            showVideo
              ? "pointer-events-none absolute inset-0 size-full border-0"
              : "size-px border-0"
          }
          ref={iframeRef}
          src={embedUrl}
          tabIndex={showVideo ? undefined : -1}
          title={`${lessonTitle}, segment ${segmentIndex + 1}`}
        />
      </div>

      <div
        className={cn(
          "bg-background p-4 sm:p-5",
          showVideo ? "border-t-2 border-border" : "rounded-base border-2 border-border shadow-xs",
        )}
      >
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
              <p className="truncate font-heading text-sm">
                {showVideo ? "Segment playback" : "Audio-only mode"}
              </p>
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
