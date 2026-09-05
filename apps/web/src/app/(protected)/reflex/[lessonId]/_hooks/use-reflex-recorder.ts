"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VOICE_THRESHOLD } from "../_utils/reflex-recording";

type BeginResponseOptions = {
  onRecordingStart: () => void;
  onVoiceStart: () => void;
  responseStartLimitSeconds: number;
};

export function useReflexRecorder() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordingPlaybackRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const countdownFrameRef = useRef<number | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const voiceFrameRef = useRef<number | null>(null);
  const endedAtRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const responseStartRef = useRef<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const cleanupMedia = useCallback(() => {
    if (countdownFrameRef.current !== null) cancelAnimationFrame(countdownFrameRef.current);
    if (thinkingTimerRef.current !== null) window.clearTimeout(thinkingTimerRef.current);
    if (voiceFrameRef.current !== null) cancelAnimationFrame(voiceFrameRef.current);
    countdownFrameRef.current = null;
    thinkingTimerRef.current = null;
    voiceFrameRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => cleanupMedia, [cleanupMedia]);

  useEffect(() => {
    const playback = recordingPlaybackRef.current;
    if (!recordedAudio || !playback) return;

    const nextRecordingUrl = URL.createObjectURL(recordedAudio);
    playback.src = nextRecordingUrl;
    return () => {
      playback.pause();
      playback.removeAttribute("src");
      playback.load();
      URL.revokeObjectURL(nextRecordingUrl);
    };
  }, [recordedAudio]);

  const detectVoiceStart = useCallback((stream: MediaStream, onVoiceStart: () => void) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioContext;
    const samples = new Uint8Array(analyser.fftSize);
    const sample = () => {
      analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length,
      );
      if (rms >= VOICE_THRESHOLD && responseStartRef.current === null) {
        responseStartRef.current = Math.max(0, Math.round(performance.now() - endedAtRef.current));
        if (voiceFrameRef.current !== null) cancelAnimationFrame(voiceFrameRef.current);
        voiceFrameRef.current = null;
        if (countdownFrameRef.current !== null) cancelAnimationFrame(countdownFrameRef.current);
        countdownFrameRef.current = null;
        if (thinkingTimerRef.current !== null) window.clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
        onVoiceStart();
        return;
      }
      if (responseStartRef.current === null) voiceFrameRef.current = requestAnimationFrame(sample);
    };
    voiceFrameRef.current = requestAnimationFrame(sample);
  }, []);

  const startCapture = useCallback(async () => {
    setIsPlayingRecording(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setRecordedAudio(blob.size > 0 ? blob : null);
      cleanupMedia();
    };
    recorderRef.current = recorder;
    setRecordedAudio(null);
    setIsPlayingRecording(false);
    return true;
  }, [cleanupMedia]);

  const beginResponse = useCallback(
    ({ onRecordingStart, onVoiceStart, responseStartLimitSeconds }: BeginResponseOptions) => {
      const recorder = recorderRef.current;
      const stream = streamRef.current;
      if (!recorder || !stream) return false;

      endedAtRef.current = performance.now();
      responseStartRef.current = null;
      chunksRef.current = [];
      setCountdown(responseStartLimitSeconds);
      recorder.start(250);
      detectVoiceStart(stream, onVoiceStart);

      const update = () => {
        const elapsedSeconds = (performance.now() - endedAtRef.current) / 1000;
        setCountdown(Math.max(0, responseStartLimitSeconds - elapsedSeconds));
        countdownFrameRef.current = requestAnimationFrame(update);
      };
      countdownFrameRef.current = requestAnimationFrame(update);

      thinkingTimerRef.current = window.setTimeout(() => {
        thinkingTimerRef.current = null;
        if (countdownFrameRef.current !== null) cancelAnimationFrame(countdownFrameRef.current);
        countdownFrameRef.current = null;
        onRecordingStart();
      }, responseStartLimitSeconds * 1000);

      return true;
    },
    [detectVoiceStart],
  );

  const stopRecording = useCallback(() => {
    if (responseStartRef.current === null) {
      responseStartRef.current = Math.max(0, Math.round(performance.now() - endedAtRef.current));
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const toggleRecordingPlayback = useCallback(async () => {
    const playback = recordingPlaybackRef.current;
    if (!playback) return;
    if (playback.paused) {
      await playback.play();
      setIsPlayingRecording(true);
      return;
    }
    playback.pause();
    setIsPlayingRecording(false);
  }, []);

  const handleRecordingPlaybackEnded = useCallback(() => {
    setIsPlayingRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedAudio(null);
    setIsPlayingRecording(false);
    responseStartRef.current = null;
    chunksRef.current = [];
  }, []);

  const getResponseStartMs = useCallback(
    (responseStartLimitSeconds: number) =>
      responseStartRef.current ?? Math.round(responseStartLimitSeconds * 1000),
    [],
  );

  return {
    audioRef,
    beginResponse,
    cleanupMedia,
    countdown,
    getResponseStartMs,
    handleRecordingPlaybackEnded,
    isPlayingRecording,
    recordingPlaybackRef,
    recordedAudio,
    resetRecording,
    startCapture,
    stopRecording,
    toggleRecordingPlayback,
  };
}
