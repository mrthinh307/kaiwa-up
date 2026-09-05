"use client";

import { useReducer, useState } from "react";

import {
  AI_REQUEST_IDLE_STATE,
  aiRequestReducer,
} from "@/components/common/ai-request/ai-request-state";
import { parseApiFailure } from "@/lib/api-errors";

import type { ReflexEvaluation, ReflexLesson } from "../../_lib/reflex-api";

import { evaluateReflexLesson } from "../../_lib/reflex-api";
import { microphoneMessage, recordingFile } from "../_utils/reflex-recording";
import { useReflexRecorder } from "./use-reflex-recorder";

type Phase = "ready" | "playing" | "thinking" | "recording" | "processing" | "result";

export function useReflexSession(lesson: ReflexLesson) {
  const recorder = useReflexRecorder();
  const [phase, setPhase] = useState<Phase>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReflexEvaluation | null>(null);
  const [aiRequestState, dispatchAiRequest] = useReducer(aiRequestReducer, AI_REQUEST_IDLE_STATE);

  const handleAudioEnded = () => {
    const didBeginResponse = recorder.beginResponse({
      onRecordingStart: () => setPhase("recording"),
      onVoiceStart: () => setPhase("recording"),
      responseStartLimitSeconds: lesson.response_start_limit_seconds,
    });
    if (didBeginResponse) {
      setPhase("thinking");
    }
  };

  const handleStart = async () => {
    setErrorMessage(null);
    dispatchAiRequest({ type: "reset" });
    try {
      const started = await recorder.startCapture();
      if (!started) {
        setErrorMessage(
          "This browser does not support audio recording. Use a recent version of Chrome, Edge, Firefox, or Safari.",
        );
        return;
      }
      setPhase("playing");
      await recorder.audioRef.current?.play();
    } catch (error) {
      recorder.cleanupMedia();
      setPhase("ready");
      setErrorMessage(microphoneMessage(error));
    }
  };

  const handleStop = () => {
    recorder.stopRecording();
    setPhase("ready");
  };

  const handleSubmit = async () => {
    const recordedAudio = recorder.recordedAudio;
    if (!recordedAudio || recordedAudio.size === 0 || phase === "processing") return;
    setErrorMessage(null);
    setPhase("processing");
    dispatchAiRequest({ type: "start" });
    const responseStartMs = recorder.getResponseStartMs(lesson.response_start_limit_seconds);
    const evaluation = await evaluateReflexLesson(
      lesson.id,
      recordingFile(recordedAudio),
      responseStartMs,
    );
    if (!evaluation.data) {
      dispatchAiRequest({ errorMessage: parseApiFailure(evaluation).message, type: "fail" });
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

  const handlePracticeAgain = () => {
    recorder.resetRecording();
    setResult(null);
    setErrorMessage(null);
    dispatchAiRequest({ type: "reset" });
    setPhase("ready");
  };

  const handleAudioError = () => {
    recorder.cleanupMedia();
    setPhase("ready");
    setErrorMessage("Unable to play the question audio. Check your connection and try again.");
  };

  return {
    ...recorder,
    aiRequestState,
    errorMessage,
    handleAudioEnded,
    handleAudioError,
    handlePracticeAgain,
    handleStart,
    handleStop,
    handleSubmit,
    phase,
    result,
  };
}
