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

export function recordingFile(recording: Blob): File {
  const mimeType = recording.type.split(";")[0] || "audio/webm";
  const extension = AUDIO_FILE_EXTENSIONS[mimeType] ?? "webm";
  return new File([recording], `reflex-response.${extension}`, { type: mimeType });
}

export function microphoneMessage(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
  ) {
    return "Microphone access was denied. Allow access in your browser settings, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found on this device.";
  }
  return "Unable to access the microphone. Check your device and try again.";
}

export { VOICE_THRESHOLD };
