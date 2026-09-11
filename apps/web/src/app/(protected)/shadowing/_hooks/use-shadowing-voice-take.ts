"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AudioPlayerState } from "./use-audio-player";
import type { RecordedAudio } from "./use-voice-recorder";

import { useVoiceRecorder } from "./use-voice-recorder";

interface UseShadowingVoiceTakeOptions {
  activeSegmentIndex: number;
  autoSplitRecording?: boolean;
  isRecorded?: boolean;
  onRecordComplete: (data: {
    audioBlob: Blob | null;
    durationMs: number;
    segmentIndex?: number;
  }) => void;
  isContinuous: boolean;
  player: AudioPlayerState;
  savedAudioUrl?: string;
  savedDurationSeconds?: number;
}

export function useShadowingVoiceTake({
  activeSegmentIndex,
  autoSplitRecording = false,
  isRecorded = false,
  isContinuous,
  onRecordComplete,
  player,
  savedAudioUrl,
  savedDurationSeconds = 0,
}: UseShadowingVoiceTakeOptions) {
  const recordingSegmentIndexRef = useRef<number>(activeSegmentIndex);
  const {
    audioUrl,
    errorMessage,
    recordingTime,
    resetRecording,
    startRecording,
    status: recorderStatus,
    stopRecording,
  } = useVoiceRecorder(
    useCallback(
      (take: RecordedAudio) => {
        onRecordComplete({ ...take, segmentIndex: recordingSegmentIndexRef.current });
      },
      [onRecordComplete],
    ),
  );

  const [isPlayingSelf, setIsPlayingSelf] = useState(false);
  const [isReRecording, setIsReRecording] = useState(false);
  const [isAutoComparing, setIsAutoComparing] = useState(false);
  const selfAudioRef = useRef<HTMLAudioElement | null>(null);
  const isFinalizingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const continuationVersionRef = useRef(0);
  const isComparingRef = useRef(false);
  const [recordedForSegmentIndex, setRecordedForSegmentIndex] = useState<number | null>(null);
  const prevActiveSegmentRef = useRef<number>(activeSegmentIndex);
  const latestSegmentIndexRef = useRef(activeSegmentIndex);
  useEffect(() => {
    latestSegmentIndexRef.current = activeSegmentIndex;
  }, [activeSegmentIndex]);
  const wasMutedBeforeRecordingRef = useRef<boolean | null>(null);

  const isCurrentSegmentLocalTake = recordedForSegmentIndex === activeSegmentIndex;
  const currentLocalAudioUrl = isCurrentSegmentLocalTake ? audioUrl : null;
  const effectiveAudioUrl = currentLocalAudioUrl || savedAudioUrl;

  const isRecording = recorderStatus === "recording";

  const handleStartRecording = useCallback(() => {
    if (
      isFinalizingRef.current ||
      isTransitioningRef.current ||
      recorderStatus === "recording" ||
      recorderStatus === "requesting_permission"
    )
      return;
    setIsReRecording(false);
    setIsAutoComparing(false);

    recordingSegmentIndexRef.current = activeSegmentIndex;
    setRecordedForSegmentIndex(activeSegmentIndex);

    if (!isContinuous) {
      if (wasMutedBeforeRecordingRef.current === null) {
        wasMutedBeforeRecordingRef.current = player.isMuted;
      }
      if (!player.isMuted) {
        player.setMuted(true);
      }
    }

    if (isPlayingSelf && selfAudioRef.current) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    }
    if (!autoSplitRecording && !isContinuous && player.isPlaying) {
      player.pause();
    }
    void startRecording();
  }, [
    activeSegmentIndex,
    autoSplitRecording,
    isContinuous,
    isPlayingSelf,
    player,
    recorderStatus,
    startRecording,
  ]);

  const handleStopRecording = useCallback(() => {
    continuationVersionRef.current += 1;
    void stopRecording();

    // Restore volume when recording is stopped
    if (wasMutedBeforeRecordingRef.current !== null) {
      const wasMuted = wasMutedBeforeRecordingRef.current;
      wasMutedBeforeRecordingRef.current = null;
      if (!wasMuted && player.isMuted) {
        player.setMuted(false);
      }
    }
  }, [player, stopRecording]);

  const handleToggleRecord = useCallback(() => {
    if (recorderStatus === "recording") {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [handleStartRecording, handleStopRecording, recorderStatus]);

  // Finish the old take before clearing its preview or starting the next segment.
  useEffect(() => {
    if (prevActiveSegmentRef.current === activeSegmentIndex) return;
    prevActiveSegmentRef.current = activeSegmentIndex;
    if (isTransitioningRef.current) return;
    selfAudioRef.current?.pause();
    setIsPlayingSelf(false);
    setIsAutoComparing(false);
    isComparingRef.current = false;
    setIsReRecording(false);
    const wasRecording =
      recorderStatus === "recording" || recorderStatus === "requesting_permission";
    const continuationVersion = continuationVersionRef.current;
    isTransitioningRef.current = true;
    void stopRecording().then(() => {
      resetRecording();
      setRecordedForSegmentIndex(null);
      isTransitioningRef.current = false;
      if (
        wasRecording &&
        autoSplitRecording &&
        !isFinalizingRef.current &&
        continuationVersion === continuationVersionRef.current
      ) {
        recordingSegmentIndexRef.current = latestSegmentIndexRef.current;
        setRecordedForSegmentIndex(latestSegmentIndexRef.current);
        void startRecording();
      } else if (wasMutedBeforeRecordingRef.current !== null) {
        player.setMuted(wasMutedBeforeRecordingRef.current);
        wasMutedBeforeRecordingRef.current = null;
      }
    });
  }, [
    activeSegmentIndex,
    autoSplitRecording,
    player,
    recorderStatus,
    resetRecording,
    startRecording,
    stopRecording,
  ]);

  const finalizeRecording = useCallback(async () => {
    isFinalizingRef.current = true;
    continuationVersionRef.current += 1;
    player.pause();
    selfAudioRef.current?.pause();
    const needsFinalTake =
      recorderStatus === "recording" || recorderStatus === "requesting_permission";
    const take = await stopRecording();
    if (wasMutedBeforeRecordingRef.current !== null) {
      player.setMuted(wasMutedBeforeRecordingRef.current);
      wasMutedBeforeRecordingRef.current = null;
    }
    if (needsFinalTake && (!take || take.audioBlob.size === 0)) {
      throw new Error("The last recording could not be saved. Please record this segment again.");
    }
    return take;
  }, [player, recorderStatus, stopRecording]);
  const resumeRecording = useCallback(() => {
    isFinalizingRef.current = false;
  }, []);

  // If microphone permission is denied or recorder errors, restore mute state
  useEffect(() => {
    if (recorderStatus === "error" || recorderStatus === "permission_denied") {
      if (wasMutedBeforeRecordingRef.current !== null) {
        const wasMuted = wasMutedBeforeRecordingRef.current;
        wasMutedBeforeRecordingRef.current = null;
        if (!wasMuted && player.isMuted) {
          player.setMuted(false);
        }
      }
    }
  }, [player, recorderStatus]);

  // Keep a player ref for unmount cleanup to avoid re-triggering effects during render
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  });

  useEffect(() => {
    return () => {
      if (wasMutedBeforeRecordingRef.current === false) {
        playerRef.current.setMuted(false);
      }
    };
  }, []);

  // Synchronize student self-audio instance
  useEffect(() => {
    if (!effectiveAudioUrl) {
      if (selfAudioRef.current) {
        selfAudioRef.current.pause();
        selfAudioRef.current = null;
      }
      return;
    }

    const audio = new Audio(effectiveAudioUrl);
    selfAudioRef.current = audio;

    const handleEnded = () => {
      setIsPlayingSelf(false);
      setIsAutoComparing(false);
      isComparingRef.current = false;
    };
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [effectiveAudioUrl]);

  const togglePlaySelf = useCallback(() => {
    if (!effectiveAudioUrl) return;

    if (!selfAudioRef.current) {
      selfAudioRef.current = new Audio(effectiveAudioUrl);
      selfAudioRef.current.addEventListener("ended", () => {
        setIsPlayingSelf(false);
        setIsAutoComparing(false);
        isComparingRef.current = false;
      });
    }

    if (isPlayingSelf) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
      setIsAutoComparing(false);
      isComparingRef.current = false;
    } else {
      if (player.isPlaying) {
        player.pause();
      }
      selfAudioRef.current
        .play()
        .then(() => setIsPlayingSelf(true))
        .catch(() => setIsPlayingSelf(false));
    }
  }, [effectiveAudioUrl, isPlayingSelf, player]);

  const handleResetRecord = useCallback(() => {
    setRecordedForSegmentIndex(null);
    setIsReRecording(true);
    setIsAutoComparing(false);
    isComparingRef.current = false;
    if (isPlayingSelf && selfAudioRef.current) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    }
    resetRecording();
  }, [isPlayingSelf, resetRecording]);

  const hasCompletedRecording =
    !isReRecording &&
    ((isCurrentSegmentLocalTake && recorderStatus === "recorded") ||
      (isRecorded && (savedDurationSeconds > 0 || Boolean(savedAudioUrl))));

  const displayDuration =
    isCurrentSegmentLocalTake && recorderStatus === "recorded"
      ? recordingTime
      : savedDurationSeconds || (isCurrentSegmentLocalTake ? recordingTime : 0);

  // A/B Comparison: Play Model Audio first, then automatically play user voice
  const handleAutoCompare = useCallback(() => {
    if (!effectiveAudioUrl) return;

    if (isAutoComparing) {
      setIsAutoComparing(false);
      isComparingRef.current = false;
      if (player.isPlaying) player.pause();
      if (isPlayingSelf && selfAudioRef.current) {
        selfAudioRef.current.pause();
        setIsPlayingSelf(false);
      }
      return;
    }

    setIsAutoComparing(true);
    isComparingRef.current = true;
    if (isPlayingSelf && selfAudioRef.current) {
      selfAudioRef.current.pause();
      setIsPlayingSelf(false);
    }

    player.play();
  }, [effectiveAudioUrl, isAutoComparing, isPlayingSelf, player]);

  // When model audio finishes during comparison, play student's recording
  useEffect(() => {
    if (isAutoComparing && !player.isPlaying && isComparingRef.current) {
      if (selfAudioRef.current) {
        selfAudioRef.current.currentTime = 0;
        selfAudioRef.current
          .play()
          .then(() => setIsPlayingSelf(true))
          .catch(() => {
            setIsAutoComparing(false);
            isComparingRef.current = false;
          });
      }
    }
  }, [isAutoComparing, player.isPlaying]);

  return {
    finalizeRecording,
    resumeRecording,
    displayDuration,
    effectiveAudioUrl,
    errorMessage,
    handleAutoCompare,
    handleResetRecord,
    handleStartRecording,
    handleStopRecording,
    handleToggleRecord,
    hasCompletedRecording,
    isAutoComparing,
    isPlayingSelf,
    isRecording,
    recorderStatus,
    recordingTime,
    togglePlaySelf,
  };
}
