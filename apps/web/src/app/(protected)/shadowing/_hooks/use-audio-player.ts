"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  autoPause?: boolean;
  autoPlay?: boolean;
  segments?: Array<{ end_time_ms: number; start_time_ms: number }>;
}

export function useAudioPlayer(src: string, initialDuration = 0, options?: UseAudioPlayerOptions) {
  const youtubeVideoId = useMemo(() => getYouTubeVideoId(src), [src]);
  const isYouTube = Boolean(youtubeVideoId);

  const autoPause =
    options?.autoPause ?? (options?.autoPlay !== undefined ? !options.autoPlay : false);
  const autoPauseRef = useRef(autoPause);
  useEffect(() => {
    autoPauseRef.current = autoPause;
  }, [autoPause]);

  const segments = useMemo(() => options?.segments ?? [], [options?.segments]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasReachedEndRef = useRef(false);
  const loopStartSecondsRef = useRef<number | null>(null);
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
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const isLoopEnabledRef = useRef(false);

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
      JSON.stringify({ event: "command", func: command.func, args: command.args ?? [] }),
      "*",
    );
  }, []);

  const syncYouTubeVolume = useCallback(() => {
    sendYouTubeCommand({ args: [volumeRef.current], func: "setVolume" });
    sendYouTubeCommand({ func: isMutedRef.current ? "mute" : "unMute" });
  }, [sendYouTubeCommand]);

  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
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

  const setMuted = useCallback(
    (next: boolean) => {
      setIsMuted(next);
      isMutedRef.current = next;
      if (isYouTube) {
        sendYouTubeCommand({ func: next ? "mute" : "unMute" });
      } else if (audioRef.current) {
        audioRef.current.muted = next;
        audioRef.current.volume = next ? 0 : volumeRef.current / 100;
      }
    },
    [isYouTube, sendYouTubeCommand],
  );

  const toggleMute = useCallback(() => {
    setMuted(!isMutedRef.current);
  }, [setMuted]);

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
      if (playbackStatusRef.current !== "PLAYING_SEGMENT") return false;
      if (segments.length === 0) return false;

      // 1. Loop current segment (takes highest priority)
      if (isLoopEnabledRef.current) {
        let loopBoundary = stopBoundarySecondsRef.current;
        if (loopBoundary === null) {
          const curSeg = findSegmentAtTime(timeSeconds);
          if (curSeg) {
            loopBoundary = curSeg.end_time_ms / 1000;
            loopStartSecondsRef.current = curSeg.start_time_ms / 1000;
            stopBoundarySecondsRef.current = loopBoundary;
          }
        }

        if (loopBoundary !== null && timeSeconds >= loopBoundary - 0.05) {
          const loopStart = loopStartSecondsRef.current ?? 0;
          setCurrentTime(loopStart);
          executePlay(loopStart);
          return true;
        }
        return false;
      }

      // 2. Auto-pause is disabled and no explicit stop boundary set: continue playing!
      if (!autoPauseRef.current && stopBoundarySecondsRef.current === null) {
        return false;
      }

      // 3. Auto-pause is enabled or explicit stop boundary set:
      let boundary = stopBoundarySecondsRef.current;
      if (boundary === null && autoPauseRef.current) {
        const curSeg = findSegmentAtTime(timeSeconds);
        if (curSeg) {
          boundary = curSeg.end_time_ms / 1000;
          loopStartSecondsRef.current = curSeg.start_time_ms / 1000;
          stopBoundarySecondsRef.current = boundary;
        }
      }

      if (boundary !== null && timeSeconds >= boundary - 0.05) {
        executePause();
        setCurrentTime(boundary);
        setPlaybackStatus("PAUSED_AT_BOUNDARY");
        stopBoundarySecondsRef.current = null;
        if (isYouTube) {
          sendYouTubeCommand({ args: [boundary, true], func: "seekTo" });
        }
        return true;
      }

      return false;
    },
    [executePause, executePlay, findSegmentAtTime, isYouTube, segments.length, sendYouTubeCommand],
  );

  const startPlayback = useCallback(
    (startSeconds?: number, stopSeconds: number | null = null) => {
      if (typeof startSeconds === "number") {
        loopStartSecondsRef.current = startSeconds;
      }
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
      if (isLoopEnabledRef.current && loopStartSecondsRef.current !== null) {
        const loopStartSeconds = loopStartSecondsRef.current;
        const loopSegment = findSegmentAtTime(loopStartSeconds);
        const loopStopSeconds = loopSegment ? loopSegment.end_time_ms / 1000 : null;
        setCurrentTime(loopStartSeconds);
        startPlayback(loopStartSeconds, loopStopSeconds);
        return;
      }

      if (segments.length > 0) {
        const nextIndex = findSegmentIndexAtTime(currentTime + 0.1);
        if (nextIndex >= 0 && nextIndex < segments.length) {
          const nextSeg = segments[nextIndex];
          if (nextSeg) {
            const nextStart = nextSeg.start_time_ms / 1000;
            const nextStop = autoPauseRef.current ? nextSeg.end_time_ms / 1000 : null;
            setCurrentTime(nextStart);
            startPlayback(nextStart, nextStop);
            return;
          }
        }
      }
    }

    const curSeg = autoPauseRef.current ? findSegmentAtTime(currentTime) : null;
    const stopSeconds = curSeg ? curSeg.end_time_ms / 1000 : null;
    startPlayback(undefined, stopSeconds);
  }, [
    currentTime,
    executePause,
    findSegmentAtTime,
    findSegmentIndexAtTime,
    segments,
    startPlayback,
  ]);

  const playSegment = useCallback(
    (startSeconds: number, stopSeconds: number | null = null) => {
      const shouldStopAtEnd = autoPauseRef.current || isLoopEnabledRef.current;
      const targetStop =
        stopSeconds !== null
          ? stopSeconds
          : shouldStopAtEnd
            ? (findSegmentAtTime(startSeconds)?.end_time_ms ?? 0) / 1000 || null
            : null;
      startPlayback(startSeconds, targetStop);
    },
    [findSegmentAtTime, startPlayback],
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

  const toggleLoop = useCallback(() => {
    setIsLoopEnabled((isEnabled) => {
      const nextIsEnabled = !isEnabled;
      isLoopEnabledRef.current = nextIsEnabled;
      if (nextIsEnabled && playbackStatusRef.current === "PLAYING_SEGMENT") {
        const curSeg = findSegmentAtTime(currentTime);
        if (curSeg) {
          loopStartSecondsRef.current = curSeg.start_time_ms / 1000;
          stopBoundarySecondsRef.current = curSeg.end_time_ms / 1000;
        }
      } else if (!nextIsEnabled && !autoPauseRef.current) {
        stopBoundarySecondsRef.current = null;
      }
      return nextIsEnabled;
    });
  }, [currentTime, findSegmentAtTime]);

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

      if (playbackStatusRef.current === "PLAYING_SEGMENT") {
        if (isLoopEnabledRef.current || autoPauseRef.current) {
          const curSeg = findSegmentAtTime(time);
          loopStartSecondsRef.current = curSeg ? curSeg.start_time_ms / 1000 : null;
          stopBoundarySecondsRef.current = curSeg ? curSeg.end_time_ms / 1000 : null;
        } else {
          stopBoundarySecondsRef.current = null;
        }
      } else {
        setPlaybackStatus("PAUSED_MANUAL");
        stopBoundarySecondsRef.current = null;
      }
    },
    [duration, executePause, findSegmentAtTime, isYouTube, sendYouTubeCommand],
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

      const handleStateChange = (state: number) => {
        if (state === 1) {
          // Video is playing
          syncYouTubeVolume();
          if (
            playbackStatusRef.current === "PAUSED_AT_BOUNDARY" ||
            playbackStatusRef.current === "PAUSED_MANUAL"
          ) {
            sendYouTubeCommand({ func: "pauseVideo" });
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
      };

      if (payload.event === "onStateChange" && typeof payload.info === "number") {
        handleStateChange(payload.info);
      } else if (payload.event === "infoDelivery" || payload.event === "initialDelivery") {
        const info = payload.info;
        if (info && typeof info === "object") {
          if (typeof info.playerState === "number") {
            handleStateChange(info.playerState);
          }
          if (typeof info.currentTime === "number") {
            const time = info.currentTime;
            if (playbackStatusRef.current === "PLAYING_SEGMENT") {
              if (checkAndHandleBoundary(time)) {
                return;
              }
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
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
      syncYouTubeVolume();
    }, 500);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timer);
    };
  }, [checkAndHandleBoundary, isYouTube, sendYouTubeCommand, syncYouTubeVolume]);

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

  const registerIframe = useCallback((element: HTMLIFrameElement | null) => {
    iframeRef.current = element;
  }, []);

  return {
    changePlaybackRate,
    currentTime,
    duration,
    handleIframeLoad,
    hasError,
    registerIframe,
    isMuted,
    isLoopEnabled,
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
    setMuted,
    toggleMute,
    toggleLoop,
    togglePlay,
    volume,
    youtubeVideoId,
  };
}

export type AudioPlayerState = ReturnType<typeof useAudioPlayer>;
