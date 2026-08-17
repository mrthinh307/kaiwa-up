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

interface ShadowingSettingsSheetProps {
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
}

export function ShadowingSettingsSheet({
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
            Customize media display and playback preferences for Shadowing practice.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="shadowing-show-video">
                Show video player
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Keep the YouTube video visible while practicing. Turn this off for an audio-only
                focus layout.
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
            Your preferences apply to this practice session.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
