"use client";

import { Clock3, Play, VideoOff, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";

import { usePracticePreview } from "./practice-preview-provider";

const HOVER_PREVIEW_DELAY_MS = 250;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

type PreviewActivationMode = "hover" | "manual";

type YouTubeLessonPreviewProps = {
  difficulty: string;
  durationLabel: string;
  lessonId: string;
  lessonTitle: string;
  shouldLoadThumbnailEagerly?: boolean;
  youtubeVideoId: string | null;
};

function canAutoplayOnHover(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function YouTubeLessonPreview({
  difficulty,
  durationLabel,
  lessonId,
  lessonTitle,
  shouldLoadThumbnailEagerly = false,
  youtubeVideoId,
}: YouTubeLessonPreviewProps) {
  const { activeLessonId, activatePreview, deactivatePreview } = usePracticePreview();
  const [hasThumbnailError, setHasThumbnailError] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationModeRef = useRef<PreviewActivationMode | null>(null);
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

  const thumbnailUrl = isValidVideoId
    ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : null;
  const embedUrl = isValidVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&playsinline=1&controls=1`
    : null;

  return (
    <div
      className="relative aspect-video w-full overflow-hidden border-b-2 border-border bg-background"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {isActive && embedUrl ? (
        <>
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
            src={embedUrl}
            title={`Preview: ${lessonTitle}`}
          />
          <Button
            aria-label={`Close preview for ${lessonTitle}`}
            className="absolute top-3 right-3 z-10"
            onClick={handleClosePreview}
            onKeyDown={handleCloseKeyDown}
            size="icon"
            type="button"
            variant="neutral"
          >
            <X aria-hidden="true" />
          </Button>
        </>
      ) : canShowPreview && thumbnailUrl ? (
        <>
          <Image
            alt=""
            className="object-cover"
            fill
            loading={shouldLoadThumbnailEagerly ? "eager" : "lazy"}
            onError={() => setHasThumbnailError(true)}
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            src={thumbnailUrl}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Button
              aria-label={`Preview ${lessonTitle}`}
              onClick={handleOpenPreview}
              onKeyDown={handlePreviewKeyDown}
              type="button"
              variant="neutral"
            >
              <Play aria-hidden="true" className="fill-current" />
              Preview
            </Button>
          </div>
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-foreground/65">
          <VideoOff aria-hidden="true" className="size-8" />
          <span className="text-sm font-heading">Preview unavailable</span>
        </div>
      )}

      {!isActive && (
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
          <span className="rounded-base border-2 border-border bg-main px-2 py-1 text-xs font-heading text-main-foreground shadow-shadow">
            {difficulty}
          </span>
          <span className="flex items-center gap-1.5 rounded-base border-2 border-border bg-secondary-background px-2 py-1 text-xs font-heading text-foreground shadow-shadow">
            <Clock3 aria-hidden="true" className="size-4" />
            {durationLabel}
          </span>
        </div>
      )}
    </div>
  );
}
