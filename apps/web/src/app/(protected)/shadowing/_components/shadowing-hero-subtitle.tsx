import type { TranscriptSegment } from "@kaiwa-app/api-client";

interface ShadowingHeroSubtitleProps {
  activeSegment?: TranscriptSegment;
}

export function ShadowingHeroSubtitle({ activeSegment }: ShadowingHeroSubtitleProps) {
  return (
    <div className="rounded-base border-2 border-border bg-background p-5 shadow-shadow">
      <div className="flex items-center justify-center">
        <p className="text-center font-heading text-xl text-foreground sm:text-2xl" lang="ja">
          {activeSegment?.script ?? "..."}
        </p>
      </div>
    </div>
  );
}
