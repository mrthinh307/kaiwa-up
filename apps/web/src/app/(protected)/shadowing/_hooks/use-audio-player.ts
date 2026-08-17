"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";

type YouTubeCommand = {
  args?: Array<boolean | number>;
  func: "pauseVideo" | "playVideo" | "seekTo" | "setPlaybackRate";
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

export function useAudioPlayer(src: string, initialDuration = 0) {
  const youtubeVideoId = useMemo(() => getYouTubeVideoId(src), [src]);
  const isYouTube = Boolean(youtubeVideoId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasReachedEndRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  const duration = audioDuration > 0 ? audioDuration : initialDuration;

  const sendYouTubeCommand = useCallback((command: YouTubeCommand) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", ...command }),
      YOUTUBE_ORIGIN,
    );
  }, []);

  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening" }),
      YOUTUBE_ORIGIN,
    );
  }, []);

  // Synchronize bi-directional state from YouTube IFrame events
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

      // Handle onStateChange
      if (payload.event === "onStateChange") {
        const state = payload.info;
        if (state === 1) {
          // Playing
          setIsPlaying(true);
          hasReachedEndRef.current = false;
        } else if (state === 2) {
          // Paused
          setIsPlaying(false);
        } else if (state === 0) {
          // Ended
          setIsPlaying(false);
          setCurrentTime(0);
          hasReachedEndRef.current = true;
        }
      } else if (payload.event === "infoDelivery" || payload.event === "initialDelivery") {
        const info = payload.info;
        if (info && typeof info === "object") {
          if (typeof info.currentTime === "number") {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0) {
            setAudioDuration(info.duration);
          }
          if (typeof info.playbackRate === "number") {
            setPlaybackRate(info.playbackRate);
          }
          if (typeof info.playerState === "number") {
            if (info.playerState === 1) {
              setIsPlaying(true);
              hasReachedEndRef.current = false;
            } else if (info.playerState === 2) {
              setIsPlaying(false);
            } else if (info.playerState === 0) {
              setIsPlaying(false);
              setCurrentTime(0);
              hasReachedEndRef.current = true;
            }
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
    }, 500);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timer);
    };
  }, [isYouTube]);

  // HTML5 audio handler for direct audio files
  useEffect(() => {
    if (isYouTube || !src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
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
  }, [initialDuration, isYouTube, playbackRate, src]);

  // YouTube progress tracking timer for smooth interpolated updates
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;

    const intervalId = window.setInterval(() => {
      setCurrentTime((prevTime) => {
        const maxDuration = duration > 0 ? duration : 9999;
        const nextTime = Math.min(prevTime + 0.1 * playbackRate, maxDuration);

        if (duration > 0 && nextTime >= duration && !hasReachedEndRef.current) {
          hasReachedEndRef.current = true;
          setIsPlaying(false);
          sendYouTubeCommand({ func: "pauseVideo" });
        }

        return nextTime;
      });
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [duration, isPlaying, isYouTube, playbackRate, sendYouTubeCommand]);

  const togglePlay = useCallback(() => {
    if (isYouTube) {
      if (isPlaying) {
        setIsPlaying(false);
        sendYouTubeCommand({ func: "pauseVideo" });
      } else {
        hasReachedEndRef.current = false;
        const nextTime = duration > 0 && currentTime >= duration ? 0 : currentTime;
        setCurrentTime(nextTime);
        setIsPlaying(true);
        sendYouTubeCommand({ args: [nextTime, true], func: "seekTo" });
        sendYouTubeCommand({ args: [playbackRate], func: "setPlaybackRate" });
        sendYouTubeCommand({ func: "playVideo" });
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  }, [currentTime, duration, isPlaying, isYouTube, playbackRate, sendYouTubeCommand]);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (isYouTube) {
        hasReachedEndRef.current = duration > 0 && time >= duration;
        sendYouTubeCommand({ args: [time, true], func: "seekTo" });
        if (duration > 0 && time >= duration) {
          setIsPlaying(false);
          sendYouTubeCommand({ func: "pauseVideo" });
        }
        return;
      }

      if (!audioRef.current) return;
      audioRef.current.currentTime = time;
    },
    [duration, isYouTube, sendYouTubeCommand],
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

  return {
    changePlaybackRate,
    currentTime,
    duration,
    handleIframeLoad,
    hasError,
    iframeRef,
    isPlaying,
    isYouTube,
    playbackRate,
    seek,
    togglePlay,
    youtubeVideoId,
  };
}

export type AudioPlayerState = ReturnType<typeof useAudioPlayer>;
