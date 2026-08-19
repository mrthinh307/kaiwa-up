"use client";

import { Keyboard, Settings2 } from "lucide-react";

import { KeyboardShortcut } from "@/components/common/keyboard-shortcut";
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
  mode?: "segmented" | "continuous";
  onAutoPlayDelayChange: (value: number) => void;
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
}

const CONTINUOUS_SHORTCUTS = [
  { action: "Pause or resume video", keyLabel: "⎵" },
  { action: "Start or stop recording", keyLabel: "R" },
] as const;

const SEGMENT_SHORTCUTS = [
  { action: "Pause or resume video", keyLabel: "⎵" },
  { action: "Start or stop recording", keyLabel: "R" },
  { action: "Next segment", keyLabel: "→" },
  { action: "Previous segment", keyLabel: "←" },
] as const;

export function ShadowingSettingsSheet({
  autoPlayDelaySeconds,
  mode = "segmented",
  onAutoPlayDelayChange,
  onShowVideoChange,
  showVideo,
}: ShadowingSettingsSheetProps) {
  const isContinuous = mode === "continuous";
  const shortcuts = isContinuous ? CONTINUOUS_SHORTCUTS : SEGMENT_SHORTCUTS;

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
            Customize playback, timing, and media display while practicing.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {/* Delay between segments (Segment mode only) */}
          {!isContinuous && (
            <div className="space-y-2 rounded-base border-2 border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="font-heading" htmlFor="shadowing-auto-play-delay">
                  Delay between segments
                </Label>
                <span className="text-xs text-foreground/60">seconds</span>
              </div>
              <Input
                aria-describedby="shadowing-auto-play-delay-help"
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
                Transition delay when moving between segments. Enter 0 for an immediate transition;
                maximum 10 seconds.
              </p>
            </div>
          )}

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

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3 rounded-base border-2 border-border bg-background p-4">
            <div className="flex items-center gap-2 font-heading text-sm">
              <Keyboard className="size-4 text-main" />
              <span>Keyboard shortcuts</span>
            </div>
            <div className="space-y-2 text-xs">
              {shortcuts.map((item) => (
                <div
                  className="flex items-center justify-between gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0"
                  key={item.action}
                >
                  <span className="text-foreground/80">{item.action}</span>
                  <KeyboardShortcut keyLabel={item.keyLabel} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed text-foreground/70">
            Your preference is saved automatically on this device.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
