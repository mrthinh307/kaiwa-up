"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";

export type PlaybackStatus = "IDLE" | "PLAYING_SEGMENT" | "PAUSED_AT_BOUNDARY" | "PAUSED_MANUAL";

type YouTubeCommand = {
  args?: Array<boolean | number>;
  func: "mute" | "pauseVideo" | "playVideo" | "seekTo" | "setPlaybackRate" | "setVolume" | "unMute";
};

export function getYouTubeVideoId(audioUrl: string): string | null {
  if (!audioUrl) return null;
  try {
    const url = new URL(audioUrl);
    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean).at(0) ?? null;
    }
    if (url.hostname.endsWith("youtube.com")) {
      return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  segments?: Array<{ end_time_ms: number; start_time_ms: number }>;
}

export function useAudioPlayer(src: string, initialDuration = 0, options?: UseAudioPlayerOptions) {
  const youtubeVideoId = useMemo(() => getYouTubeVideoId(src), [src]);
  const isYouTube = Boolean(youtubeVideoId);

  const autoPlay = options?.autoPlay ?? false;
  const segments = useMemo(() => options?.segments ?? [], [options?.segments]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasReachedEndRef = useRef(false);
  const stopBoundarySecondsRef = useRef<number | null>(null);

  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("IDLE");
  const playbackStatusRef = useRef<PlaybackStatus>("IDLE");

  useEffect(() => {
    playbackStatusRef.current = playbackStatus;
  }, [playbackStatus]);

  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolumeState] = useState(100);
  const volumeRef = useRef(100);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const duration = audioDuration > 0 ? audioDuration : initialDuration;
  const isPlaying = playbackStatus === "PLAYING_SEGMENT";

  const sendYouTubeCommand = useCallback((command: YouTubeCommand) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", ...command }),
      YOUTUBE_ORIGIN,
    );
  }, []);

  const syncYouTubeVolume = useCallback(() => {
    sendYouTubeCommand({ args: [volumeRef.current], func: "setVolume" });
    if (!isMutedRef.current) {
      sendYouTubeCommand({ func: "unMute" });
    }
  }, [sendYouTubeCommand]);

  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening" }),
      YOUTUBE_ORIGIN,
    );
    syncYouTubeVolume();
  }, [syncYouTubeVolume]);

  const executePlay = useCallback(
    (startSeconds?: number) => {
      if (isYouTube) {
        hasReachedEndRef.current = false;
        if (typeof startSeconds === "number") {
          sendYouTubeCommand({ args: [startSeconds, true], func: "seekTo" });
        }
        syncYouTubeVolume();
        sendYouTubeCommand({ args: [playbackRate], func: "setPlaybackRate" });
        sendYouTubeCommand({ func: "playVideo" });
        return;
      }

      if (!audioRef.current) return;
      audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
      audioRef.current.muted = isMutedRef.current;
      if (typeof startSeconds === "number") {
        audioRef.current.currentTime = startSeconds;
      }
      audioRef.current
        .play()
        .then(() => setHasError(false))
        .catch(() => setHasError(true));
    },
    [isYouTube, playbackRate, sendYouTubeCommand, syncYouTubeVolume],
  );

  const executePause = useCallback(() => {
    if (isYouTube) {
      sendYouTubeCommand({ func: "pauseVideo" });
      return;
    }

    if (!audioRef.current) return;
    audioRef.current.pause();
  }, [isYouTube, sendYouTubeCommand]);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const clamped = Math.max(0, Math.min(100, nextVolume));
      setVolumeState(clamped);
      volumeRef.current = clamped;
      if (isYouTube) {
        sendYouTubeCommand({ args: [clamped], func: "setVolume" });
        if (clamped > 0 && isMuted) {
          setIsMuted(false);
          isMutedRef.current = false;
          sendYouTubeCommand({ func: "unMute" });
        }
      } else if (audioRef.current) {
        audioRef.current.volume = clamped / 100;
        if (clamped > 0 && audioRef.current.muted) {
          audioRef.current.muted = false;
          setIsMuted(false);
          isMutedRef.current = false;
        }
      }
    },
    [isMuted, isYouTube, sendYouTubeCommand],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (isYouTube) {
        sendYouTubeCommand({ func: next ? "mute" : "unMute" });
      } else if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, [isYouTube, sendYouTubeCommand]);

  const findSegmentAtTime = useCallback(
    (timeSeconds: number) => {
      const timeMs = Math.round(timeSeconds * 1000);
      return segments.find((s) => timeMs >= s.start_time_ms && timeMs < s.end_time_ms) ?? null;
    },
    [segments],
  );

  const findSegmentIndexAtTime = useCallback(
    (timeSeconds: number) => {
      const timeMs = Math.round(timeSeconds * 1000);
      return segments.findIndex((s) => timeMs >= s.start_time_ms && timeMs < s.end_time_ms);
    },
    [segments],
  );

  const checkAndHandleBoundary = useCallback(
    (timeSeconds: number): boolean => {
      if (autoPlay) return false;
      if (playbackStatusRef.current !== "PLAYING_SEGMENT") return false;
      if (segments.length === 0) return false;

      let boundary = stopBoundarySecondsRef.current;
      if (boundary === null) {
        const curSeg = findSegmentAtTime(timeSeconds);
        if (curSeg) {
          boundary = curSeg.end_time_ms / 1000;
          stopBoundarySecondsRef.current = boundary;
        }
      }

      if (boundary !== null && timeSeconds >= boundary - 0.05) {
        executePause();
        setCurrentTime(boundary);
        setPlaybackStatus("PAUSED_AT_BOUNDARY");
        return true;
      }

      return false;
    },
    [autoPlay, executePause, findSegmentAtTime, segments.length],
  );

  const startPlayback = useCallback(
    (startSeconds?: number, stopSeconds: number | null = null) => {
      stopBoundarySecondsRef.current = stopSeconds;
      setPlaybackStatus("PLAYING_SEGMENT");
      executePlay(startSeconds);
    },
    [executePlay],
  );

  const togglePlay = useCallback(() => {
    if (playbackStatusRef.current === "PLAYING_SEGMENT") {
      stopBoundarySecondsRef.current = null;
      executePause();
      setPlaybackStatus("PAUSED_MANUAL");
      return;
    }

    if (playbackStatusRef.current === "PAUSED_AT_BOUNDARY") {
      if (segments.length > 0) {
        const nextIndex = findSegmentIndexAtTime(currentTime + 0.1);
        if (nextIndex >= 0 && nextIndex < segments.length) {
          const nextSeg = segments[nextIndex];
          if (nextSeg) {
            const nextStart = nextSeg.start_time_ms / 1000;
            const nextStop = autoPlay ? null : nextSeg.end_time_ms / 1000;
            setCurrentTime(nextStart);
            startPlayback(nextStart, nextStop);
            return;
          }
        }
      }
    }

    startPlayback();
  }, [autoPlay, currentTime, executePause, findSegmentIndexAtTime, segments, startPlayback]);

  const playSegment = useCallback(
    (startSeconds: number, stopSeconds: number | null = null) => {
      const targetStop = autoPlay
        ? null
        : stopSeconds !== null
          ? stopSeconds
          : (findSegmentAtTime(startSeconds)?.end_time_ms ?? 0) / 1000 || null;
      startPlayback(startSeconds, targetStop);
    },
    [autoPlay, findSegmentAtTime, startPlayback],
  );

  const playFrom = useCallback(
    (time: number) => {
      playSegment(time, null);
    },
    [playSegment],
  );

  const pause = useCallback(() => {
    stopBoundarySecondsRef.current = null;
    executePause();
    setPlaybackStatus("PAUSED_MANUAL");
  }, [executePause]);

  const play = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  const setStopAtSeconds = useCallback((stopSeconds: number | null) => {
    stopBoundarySecondsRef.current = stopSeconds;
  }, []);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (isYouTube) {
        hasReachedEndRef.current = duration > 0 && time >= duration;
        sendYouTubeCommand({ args: [time, true], func: "seekTo" });
        if (duration > 0 && time >= duration) {
          executePause();
          setPlaybackStatus("IDLE");
        }
      } else if (audioRef.current) {
        audioRef.current.currentTime = time;
      }

      if (playbackStatusRef.current === "PLAYING_SEGMENT" && !autoPlay) {
        const curSeg = findSegmentAtTime(time);
        stopBoundarySecondsRef.current = curSeg ? curSeg.end_time_ms / 1000 : null;
      } else if (playbackStatusRef.current !== "PLAYING_SEGMENT") {
        setPlaybackStatus("PAUSED_MANUAL");
        stopBoundarySecondsRef.current = null;
      }
    },
    [autoPlay, duration, executePause, findSegmentAtTime, isYouTube, sendYouTubeCommand],
  );

  const changePlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      if (isYouTube) {
        sendYouTubeCommand({ args: [rate], func: "setPlaybackRate" });
        return;
      }

      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
    },
    [isYouTube, sendYouTubeCommand],
  );

  // Synchronize normalized state from YouTube IFrame events
  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin === "string" &&
        !event.origin.includes("youtube.com") &&
        !event.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      let payload: {
        event?: string;
        info?:
          | number
          | {
              currentTime?: number;
              duration?: number;
              playbackRate?: number;
              playerState?: number;
            };
      };

      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
      } else if (typeof event.data === "object" && event.data !== null) {
        payload = event.data;
      } else {
        return;
      }

      if (!payload) return;

      // Handle onReady / initialDelivery / onStateChange
      if (payload.event === "onReady" || payload.event === "initialDelivery") {
        syncYouTubeVolume();
      }

      if (payload.event === "onStateChange") {
        const state = payload.info;
        if (state === 1) {
          // Video is playing
          syncYouTubeVolume();
          if (playbackStatusRef.current === "PAUSED_AT_BOUNDARY") {
            togglePlay();
            return;
          }
          if (playbackStatusRef.current !== "PLAYING_SEGMENT") {
            setPlaybackStatus("PLAYING_SEGMENT");
          }
          hasReachedEndRef.current = false;
        } else if (state === 2) {
          // Video paused
          if (playbackStatusRef.current === "PLAYING_SEGMENT") {
            setPlaybackStatus("PAUSED_MANUAL");
          }
        } else if (state === 0) {
          // Video ended
          setPlaybackStatus("IDLE");
          setCurrentTime(0);
          hasReachedEndRef.current = true;
          stopBoundarySecondsRef.current = null;
        }
      } else if (payload.event === "infoDelivery" || payload.event === "initialDelivery") {
        const info = payload.info;
        if (info && typeof info === "object") {
          if (typeof info.currentTime === "number") {
            const time = info.currentTime;
            if (playbackStatusRef.current === "PAUSED_AT_BOUNDARY") {
              return;
            }
            if (checkAndHandleBoundary(time)) {
              return;
            }
            setCurrentTime(time);
          }
          if (typeof info.duration === "number" && info.duration > 0) {
            setAudioDuration(info.duration);
          }
          if (typeof info.playbackRate === "number") {
            setPlaybackRate(info.playbackRate);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    const timer = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        YOUTUBE_ORIGIN,
      );
      syncYouTubeVolume();
    }, 500);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timer);
    };
  }, [checkAndHandleBoundary, isYouTube, syncYouTubeVolume, togglePlay]);

  // HTML5 audio handler for direct audio files
  useEffect(() => {
    if (isYouTube || !src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume / 100;
    audio.muted = isMuted;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
      audio.volume = isMuted ? 0 : volume / 100;
      audio.muted = isMuted;
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      if (checkAndHandleBoundary(audio.currentTime)) {
        return;
      }
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setPlaybackStatus("IDLE");
      setCurrentTime(0);
      stopBoundarySecondsRef.current = null;
    };

    const handleError = () => {
      setHasError(true);
      setPlaybackStatus("IDLE");
      stopBoundarySecondsRef.current = null;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [checkAndHandleBoundary, initialDuration, isMuted, isYouTube, playbackRate, src, volume]);

  // YouTube progress tracking timer for smooth interpolated updates
  useEffect(() => {
    if (!isYouTube || playbackStatus !== "PLAYING_SEGMENT") return;

    const intervalId = window.setInterval(() => {
      if (playbackStatusRef.current !== "PLAYING_SEGMENT") return;

      setCurrentTime((prevTime) => {
        const maxDuration = duration > 0 ? duration : 9999;
        const nextTime = Math.min(prevTime + 0.1 * playbackRate, maxDuration);

        if (checkAndHandleBoundary(nextTime)) {
          return stopBoundarySecondsRef.current ?? nextTime;
        }

        if (duration > 0 && nextTime >= duration && !hasReachedEndRef.current) {
          hasReachedEndRef.current = true;
          executePause();
          setPlaybackStatus("IDLE");
        }

        return nextTime;
      });
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkAndHandleBoundary, duration, executePause, isYouTube, playbackRate, playbackStatus]);

  return {
    changePlaybackRate,
    currentTime,
    duration,
    handleIframeLoad,
    hasError,
    iframeRef,
    isMuted,
    isPlaying,
    isYouTube,
    pause,
    play,
    playbackRate,
    playbackStatus,
    playFrom,
    playSegment,
    seek,
    setStopAtSeconds,
    setVolume,
    toggleMute,
    togglePlay,
    volume,
    youtubeVideoId,
  };
}

export type AudioPlayerState = ReturnType<typeof useAudioPlayer>;
