"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { usePracticePreview } from "./practice-preview-provider";

const HOVER_PREVIEW_DELAY_MS = 250;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

type UseYouTubeLessonPreviewOptions = {
  lessonId: string;
  youtubeVideoId: string | null;
};

function canAutoplayOnHover(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useYouTubeLessonPreview({
  lessonId,
  youtubeVideoId,
}: UseYouTubeLessonPreviewOptions) {
  const { activeLessonId, activatePreview, deactivatePreview } = usePracticePreview();
  const [hasThumbnailError, setHasThumbnailError] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationModeRef = useRef<"hover" | "manual" | null>(null);
  const isActive = activeLessonId === lessonId;
  const isValidVideoId = Boolean(youtubeVideoId && YOUTUBE_VIDEO_ID_PATTERN.test(youtubeVideoId));
  const canShowPreview = isValidVideoId && !hasThumbnailError;

  useEffect(() => {
    if (!isActive) {
      activationModeRef.current = null;
    }
  }, [isActive]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    },
    [],
  );

  const clearHoverTimer = () => {
    if (!hoverTimerRef.current) {
      return;
    }

    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !canShowPreview || isActive || !canAutoplayOnHover()) {
      return;
    }

    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      activationModeRef.current = "hover";
      activatePreview(lessonId);
      hoverTimerRef.current = null;
    }, HOVER_PREVIEW_DELAY_MS);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    clearHoverTimer();

    if (activationModeRef.current === "hover") {
      activationModeRef.current = null;
      deactivatePreview(lessonId);
    }
  };

  const handleOpenPreview = () => {
    if (!canShowPreview) {
      return;
    }

    clearHoverTimer();
    activationModeRef.current = "manual";
    activatePreview(lessonId);
  };

  const handleClosePreview = () => {
    clearHoverTimer();
    activationModeRef.current = null;
    deactivatePreview(lessonId);
  };

  const handlePreviewKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleOpenPreview();
  };

  const handleCloseKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleClosePreview();
  };

  return {
    canShowPreview,
    handleCloseKeyDown,
    handleClosePreview,
    handleOpenPreview,
    handlePointerEnter,
    handlePointerLeave,
    handlePreviewKeyDown,
    handleThumbnailError: () => setHasThumbnailError(true),
    isActive,
    embedUrl: isValidVideoId
      ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&playsinline=1&controls=1`
      : null,
    thumbnailUrl: isValidVideoId ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg` : null,
  };
}
