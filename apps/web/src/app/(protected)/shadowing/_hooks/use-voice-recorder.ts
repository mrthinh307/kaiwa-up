"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  "idle" | "requesting_permission" | "permission_denied" | "recording" | "recorded" | "error";

export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    revokeAudioUrl();
    setAudioBlob(null);
    setErrorMessage(null);
    setRecordingTime(0);
    chunksRef.current = [];

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Microphone access is not supported by your browser.");
      return;
    }

    try {
      setStatus("requesting_permission");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setStatus("recorded");
        stopTracks();
      };

      recorder.start(100);
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      stopTracks();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("permission_denied");
        setErrorMessage(
          "Microphone permission was denied. Please allow microphone access to practice.",
        );
      } else {
        setStatus("error");
        setErrorMessage("Could not access microphone.");
      }
    }
  }, [revokeAudioUrl, stopTracks]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    stopTracks();
    revokeAudioUrl();
    setAudioBlob(null);
    setRecordingTime(0);
    setStatus("idle");
    setErrorMessage(null);
  }, [revokeAudioUrl, stopTracks]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopTracks();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopTracks]);

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
