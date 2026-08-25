"use client";

import { useSyncExternalStore } from "react";

type DictationSettings = {
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  showVideo: boolean;
  showCorrectAnswer: boolean;
};

const DEFAULT_SETTINGS: DictationSettings = {
  autoPlayDelayMs: 500,
  autoPlayOnSegmentChange: false,
  showVideo: true,
  showCorrectAnswer: false,
};
const MAX_AUTO_PLAY_DELAY_MS = 10_000;
const AUTO_PLAY_DELAY_STORAGE_KEY = "kaiwa:dictation:auto-play-delay-ms";
const AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY = "kaiwa:dictation:auto-play-on-segment-change";
const SHOW_VIDEO_STORAGE_KEY = "kaiwa:dictation:show-video";
const SHOW_CORRECT_ANSWER_STORAGE_KEY = "kaiwa:dictation:show-correct-answer";
const STORAGE_KEYS = [
  AUTO_PLAY_DELAY_STORAGE_KEY,
  AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY,
  SHOW_VIDEO_STORAGE_KEY,
  SHOW_CORRECT_ANSWER_STORAGE_KEY,
] as const;
type Listener = () => void;

const listeners = new Set<Listener>();
let settingsSnapshot = DEFAULT_SETTINGS;
let hasLoadedStoredSettings = false;

function parseStoredBoolean(value: string | null, fallback: boolean): boolean {
  return value === "true" || value === "false" ? value === "true" : fallback;
}

function normalizeDelay(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.autoPlayDelayMs;
  }

  return Math.min(Math.max(Math.round(value), 0), MAX_AUTO_PLAY_DELAY_MS);
}

function readStoredSettings(): DictationSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const storedDelay = window.localStorage.getItem(AUTO_PLAY_DELAY_STORAGE_KEY);
    return {
      autoPlayDelayMs:
        storedDelay === null
          ? DEFAULT_SETTINGS.autoPlayDelayMs
          : normalizeDelay(Number(storedDelay)),
      autoPlayOnSegmentChange: parseStoredBoolean(
        window.localStorage.getItem(AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY),
        DEFAULT_SETTINGS.autoPlayOnSegmentChange,
      ),
      showVideo: parseStoredBoolean(
        window.localStorage.getItem(SHOW_VIDEO_STORAGE_KEY),
        DEFAULT_SETTINGS.showVideo,
      ),
      showCorrectAnswer: parseStoredBoolean(
        window.localStorage.getItem(SHOW_CORRECT_ANSWER_STORAGE_KEY),
        DEFAULT_SETTINGS.showCorrectAnswer,
      ),
    };
  } catch {
    // The in-memory defaults remain available if localStorage is unavailable.
    return DEFAULT_SETTINGS;
  }
}

function areSettingsEqual(first: DictationSettings, second: DictationSettings): boolean {
  return (
    first.autoPlayDelayMs === second.autoPlayDelayMs &&
    first.autoPlayOnSegmentChange === second.autoPlayOnSegmentChange &&
    first.showVideo === second.showVideo &&
    first.showCorrectAnswer === second.showCorrectAnswer
  );
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  if (!hasLoadedStoredSettings) {
    hasLoadedStoredSettings = true;
    const storedSettings = readStoredSettings();
    if (!areSettingsEqual(storedSettings, settingsSnapshot)) {
      settingsSnapshot = storedSettings;
      queueMicrotask(notifyListeners);
    }
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== null && !STORAGE_KEYS.includes(event.key as (typeof STORAGE_KEYS)[number])) {
      return;
    }

    settingsSnapshot = readStoredSettings();
    notifyListeners();
  };
  window.addEventListener("storage", handleStorageChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getSnapshot() {
  return settingsSnapshot;
}

function getServerSnapshot() {
  return DEFAULT_SETTINGS;
}

export function useDictationSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSettings = (updates: Partial<DictationSettings>) => {
    settingsSnapshot = { ...settingsSnapshot, ...updates };

    try {
      window.localStorage.setItem(
        AUTO_PLAY_DELAY_STORAGE_KEY,
        String(settingsSnapshot.autoPlayDelayMs),
      );
      window.localStorage.setItem(
        AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY,
        String(settingsSnapshot.autoPlayOnSegmentChange),
      );
      window.localStorage.setItem(SHOW_VIDEO_STORAGE_KEY, String(settingsSnapshot.showVideo));
      window.localStorage.setItem(
        SHOW_CORRECT_ANSWER_STORAGE_KEY,
        String(settingsSnapshot.showCorrectAnswer),
      );
    } catch {
      // The preference still applies for the current session if persistence is unavailable.
    }

    notifyListeners();
  };

  return {
    ...settings,
    updateAutoPlayDelay: (value: number) =>
      updateSettings({ autoPlayDelayMs: normalizeDelay(value) }),
    updateAutoPlayOnSegmentChange: (value: boolean) =>
      updateSettings({ autoPlayOnSegmentChange: value }),
    updateShowVideo: (value: boolean) => updateSettings({ showVideo: value }),
    updateShowCorrectAnswer: (value: boolean) => updateSettings({ showCorrectAnswer: value }),
  };
}
