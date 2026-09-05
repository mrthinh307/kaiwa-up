"use client";

import { Clock3, Play, VideoOff, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

import { useYouTubeLessonPreview } from "./use-youtube-lesson-preview";

type YouTubeLessonPreviewProps = {
  difficulty: string;
  durationLabel: string;
  lessonId: string;
  lessonTitle: string;
  shouldLoadThumbnailEagerly?: boolean;
  youtubeVideoId: string | null;
};

export function YouTubeLessonPreview({
  difficulty,
  durationLabel,
  lessonId,
  lessonTitle,
  shouldLoadThumbnailEagerly = false,
  youtubeVideoId,
}: YouTubeLessonPreviewProps) {
  const {
    canShowPreview,
    embedUrl,
    handleCloseKeyDown,
    handleClosePreview,
    handleOpenPreview,
    handlePointerEnter,
    handlePointerLeave,
    handlePreviewKeyDown,
    handleThumbnailError,
    isActive,
    thumbnailUrl,
  } = useYouTubeLessonPreview({ lessonId, youtubeVideoId });

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
            onError={handleThumbnailError}
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
