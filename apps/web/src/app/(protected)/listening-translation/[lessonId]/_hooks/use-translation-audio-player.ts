"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";

const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_PLAYER_STATE = { ended: 0, paused: 2, playing: 1 } as const;

type TranslationYouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIframe: () => HTMLIFrameElement;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
};

type TranslationYouTubePlayerEvent = { target: TranslationYouTubePlayer };
type TranslationYouTubePlayerStateEvent = TranslationYouTubePlayerEvent & { data: number };
type TranslationYouTubePlayerErrorEvent = { data: number };

type TranslationYouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      events: {
        onError: (event: TranslationYouTubePlayerErrorEvent) => void;
        onReady: (event: TranslationYouTubePlayerEvent) => void;
        onStateChange: (event: TranslationYouTubePlayerStateEvent) => void;
      };
      playerVars: {
        controls: number;
        disablekb: number;
        playsinline: number;
        rel: number;
      };
      videoId: string;
    },
  ) => TranslationYouTubePlayer;
};

type TranslationYouTubeGlobals = {
  YT?: TranslationYouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

let youtubeApiPromise: Promise<TranslationYouTubeApi> | undefined;

function getTranslationYouTubeGlobals(): TranslationYouTubeGlobals {
  return window as unknown as TranslationYouTubeGlobals;
}

function extractYouTubeVideoId(audioUrl: string): string | null {
  try {
    const url = new URL(audioUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean).at(0) ?? null;
    } else if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      const pathSegments = url.pathname.split("/").filter(Boolean);
      videoId =
        url.searchParams.get("v") ??
        (pathSegments[0] === "embed" || pathSegments[0] === "shorts"
          ? (pathSegments[1] ?? null)
          : null);
    }

    return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function loadYouTubeIframeApi(): Promise<TranslationYouTubeApi> {
  const youtubeGlobals = getTranslationYouTubeGlobals();

  if (youtubeGlobals.YT?.Player) {
    return Promise.resolve(youtubeGlobals.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<TranslationYouTubeApi>((resolve, reject) => {
    const resolveApi = () => {
      const readyGlobals = getTranslationYouTubeGlobals();
      if (readyGlobals.YT?.Player) {
        resolve(readyGlobals.YT);
      }
    };
    const rejectApi = () => {
      youtubeApiPromise = undefined;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    const previousReadyCallback = youtubeGlobals.onYouTubeIframeAPIReady;

    youtubeGlobals.onYouTubeIframeAPIReady = () => {
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

type TranslationAudioPlayerState = {
  audioUrl: string | null;
};

export function useTranslationAudioPlayer({ audioUrl }: TranslationAudioPlayerState) {
  const youtubeHostRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<TranslationYouTubePlayer | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    audioUrl ? null : "Audio is not available for this lesson.",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(80);
  const youtubeVideoId = useMemo(
    () => (audioUrl ? extractYouTubeVideoId(audioUrl) : null),
    [audioUrl],
  );
  const isYouTubeAudio = Boolean(youtubeVideoId);

  useEffect(() => {
    if (!youtubeVideoId) {
      return;
    }

    let isDisposed = false;

    void loadYouTubeIframeApi()
      .then((youtubeApi) => {
        const host = youtubeHostRef.current;
        if (isDisposed || !host) {
          return;
        }

        youtubePlayerRef.current = new youtubeApi.Player(host, {
          events: {
            onError: () => {
              if (!isDisposed) {
                setErrorMessage("This YouTube audio could not be played. Try again later.");
                setIsPlaying(false);
                setIsReady(false);
              }
            },
            onReady: ({ target }) => {
              if (isDisposed) {
                return;
              }

              const iframe = target.getIframe();
              iframe.setAttribute("aria-hidden", "true");
              iframe.tabIndex = -1;
              target.setVolume(80);
              setDuration(Math.max(target.getDuration(), 0));
              setErrorMessage(null);
              setIsReady(true);
            },
            onStateChange: ({ data, target }) => {
              if (isDisposed) {
                return;
              }

              setCurrentTime(Math.max(target.getCurrentTime(), 0));
              setDuration(Math.max(target.getDuration(), 0));

              if (data === YOUTUBE_PLAYER_STATE.playing) {
                setIsPlaying(true);
              } else if (
                data === YOUTUBE_PLAYER_STATE.paused ||
                data === YOUTUBE_PLAYER_STATE.ended
              ) {
                setIsPlaying(false);
              }
            },
          },
          playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
          videoId: youtubeVideoId,
        });
      })
      .catch(() => {
        if (!isDisposed) {
          setErrorMessage("The YouTube player could not be loaded. Check your connection.");
          setIsPlaying(false);
          setIsReady(false);
        }
      });

    return () => {
      isDisposed = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [youtubeVideoId]);

  useEffect(() => {
    if (!isPlaying || !isYouTubeAudio) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) {
        return;
      }

      setCurrentTime(Math.max(player.getCurrentTime(), 0));
      setDuration(Math.max(player.getDuration(), 0));
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, isYouTubeAudio]);

  const play = useCallback(() => {
    if (youtubeVideoId) {
      youtubePlayerRef.current?.playVideo();
      return;
    }

    const audio = nativeAudioRef.current;
    if (!audio) {
      return;
    }

    void audio.play().catch(() => {
      setErrorMessage("This audio could not be played. Check the media source and try again.");
      setIsPlaying(false);
    });
  }, [youtubeVideoId]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (youtubeVideoId) {
        youtubePlayerRef.current?.pauseVideo();
      } else {
        nativeAudioRef.current?.pause();
      }
      return;
    }

    play();
  };

  const handleReplay = () => {
    if (youtubeVideoId) {
      youtubePlayerRef.current?.seekTo(0, true);
    } else if (nativeAudioRef.current) {
      nativeAudioRef.current.currentTime = 0;
    }

    setCurrentTime(0);
    play();
  };

  const handleSeek = (values: number[]) => {
    const nextTime = values[0];
    if (typeof nextTime !== "number") {
      return;
    }

    setCurrentTime(nextTime);
    if (youtubeVideoId) {
      youtubePlayerRef.current?.seekTo(nextTime, true);
    } else if (nativeAudioRef.current) {
      nativeAudioRef.current.currentTime = nextTime;
    }
  };

  const handleVolumeChange = (values: number[]) => {
    const nextVolume = values[0];
    if (typeof nextVolume !== "number") {
      return;
    }

    setVolume(nextVolume);
    youtubePlayerRef.current?.setVolume(nextVolume);
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = nextVolume / 100;
    }
  };

  const handleNativeDurationChange = (event: SyntheticEvent<HTMLAudioElement>) => {
    setDuration(event.currentTarget.duration || 0);
  };

  const handleNativeEnded = () => setIsPlaying(false);

  const handleNativeError = () => {
    setErrorMessage("This audio source could not be loaded.");
    setIsPlaying(false);
    setIsReady(false);
  };

  const handleNativeLoadedMetadata = (event: SyntheticEvent<HTMLAudioElement>) => {
    event.currentTarget.volume = volume / 100;
    setDuration(event.currentTarget.duration || 0);
    setErrorMessage(null);
    setIsReady(true);
  };

  const handleNativePause = () => setIsPlaying(false);
  const handleNativePlay = () => setIsPlaying(true);
  const handleNativeTimeUpdate = (event: SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(event.currentTarget.currentTime);
  };

  return {
    currentTime,
    duration,
    errorMessage,
    handleNativeDurationChange,
    handleNativeEnded,
    handleNativeError,
    handleNativeLoadedMetadata,
    handleNativePause,
    handleNativePlay,
    handleNativeTimeUpdate,
    handlePlayPause,
    handleReplay,
    handleSeek,
    handleVolumeChange,
    isControlDisabled: !audioUrl || !isReady || Boolean(errorMessage),
    isPlaying,
    nativeAudioRef,
    volume,
    youtubeHostRef,
    youtubeVideoId,
  };
}
