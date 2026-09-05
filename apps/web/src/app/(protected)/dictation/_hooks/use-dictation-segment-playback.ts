"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getYouTubeVideoId } from "../_utils/dictation-formatters";

type UseDictationSegmentPlaybackOptions = {
  activeSegmentIndex: number;
  activeSegmentStartTimeMs: number;
  audioUrl: string;
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  initialAutoPlayEnabled?: boolean;
  isLastSegment: boolean;
  onNext: () => void;
  onReplay: () => void;
  playbackRequest: number;
  resetAudioOnSegmentChange?: boolean;
};

export function useDictationSegmentPlayback({
  activeSegmentIndex,
  activeSegmentStartTimeMs,
  audioUrl,
  autoPlayDelayMs,
  autoPlayOnSegmentChange,
  initialAutoPlayEnabled = false,
  isLastSegment,
  onNext,
  onReplay,
  playbackRequest,
  resetAudioOnSegmentChange = true,
}: UseDictationSegmentPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scheduledPlaybackTimeoutRef = useRef<number | null>(null);
  const shouldContinuePlaybackRef = useRef(false);
  const previousAutoPlayEnabledRef = useRef(initialAutoPlayEnabled);
  const previousSegmentIndexRef = useRef(activeSegmentIndex);
  const lastPlaybackRequestRef = useRef(playbackRequest);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const youtubeVideoId = useMemo(() => getYouTubeVideoId(audioUrl), [audioUrl]);

  const clearScheduledPlayback = useCallback(() => {
    if (scheduledPlaybackTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(scheduledPlaybackTimeoutRef.current);
    scheduledPlaybackTimeoutRef.current = null;
  }, []);

  const schedulePlayback = useCallback(() => {
    clearScheduledPlayback();
    scheduledPlaybackTimeoutRef.current = window.setTimeout(() => {
      scheduledPlaybackTimeoutRef.current = null;
      onReplay();
    }, autoPlayDelayMs);
  }, [autoPlayDelayMs, clearScheduledPlayback, onReplay]);

  useEffect(() => clearScheduledPlayback, [clearScheduledPlayback]);

  useEffect(() => {
    const wasAutoPlayEnabled = previousAutoPlayEnabledRef.current;
    previousAutoPlayEnabledRef.current = autoPlayOnSegmentChange;

    if (!autoPlayOnSegmentChange) {
      shouldContinuePlaybackRef.current = false;
      clearScheduledPlayback();
      return;
    }

    if (!wasAutoPlayEnabled) {
      schedulePlayback();
    }
  }, [autoPlayOnSegmentChange, clearScheduledPlayback, schedulePlayback]);

  useEffect(() => {
    const hasSegmentChanged = previousSegmentIndexRef.current !== activeSegmentIndex;
    previousSegmentIndexRef.current = activeSegmentIndex;

    if (!hasSegmentChanged || !autoPlayOnSegmentChange || shouldContinuePlaybackRef.current) {
      return;
    }

    schedulePlayback();
  }, [activeSegmentIndex, autoPlayOnSegmentChange, schedulePlayback]);

  useEffect(() => {
    if (!shouldContinuePlaybackRef.current) {
      return;
    }

    shouldContinuePlaybackRef.current = false;
    schedulePlayback();
  }, [activeSegmentIndex, schedulePlayback]);

  useEffect(() => {
    if (!resetAudioOnSegmentChange) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = activeSegmentStartTimeMs / 1_000;
  }, [activeSegmentIndex, activeSegmentStartTimeMs, resetAudioOnSegmentChange]);

  useEffect(() => {
    if (playbackRequest === lastPlaybackRequestRef.current) {
      return;
    }

    lastPlaybackRequestRef.current = playbackRequest;
    const audio = audioRef.current;
    if (playbackRequest === 0 || !audio) {
      return;
    }

    audio.currentTime = activeSegmentStartTimeMs / 1_000;
    void audio.play().catch(() => undefined);
  }, [activeSegmentStartTimeMs, playbackRequest]);

  const handleReplay = useCallback(() => {
    onReplay();
  }, [onReplay]);

  const handleLoopToggle = useCallback(() => {
    setIsLoopEnabled((isEnabled) => !isEnabled);
  }, []);

  const handlePlaybackEnded = useCallback(() => {
    if (!autoPlayOnSegmentChange || isLastSegment) {
      return;
    }

    shouldContinuePlaybackRef.current = true;
    onNext();
  }, [autoPlayOnSegmentChange, isLastSegment, onNext]);

  const handleNativePlaybackBoundary = useCallback(
    (audio: HTMLAudioElement) => {
      if (isLoopEnabled) {
        audio.currentTime = activeSegmentStartTimeMs / 1_000;
        void audio.play().catch(() => undefined);
        return;
      }

      audio.pause();
      handlePlaybackEnded();
    },
    [activeSegmentStartTimeMs, handlePlaybackEnded, isLoopEnabled],
  );

  const handlePlaybackStop = useCallback(() => {
    shouldContinuePlaybackRef.current = false;
    clearScheduledPlayback();
  }, [clearScheduledPlayback]);

  return {
    audioRef,
    handleLoopToggle,
    handleNativePlaybackBoundary,
    handlePlaybackEnded,
    handlePlaybackStop,
    handleReplay,
    isLoopEnabled,
    youtubeVideoId,
  };
}
