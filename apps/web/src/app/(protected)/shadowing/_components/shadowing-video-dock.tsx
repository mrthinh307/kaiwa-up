"use client";

import type { RefObject } from "react";

import { cn } from "@/lib/utils";

interface ShadowingVideoDockProps {
  handleIframeLoad: () => void;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  registerIframe?: (element: HTMLIFrameElement | null) => void;
  isYouTube: boolean;
  showVideo: boolean;
  youtubeVideoId: string | null;
}

export function ShadowingVideoDock({
  handleIframeLoad,
  iframeRef,
  registerIframe,
  isYouTube,
  showVideo,
  youtubeVideoId,
}: ShadowingVideoDockProps) {
  if (!isYouTube || !youtubeVideoId) {
    return null;
  }

  return (
    <section
      aria-label="Video shadowing player"
      className={cn(
        "overflow-hidden rounded-base border-2 border-border bg-black shadow-shadow",
        !showVideo && "sr-only",
      )}
    >
      <div className={cn("relative aspect-video w-full", !showVideo && "size-px")}>
        <iframe
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={showVideo}
          aria-hidden={!showVideo ? true : undefined}
          className="pointer-events-none absolute inset-0 size-full border-0"
          onLoad={handleIframeLoad}
          ref={registerIframe ?? iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&playsinline=1`}
          tabIndex={!showVideo ? -1 : undefined}
          title="Shadowing lesson video"
        />
      </div>
    </section>
  );
}
