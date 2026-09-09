"use client";

import type { ShadowingAttemptReviewResponse } from "@kaiwa-app/api-client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAudioPlayer } from "./use-audio-player";
import { useShadowingShortcuts } from "./use-shadowing-shortcuts";

export function useShadowingReview(review: ShadowingAttemptReviewResponse) {
  const isContinuous = review.mode === "continuous";
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [playingUserIndex, setPlayingUserIndex] = useState<number | null>(null);
  const [isPlayingContinuousVoice, setIsPlayingContinuousVoice] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const continuousAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  const cleanupUserAudio = useCallback(() => {
    const audio = userAudioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.onended = null;
    audio.removeAttribute("src");
    audio.load();
    userAudioRef.current = null;
  }, []);

  useEffect(() => cleanupUserAudio, [cleanupUserAudio]);

  useEffect(() => {
    if (!review.user_continuous_recording_url) return;

    const audio = new Audio(review.user_continuous_recording_url);
    continuousAudioRef.current = audio;

    const handleEnded = () => setIsPlayingContinuousVoice(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [review.user_continuous_recording_url]);

  const playerSegments = useMemo(
    () =>
      review.segments.map((segment) => ({
        end_time_ms: segment.end_time_ms ?? 0,
        start_time_ms: segment.start_time_ms ?? 0,
      })),
    [review.segments],
  );

  const player = useAudioPlayer(review.audio_url ?? "", 0, {
    autoPause: true,
    autoPlay: false,
    segments: isContinuous ? [] : playerSegments,
  });

  const activeOriginalIndex =
    player.isPlaying && review.segments.length > 0
      ? review.segments.findIndex(
          (segment) =>
            player.currentTime >= (segment.start_time_ms ?? 0) / 1000 - 0.05 &&
            player.currentTime < (segment.end_time_ms ?? 0) / 1000,
        )
      : -1;

  const selectReview = useCallback(
    (index: number) => {
      setSelectedReviewIndex(index);
      if (player.isPlaying) {
        player.pause();
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
      }
      const segment = review.segments[index];
      if (segment && review.audio_url) {
        player.seek((segment.start_time_ms ?? 0) / 1000);
      }
    },
    [player, review.audio_url, review.segments],
  );

  const handlePlayOriginalSegment = useCallback(
    (index: number, startMs: number, endMs: number) => {
      if (!review.audio_url) return;

      setSelectedReviewIndex(index);

      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
      }
      if (continuousAudioRef.current) {
        continuousAudioRef.current.pause();
        setIsPlayingContinuousVoice(false);
      }

      if (activeOriginalIndex === index && player.isPlaying) {
        player.pause();
        return;
      }

      if (isContinuous) {
        player.seek(startMs / 1000);
        player.play();
      } else {
        player.playSegment(startMs / 1000, endMs / 1000);
      }
    },
    [activeOriginalIndex, isContinuous, player, review.audio_url],
  );

  const handlePlayUserRecording = useCallback(
    (index: number, url: string | null | undefined) => {
      if (!url) return;

      setSelectedReviewIndex(index);

      if (player.isPlaying) {
        player.pause();
      }

      if (playingUserIndex === index && userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
        return;
      }

      if (!userAudioRef.current) {
        userAudioRef.current = new Audio(url);
      }

      const audio = userAudioRef.current;
      audio.src = url;
      setPlayingUserIndex(index);

      audio.play().catch(() => setPlayingUserIndex(null));
      audio.onended = () => setPlayingUserIndex(null);
    },
    [player, playingUserIndex],
  );

  const toggleContinuousVoicePlayback = useCallback(() => {
    if (!continuousAudioRef.current) return;

    if (isPlayingContinuousVoice) {
      continuousAudioRef.current.pause();
      setIsPlayingContinuousVoice(false);
    } else {
      if (player.isPlaying) {
        player.pause();
      }
      continuousAudioRef.current
        .play()
        .then(() => setIsPlayingContinuousVoice(true))
        .catch(() => setIsPlayingContinuousVoice(false));
    }
  }, [isPlayingContinuousVoice, player]);

  const handlePreviousSegment = useCallback(() => {
    if (selectedReviewIndex > 0) {
      const nextIndex = selectedReviewIndex - 1;
      setSelectedReviewIndex(nextIndex);
      if (player.isPlaying) {
        player.pause();
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
      }
      const segment = review.segments[nextIndex];
      if (segment && review.audio_url) {
        player.seek((segment.start_time_ms ?? 0) / 1000);
      }
    }
  }, [player, review.audio_url, review.segments, selectedReviewIndex]);

  const handleNextSegment = useCallback(() => {
    if (selectedReviewIndex < review.segments.length - 1) {
      const nextIndex = selectedReviewIndex + 1;
      setSelectedReviewIndex(nextIndex);
      if (player.isPlaying) {
        player.pause();
      }
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setPlayingUserIndex(null);
      }
      const segment = review.segments[nextIndex];
      if (segment && review.audio_url) {
        player.seek((segment.start_time_ms ?? 0) / 1000);
      }
    }
  }, [player, review.audio_url, review.segments, selectedReviewIndex]);

  const handleReplaySegment = useCallback(() => {
    const segment = review.segments[selectedReviewIndex];
    if (!segment) return;

    if (userAudioRef.current) {
      userAudioRef.current.pause();
      setPlayingUserIndex(null);
    }

    player.playSegment((segment.start_time_ms ?? 0) / 1000, (segment.end_time_ms ?? 0) / 1000);
  }, [player, review.segments, selectedReviewIndex]);

  const handleTogglePlay = useCallback(() => {
    if (isContinuous) {
      player.togglePlay();
      return;
    }

    const segment = review.segments[selectedReviewIndex];
    if (!segment) return;

    if (player.isPlaying) {
      player.pause();
    } else {
      handlePlayOriginalSegment(
        selectedReviewIndex,
        segment.start_time_ms ?? 0,
        segment.end_time_ms ?? 0,
      );
    }
  }, [handlePlayOriginalSegment, isContinuous, player, review.segments, selectedReviewIndex]);

  useShadowingShortcuts({
    onNext: isContinuous ? undefined : handleNextSegment,
    onPrevious: isContinuous ? undefined : handlePreviousSegment,
    onTogglePlay: handleTogglePlay,
  });

  const activeFocusIndex =
    isContinuous && activeOriginalIndex >= 0 ? activeOriginalIndex : selectedReviewIndex;

  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeFocusIndex]);

  const activeSegment = review.segments[selectedReviewIndex];
  const isPlayingActiveOriginal =
    player.isPlaying && (activeOriginalIndex === selectedReviewIndex || activeOriginalIndex === -1);
  const isPlayingUser = playingUserIndex === selectedReviewIndex;

  return {
    activeOriginalIndex,
    activeSegment,
    activeSegmentRef,
    handleNextSegment,
    handlePlayOriginalSegment,
    handlePlayUserRecording,
    handlePreviousSegment,
    handleReplaySegment,
    handleTogglePlay,
    isContinuous,
    isLoopEnabled: player.isLoopEnabled,
    isPlayingActiveOriginal,
    isPlayingContinuousVoice,
    isPlayingUser,
    player,
    playingUserIndex,
    selectReview,
    selectedReviewIndex,
    toggleContinuousVoicePlayback,
    toggleLoop: player.toggleLoop,
  };
}
