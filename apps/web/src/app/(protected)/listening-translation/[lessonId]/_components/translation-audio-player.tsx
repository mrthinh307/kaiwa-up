"use client";

import { AlertCircle, Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_PLAYER_STATE = { ended: 0, paused: 2, playing: 1 } as const;

type TranslationAudioPlayerProps = {
  audioUrl: string | null;
  lessonTitle: string;
};

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

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

export function TranslationAudioPlayer({ audioUrl, lessonTitle }: TranslationAudioPlayerProps) {
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

  const isControlDisabled = !audioUrl || !isReady || Boolean(errorMessage);

  return (
    <section aria-labelledby="translation-audio-heading">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full border-2 border-border bg-main text-main-foreground shadow-shadow">
          <Headphones aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-heading tracking-wide text-foreground/60 uppercase">
            Listening prompt
          </p>
          <h2 className="font-heading text-xl" id="translation-audio-heading">
            Listen before you translate
          </h2>
        </div>
      </div>

      {errorMessage ? (
        <Alert className="mt-5" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Audio unavailable</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 rounded-base border-2 border-border bg-background p-4 sm:p-5">
        {youtubeVideoId ? (
          <div aria-hidden="true" className="absolute size-px overflow-hidden" tabIndex={-1}>
            <div ref={youtubeHostRef} />
          </div>
        ) : audioUrl ? (
          <audio
            className="hidden"
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setErrorMessage("This audio source could not be loaded.");
              setIsPlaying(false);
              setIsReady(false);
            }}
            onLoadedMetadata={(event) => {
              event.currentTarget.volume = volume / 100;
              setDuration(event.currentTarget.duration || 0);
              setErrorMessage(null);
              setIsReady(true);
            }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            preload="metadata"
            ref={nativeAudioRef}
            src={audioUrl}
          />
        ) : null}

        <div className="flex items-center gap-3">
          <Button
            aria-label={isPlaying ? "Pause lesson audio" : "Play lesson audio"}
            disabled={isControlDisabled}
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
          <Button
            aria-label="Replay lesson audio from the beginning"
            disabled={isControlDisabled}
            onClick={handleReplay}
            size="icon"
            type="button"
            variant="neutral"
          >
            <RotateCcw aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs font-heading tabular-nums">
              <span className="truncate">{lessonTitle}</span>
              <span className="shrink-0 text-foreground/60">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <Slider
              aria-label="Audio playback position"
              className="mt-3"
              disabled={isControlDisabled}
              max={Math.max(duration, 1)}
              min={0}
              onValueChange={handleSeek}
              step={0.1}
              value={[Math.min(currentTime, Math.max(duration, 1))]}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t-2 border-border pt-4">
          <Volume2 aria-hidden="true" className="size-5 shrink-0" />
          <Slider
            aria-label={`Audio volume ${Math.round(volume)} percent`}
            disabled={isControlDisabled}
            max={100}
            min={0}
            onValueChange={handleVolumeChange}
            step={1}
            value={[volume]}
          />
          <span className="w-10 text-right text-xs font-heading tabular-nums">{volume}%</span>
        </div>
      </div>
    </section>
  );
}
