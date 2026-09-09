"use client";

import { useSyncExternalStore } from "react";

type ShadowingSettings = {
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  autoSplitRecording: boolean;
  showVideo: boolean;
};

const DEFAULT_SETTINGS: ShadowingSettings = {
  autoPlayDelayMs: 500,
  autoPlayOnSegmentChange: true,
  autoSplitRecording: false,
  showVideo: true,
};

const MAX_AUTO_PLAY_DELAY_MS = 10_000;
const AUTO_PLAY_DELAY_STORAGE_KEY = "kaiwa:shadowing:auto-play-delay-ms";
const AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY = "kaiwa:shadowing:auto-play-on-segment-change";
const AUTO_SPLIT_RECORDING_STORAGE_KEY = "kaiwa:shadowing:auto-split-recording";
const SHOW_VIDEO_STORAGE_KEY = "kaiwa:shadowing:show-video";

const STORAGE_KEYS = [
  AUTO_PLAY_DELAY_STORAGE_KEY,
  AUTO_PLAY_ON_SEGMENT_CHANGE_STORAGE_KEY,
  AUTO_SPLIT_RECORDING_STORAGE_KEY,
  SHOW_VIDEO_STORAGE_KEY,
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

function readStoredSettings(): ShadowingSettings {
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
      autoSplitRecording: parseStoredBoolean(
        window.localStorage.getItem(AUTO_SPLIT_RECORDING_STORAGE_KEY),
        DEFAULT_SETTINGS.autoSplitRecording,
      ),
      showVideo: parseStoredBoolean(
        window.localStorage.getItem(SHOW_VIDEO_STORAGE_KEY),
        DEFAULT_SETTINGS.showVideo,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function areSettingsEqual(first: ShadowingSettings, second: ShadowingSettings): boolean {
  return (
    first.autoPlayDelayMs === second.autoPlayDelayMs &&
    first.autoPlayOnSegmentChange === second.autoPlayOnSegmentChange &&
    first.autoSplitRecording === second.autoSplitRecording &&
    first.showVideo === second.showVideo
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

export function useShadowingSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateSettings = (updates: Partial<ShadowingSettings>) => {
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
      window.localStorage.setItem(
        AUTO_SPLIT_RECORDING_STORAGE_KEY,
        String(settingsSnapshot.autoSplitRecording),
      );
      window.localStorage.setItem(SHOW_VIDEO_STORAGE_KEY, String(settingsSnapshot.showVideo));
    } catch {
      // Preference remains active in memory if storage fails
    }

    notifyListeners();
  };

  return {
    ...settings,
    autoPlayDelaySeconds: settings.autoPlayDelayMs / 1_000,
    updateAutoPlayDelay: (value: number) =>
      updateSettings({ autoPlayDelayMs: normalizeDelay(value) }),
    updateAutoPlayOnSegmentChange: (value: boolean) =>
      updateSettings({ autoPlayOnSegmentChange: value }),
    updateAutoSplitRecording: (value: boolean) => updateSettings({ autoSplitRecording: value }),
    updateShowVideo: (value: boolean) => updateSettings({ showVideo: value }),
  };
}
