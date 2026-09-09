"use client";

import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export interface ShadowingSettingsSheetProps {
  autoSplitRecording?: boolean;
  onAutoSplitRecordingChange?: (value: boolean) => void;
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
}

const SHADOWING_SHORTCUTS = [
  { action: "Play or pause video", keyLabel: "Space" },
  { action: "Replay segment from start", keyLabel: "Ctrl + Space" },
  { action: "Start or stop recording", keyLabel: "R" },
  { action: "Next segment", keyLabel: "→" },
  { action: "Previous segment", keyLabel: "←" },
  { action: "Next unrecorded segment", keyLabel: "Ctrl + →" },
  { action: "Previous unrecorded segment", keyLabel: "Ctrl + ←" },
] as const;

export function ShadowingSettingsSheet({
  autoSplitRecording = false,
  onAutoSplitRecordingChange,
  onShowVideoChange,
  showVideo,
}: ShadowingSettingsSheetProps) {
  const shortcuts = SHADOWING_SHORTCUTS;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open shadowing settings" size="sm" type="button" variant="neutral">
          <Settings2 aria-hidden="true" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-y-auto p-0" side="right">
        <SheetHeader className="border-b-2 border-border p-5 pr-16">
          <SheetTitle>Practice settings</SheetTitle>
          <SheetDescription>
            Customize media display and view keyboard shortcuts for shadowing.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {/* Show video player */}
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="shadowing-show-video">
                Show video player
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Keep the video visible while practicing. Turn this off for an audio-only layout.
              </p>
            </div>
            <Switch
              checked={showVideo}
              className="mt-0.5 shrink-0"
              id="shadowing-show-video"
              onCheckedChange={onShowVideoChange}
            />
          </div>

          {/* Auto-split recording per segment */}
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="shadowing-auto-split-recording">
                Auto-split recording per segment
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Automatically stop and save recording when a segment ends, then start a new one for
                the next segment. Record continuously while keeping per-segment AI evaluation.
              </p>
            </div>
            <Switch
              checked={autoSplitRecording}
              className="mt-0.5 shrink-0"
              id="shadowing-auto-split-recording"
              onCheckedChange={onAutoSplitRecordingChange}
            />
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3 rounded-base border-2 border-border bg-background p-4">
            <div className="flex items-center gap-2 font-heading text-sm">
              <span>Keyboard shortcuts</span>
            </div>
            <div className="space-y-2 text-xs">
              {shortcuts.map((item) => (
                <div
                  className="flex items-center justify-between gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0"
                  key={item.action}
                >
                  <span className="text-foreground/80">{item.action}</span>
                  <kbd className="rounded-xs border border-border/40 bg-secondary-background px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
                    {item.keyLabel}
                  </kbd>
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
