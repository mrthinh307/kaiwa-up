"use client";

import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface ShadowingSettingsSheetProps {
  autoPlayDelaySeconds: number;
  autoPlayOnSegmentChange: boolean;
  onAutoPlayDelayChange: (value: number) => void;
  onAutoPlayOnSegmentChange: (value: boolean) => void;
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
}

export function ShadowingSettingsSheet({
  autoPlayDelaySeconds,
  autoPlayOnSegmentChange,
  onAutoPlayDelayChange,
  onAutoPlayOnSegmentChange,
  onShowVideoChange,
  showVideo,
}: ShadowingSettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open shadowing settings" size="sm" type="button" variant="neutral">
          <Settings2 aria-hidden="true" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-y-auto p-0" side="right">
        <SheetHeader className="border-b-4 border-border p-5 pr-16">
          <SheetTitle>Practice settings</SheetTitle>
          <SheetDescription>
            Customize feedback, playback, and media display while practicing.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {/* Play segments automatically */}
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="shadowing-auto-play-segment">
                Play segments automatically
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Continue to the next segment when playback ends and play selected segments
                automatically.
              </p>
            </div>
            <Switch
              checked={autoPlayOnSegmentChange}
              className="mt-0.5 shrink-0"
              id="shadowing-auto-play-segment"
              onCheckedChange={onAutoPlayOnSegmentChange}
            />
          </div>

          {/* Delay between segments */}
          <div className="space-y-2 rounded-base border-2 border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="font-heading" htmlFor="shadowing-auto-play-delay">
                Delay between segments
              </Label>
              <span className="text-xs text-foreground/60">seconds</span>
            </div>
            <Input
              aria-describedby="shadowing-auto-play-delay-help"
              disabled={!autoPlayOnSegmentChange}
              id="shadowing-auto-play-delay"
              inputMode="decimal"
              max={10}
              min={0}
              onChange={(event) => onAutoPlayDelayChange(Number(event.target.value))}
              step={0.1}
              type="number"
              value={autoPlayDelaySeconds}
            />
            <p
              className="text-xs leading-relaxed text-foreground/70"
              id="shadowing-auto-play-delay-help"
            >
              Applied before automatic playback. Enter 0 for an immediate transition; maximum 10
              seconds.
            </p>
          </div>

          {/* Show video player */}
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="shadowing-show-video">
                Show video player
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Keep the YouTube video visible while practicing. Turn this off for an audio-only
                layout.
              </p>
            </div>
            <Switch
              checked={showVideo}
              className="mt-0.5 shrink-0"
              id="shadowing-show-video"
              onCheckedChange={onShowVideoChange}
            />
          </div>

          <div className="rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed text-foreground/70">
            Your preference is saved automatically on this device.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
