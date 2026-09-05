"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const YOUTUBE_PLAYER_STATE = {
  unstarted: -1,
  ended: 0,
  paused: 2,
  playing: 1,
  videoCued: 5,
} as const;

function subscribeToVideoDock(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || !window.MutationObserver) {
    return () => undefined;
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
  };
}

function getVideoDockSnapshot(): HTMLElement | null {
  return typeof document !== "undefined" ? document.getElementById("dictation-video-dock") : null;
}

function getVideoDockServerSnapshot(): HTMLElement | null {
  return null;
}

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getPlayerState?: () => number;
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

type UseSegmentAudioPlayerOptions = {
  autoPlayDelayMs: number;
  canContinuePlayback: boolean;
  endTimeMs: number;
  hasPlayedActiveSegment: boolean;
  isAutoPlayEnabled: boolean;
  isLoopEnabled: boolean;
  onEnded: () => void;
  onReplay: () => void;
  playbackRequest: number;
  segmentIndex: number;
  startTimeMs: number;
  youtubeVideoId: string;
};

export function useSegmentAudioPlayer({
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
}: UseSegmentAudioPlayerOptions) {
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
  const dockElement = useSyncExternalStore(
    subscribeToVideoDock,
    getVideoDockSnapshot,
    getVideoDockServerSnapshot,
  );

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
    const playerState = playerRef.current.getPlayerState?.();
    if (playerState !== undefined && playerState !== YOUTUBE_PLAYER_STATE.unstarted) {
      playerRef.current.seekTo(startSeconds, true);
    }
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
        if (isLoopEnabled) {
          setCurrentTime(0);
          requestPlayback(0);
          return;
        }

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
    isLoopEnabled,
    onEnded,
    requestPlayback,
    startSeconds,
  ]);

  return {
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
  };
}
