"use client";

import { CircleGaugeIcon, Headphones, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function formatPlaybackTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

export function DictationAudioPlayer({
  durationSeconds,
  lessonTitle,
}: {
  durationSeconds: number;
  lessonTitle: string;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(1);
  const playbackRate = PLAYBACK_RATES[playbackRateIndex] ?? 1;
  const isPlaybackActive = isPlaying && elapsedSeconds < durationSeconds;

  useEffect(() => {
    if (!isPlaybackActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) =>
        Math.min(durationSeconds, currentSeconds + 0.25 * playbackRate),
      );
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds, isPlaybackActive, playbackRate]);

  const handleTogglePlayback = () => {
    if (isPlaybackActive) {
      setIsPlaying(false);
      return;
    }

    if (elapsedSeconds >= durationSeconds) {
      setElapsedSeconds(0);
    }

    if (elapsedSeconds === 0 || elapsedSeconds >= durationSeconds) {
      setListenCount((count) => count + 1);
    }

    setIsPlaying(true);
  };

  const handleReplay = () => {
    setElapsedSeconds(0);
    setListenCount((count) => count + 1);
    setIsPlaying(true);
  };

  const handlePlaybackRateChange = () => {
    setPlaybackRateIndex((currentIndex) => (currentIndex + 1) % PLAYBACK_RATES.length);
  };

  return (
    <section
      aria-labelledby="dictation-audio-heading"
      className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-border bg-main px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-main-foreground"
    >
      <div className="mx-auto grid w-full max-w-[1300px] gap-2 sm:grid-cols-[minmax(180px,0.7fr)_minmax(320px,1.5fr)_auto] sm:items-center sm:gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow">
            <Headphones aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm" id="dictation-audio-heading">
                Dictation audio
              </h2>
            </div>
            <p className="truncate text-xs text-main-foreground/65">{lessonTitle}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label={isPlaybackActive ? "Pause lesson audio" : "Play lesson audio"}
            onClick={handleTogglePlayback}
            size="icon"
            type="button"
            variant="neutral"
          >
            {isPlaybackActive ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
          <Slider
            aria-label="Lesson audio position"
            max={durationSeconds}
            onValueChange={(values) => setElapsedSeconds(values.at(0) ?? 0)}
            step={0.25}
            value={[elapsedSeconds]}
          />
          <span className="min-w-[76px] text-right text-xs font-heading tabular-nums">
            {formatPlaybackTime(elapsedSeconds)} / {formatPlaybackTime(durationSeconds)}
          </span>
        </div>

        <div className="hidden items-center justify-end gap-2 sm:flex">
          <Button onClick={handleReplay} size="sm" type="button" variant="neutral">
            <RotateCcw aria-hidden="true" />
            Replay
          </Button>
          <Button
            aria-label={`Playback speed ${playbackRate} times. Change speed`}
            onClick={handlePlaybackRateChange}
            size="sm"
            type="button"
            variant="neutral"
          >
            <CircleGaugeIcon aria-hidden="true" className="size-4" />
            {playbackRate}× speed
          </Button>
          <span className="hidden min-w-[64px] text-right text-xs font-heading lg:block">
            {listenCount === 0 ? "Not played" : `Played ${listenCount}×`}
          </span>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {isPlaybackActive ? "Audio is playing" : "Audio is paused"}
      </p>
    </section>
  );
}
