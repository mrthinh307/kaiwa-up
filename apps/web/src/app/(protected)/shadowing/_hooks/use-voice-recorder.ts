"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  "idle" | "requesting_permission" | "permission_denied" | "recording" | "recorded" | "error";
export type RecordedAudio = { audioBlob: Blob; durationMs: number };

export function useVoiceRecorder(onComplete?: (take: RecordedAudio) => void) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const takePromiseRef = useRef<Promise<RecordedAudio | null> | null>(null);
  const lastTakeRef = useRef<RecordedAudio | null>(null);
  const stoppedAtRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const clearAudio = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    lastTakeRef.current = null;
    setAudioUrl(null);
    setAudioBlob(null);
  }, []);

  const startRecording = useCallback((): Promise<void> => {
    if (startPromiseRef.current) return startPromiseRef.current;
    if (recorderRef.current?.state === "recording") return Promise.resolve();
    const starting = (async () => {
      if (takePromiseRef.current) await takePromiseRef.current;
      clearAudio();
      setRecordingTime(0);
      setErrorMessage(null);
      setStatus("requesting_permission");
      let stream: MediaStream | null = null;
      let resolveFailedStart: (() => void) | null = null;
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          throw new Error("Microphone recording is not supported by this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const ownedStream = stream;
        streamRef.current = ownedStream;
        const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
          (type) => MediaRecorder.isTypeSupported(type),
        );
        const recorder = new MediaRecorder(ownedStream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        const chunks: Blob[] = [];
        const startedAt = performance.now();
        stoppedAtRef.current = null;
        let didFail = false;
        let resolveTake: (take: RecordedAudio | null) => void = () => undefined;
        const completion = new Promise<RecordedAudio | null>((resolve) => {
          resolveTake = resolve;
        });
        takePromiseRef.current = completion;
        resolveFailedStart = () => {
          resolveTake(null);
          if (takePromiseRef.current === completion) takePromiseRef.current = null;
        };
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => {
          didFail = true;
          clearTimer();
          if (isMountedRef.current) {
            setStatus("error");
            setErrorMessage("Recording was interrupted. Please record this segment again.");
          }
          ownedStream.getTracks().forEach((track) => track.stop());
          resolveTake(null);
          if (takePromiseRef.current === completion) takePromiseRef.current = null;
        };
        recorder.onstop = () => {
          clearTimer();
          ownedStream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === ownedStream) streamRef.current = null;
          if (didFail || !isMountedRef.current) {
            resolveTake(null);
          } else {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || chunks[0]?.type || "audio/webm",
            });
            const take = {
              audioBlob: blob,
              durationMs: Math.max(
                1,
                Math.round((stoppedAtRef.current ?? performance.now()) - startedAt),
              ),
            };
            lastTakeRef.current = take;
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setAudioBlob(blob);
            setAudioUrl(url);
            setRecordingTime(take.durationMs / 1000);
            setStatus("recorded");
            // Register the upload before resolving stop so Finish can await registered work.
            onComplete?.(take);
            resolveTake(take);
          }
          if (takePromiseRef.current === completion) takePromiseRef.current = null;
        };
        recorder.start(100);
        setStatus("recording");
        timerRef.current = setInterval(
          () => setRecordingTime(Math.floor((performance.now() - startedAt) / 1000)),
          250,
        );
      } catch (error: unknown) {
        resolveFailedStart?.();
        recorderRef.current = null;
        stream?.getTracks().forEach((track) => track.stop());
        if (isMountedRef.current) {
          const isDenied = error instanceof DOMException && error.name === "NotAllowedError";
          setStatus(isDenied ? "permission_denied" : "error");
          setErrorMessage(
            isDenied
              ? "Microphone permission was denied. Allow access to practice."
              : "Could not start microphone recording.",
          );
        }
      }
    })();
    startPromiseRef.current = starting;
    return starting.finally(() => {
      if (startPromiseRef.current === starting) startPromiseRef.current = null;
    });
  }, [clearAudio, clearTimer, onComplete]);

  const stopRecording = useCallback(async (): Promise<RecordedAudio | null> => {
    if (startPromiseRef.current) await startPromiseRef.current;
    clearTimer();
    const completion = takePromiseRef.current;
    if (recorderRef.current?.state === "recording") {
      stoppedAtRef.current = performance.now();
      recorderRef.current.stop();
    }
    return completion ? await completion : lastTakeRef.current;
  }, [clearTimer]);

  const resetRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording" || takePromiseRef.current) {
      void stopRecording();
      return;
    }
    clearAudio();
    setRecordingTime(0);
    setStatus("idle");
    setErrorMessage(null);
  }, [clearAudio, stopRecording]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [clearTimer]);

  return {
    audioBlob,
    audioUrl,
    errorMessage,
    recordingTime,
    resetRecording,
    startRecording,
    status,
    stopRecording,
  };
}
