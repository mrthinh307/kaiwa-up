"use client";

import {
  AlertCircle,
  ArrowLeft,
  Headphones,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { AiRequestPanel } from "@/components/common/ai-request/ai-request-panel";
import {
  AI_REQUEST_IDLE_STATE,
  aiRequestReducer,
} from "@/components/common/ai-request/ai-request-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseApiFailure } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

import type { ReflexEvaluation, ReflexLesson } from "../../_lib/reflex-api";

import { evaluateReflexLesson } from "../../_lib/reflex-api";
import { ReflexResult } from "./reflex-result";

type Phase = "ready" | "playing" | "thinking" | "recording" | "processing" | "result";
const VOICE_THRESHOLD = 0.055;

const AUDIO_FILE_EXTENSIONS: Readonly<Record<string, string>> = {
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-wav": "wav",
};

function recordingFile(recording: Blob): File {
  const mimeType = recording.type.split(";")[0] || "audio/webm";
  const extension = AUDIO_FILE_EXTENSIONS[mimeType] ?? "webm";
  return new File([recording], `reflex-response.${extension}`, { type: mimeType });
}

function microphoneMessage(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
  ) {
    return "Microphone access was denied. Allow access in your browser settings, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError")
    return "No microphone was found on this device.";
  return "Unable to access the microphone. Check your device and try again.";
}

export function ReflexPractice({ lesson }: { lesson: ReflexLesson }) {
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
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(lesson.response_start_limit_seconds);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReflexEvaluation | null>(null);
  const [aiRequestState, dispatchAiRequest] = useReducer(aiRequestReducer, AI_REQUEST_IDLE_STATE);

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

  useEffect(() => {
    if (phase !== "thinking") return;
    const update = () => {
      const elapsedSeconds = (performance.now() - endedAtRef.current) / 1000;
      setCountdown(Math.max(0, lesson.response_start_limit_seconds - elapsedSeconds));
      countdownFrameRef.current = requestAnimationFrame(update);
    };
    countdownFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (countdownFrameRef.current !== null) cancelAnimationFrame(countdownFrameRef.current);
    };
  }, [lesson.response_start_limit_seconds, phase]);

  const detectVoiceStart = useCallback((stream: MediaStream) => {
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
        setPhase("recording");
      }
      if (responseStartRef.current === null) voiceFrameRef.current = requestAnimationFrame(sample);
    };
    voiceFrameRef.current = requestAnimationFrame(sample);
  }, []);

  const handleAudioEnded = useCallback(() => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    if (!recorder || !stream) return;
    endedAtRef.current = performance.now();
    responseStartRef.current = null;
    chunksRef.current = [];
    setCountdown(lesson.response_start_limit_seconds);
    setPhase("thinking");
    recorder.start(250);
    detectVoiceStart(stream);
    thinkingTimerRef.current = window.setTimeout(() => {
      setPhase("recording");
      thinkingTimerRef.current = null;
    }, lesson.response_start_limit_seconds * 1000);
  }, [detectVoiceStart, lesson.response_start_limit_seconds]);

  const handleStart = async () => {
    setErrorMessage(null);
    setIsPlayingRecording(false);
    dispatchAiRequest({ type: "reset" });
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage(
        "This browser does not support audio recording. Use a recent version of Chrome, Edge, Firefox, or Safari.",
      );
      return;
    }
    try {
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
      setPhase("playing");
      await audioRef.current?.play();
    } catch (error) {
      cleanupMedia();
      setPhase("ready");
      setErrorMessage(microphoneMessage(error));
    }
  };

  const handleStop = () => {
    if (responseStartRef.current === null) {
      responseStartRef.current = Math.max(0, Math.round(performance.now() - endedAtRef.current));
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setPhase("ready");
  };

  const handleSubmit = async () => {
    if (!recordedAudio || recordedAudio.size === 0 || phase === "processing") return;
    setErrorMessage(null);
    setPhase("processing");
    dispatchAiRequest({ type: "start" });
    const responseStartMs =
      responseStartRef.current ?? Math.round(lesson.response_start_limit_seconds * 1000);
    const audioFile = recordingFile(recordedAudio);
    const evaluation = await evaluateReflexLesson(lesson.id, audioFile, responseStartMs);
    if (!evaluation.data) {
      dispatchAiRequest({
        errorMessage: parseApiFailure(evaluation).message,
        type: "fail",
      });
      setPhase("ready");
      return;
    }
    setResult(evaluation.data);
    dispatchAiRequest({
      result: {
        feedback: evaluation.data.ai_feedback.naturalness_evaluation,
        score: evaluation.data.ai_score,
        suggestion: evaluation.data.ai_feedback.suggestions,
        transcript: evaluation.data.ai_feedback.transcribed_text,
      },
      type: "succeed",
    });
    setPhase("result");
  };

  const handleToggleRecordingPlayback = async () => {
    const playback = recordingPlaybackRef.current;
    if (!playback) return;
    if (playback.paused) {
      await playback.play();
      setIsPlayingRecording(true);
      return;
    }
    playback.pause();
    setIsPlayingRecording(false);
  };

  const handlePracticeAgain = () => {
    setRecordedAudio(null);
    setIsPlayingRecording(false);
    setResult(null);
    setErrorMessage(null);
    responseStartRef.current = null;
    dispatchAiRequest({ type: "reset" });
    setPhase("ready");
  };

  const handleAudioError = () => {
    cleanupMedia();
    setPhase("ready");
    setErrorMessage("Unable to play the question audio. Check your connection and try again.");
  };

  if (phase === "result" && result)
    return <ReflexResult onPracticeAgain={handlePracticeAgain} result={result} />;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild size="sm" variant="neutral">
          <Link href="/reflex">
            <ArrowLeft /> Lesson list
          </Link>
        </Button>
        <span className="text-sm font-heading">
          Limit: {lesson.response_start_limit_seconds} seconds
        </span>
      </div>
      {phase !== "processing" && (
        <Card className="overflow-hidden py-0">
          <div className="border-b-2 border-border bg-main p-6 sm:p-8">
            <p className="mb-3 flex items-center gap-2 text-sm font-heading uppercase">
              <Headphones className="size-4" /> {lesson.scenario_ja}
            </p>
            <h1 className="text-2xl leading-relaxed font-heading sm:text-4xl" lang="ja">
              {lesson.prompt_ja}
            </h1>
          </div>
          <CardContent className="grid min-h-80 place-items-center py-10 text-center">
            <audio
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              preload="metadata"
              ref={audioRef}
              src={lesson.audio_url}
            />
            <div className="grid max-w-xl justify-items-center gap-6">
              {phase === "playing" && (
                <>
                  <Volume2 className="size-14 animate-pulse" />
                  <p className="text-xl font-heading">Listen to the question...</p>
                </>
              )}
              {phase === "thinking" && (
                <>
                  <div
                    className={cn(
                      "grid size-32 place-items-center rounded-full border-4 border-border text-5xl font-heading",
                      countdown === 0 ? "bg-chart-3" : "bg-main",
                    )}
                  >
                    {countdown.toFixed(1)}
                  </div>
                  <p aria-live="polite" className="text-xl font-heading">
                    Think about your answer
                  </p>
                  <p className="text-sm text-foreground/70">
                    Recording starts automatically when the timer reaches zero.
                  </p>
                </>
              )}
              {phase === "recording" && (
                <>
                  <div className="grid size-32 place-items-center rounded-full border-4 border-border bg-chart-2">
                    <Mic className="size-14" />
                  </div>
                  <p aria-live="polite" className="flex items-center gap-2 text-xl font-heading">
                    Recording your answer
                  </p>
                  <Button onClick={handleStop} variant="neutral">
                    <Square /> Stop recording
                  </Button>
                </>
              )}
              {phase === "ready" && (
                <>
                  <Mic className="size-14" />
                  <p className="text-lg">
                    Listen first, then take three seconds to think. Recording starts automatically
                    after the countdown.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {recordedAudio ? (
                      <>
                        <audio
                          onEnded={() => setIsPlayingRecording(false)}
                          ref={recordingPlaybackRef}
                        />
                        <Button onClick={handleToggleRecordingPlayback} variant="neutral">
                          {isPlayingRecording ? <Pause /> : <Play />}
                          {isPlayingRecording ? "Pause playback" : "Play recording"}
                        </Button>
                        <Button onClick={handleStart} variant="neutral">
                          <RotateCcw /> Record again
                        </Button>
                        <Button disabled={!recordedAudio} onClick={handleSubmit}>
                          <Send /> Submit for evaluation
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleStart}>
                        <Mic /> Start
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <AiRequestPanel
        failedTitle="AI evaluation failed"
        onRetry={recordedAudio ? handleSubmit : undefined}
        processingDescription="Keep this page open while your recording is evaluated. The request will not be submitted twice."
        processingTitle="AI is analyzing your answer"
        state={aiRequestState.status === "success" ? AI_REQUEST_IDLE_STATE : aiRequestState}
      />
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>
            <p>{errorMessage}</p>
            {recordedAudio && (
              <Button className="mt-3" onClick={handleSubmit} size="sm" variant="neutral">
                <RotateCcw /> Retry submission
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
