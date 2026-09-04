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

const PRACTICE_SHORTCUTS = [
  { action: "Play or pause segment", keyLabel: "Space" },
  { action: "Replay segment from start", keyLabel: "Ctrl + Space" },
  { action: "Toggle loop playback", keyLabel: "L" },
  { action: "Check segment answer", keyLabel: "Ctrl + ⏎" },
  { action: "Next segment", keyLabel: "Ctrl + →" },
  { action: "Previous segment", keyLabel: "Ctrl + ←" },
] as const;

type SharedSettingsProps = {
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  onAutoPlayDelayChange: (value: number) => void;
  onAutoPlayOnSegmentChange: (value: boolean) => void;
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
};

type PracticeSettingsProps = SharedSettingsProps & {
  mode: "practice";
  onShowCorrectAnswerChange: (value: boolean) => void;
  showCorrectAnswer: boolean;
};

type ResultSettingsProps = SharedSettingsProps & {
  mode: "result";
};

type DictationSettingsSheetProps = PracticeSettingsProps | ResultSettingsProps;

export function DictationSettingsSheet(props: DictationSettingsSheetProps) {
  const { mode, onShowVideoChange, showVideo } = props;
  const isPractice = mode === "practice";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Open dictation settings" size="sm" type="button" variant="neutral">
          <Settings2 aria-hidden="true" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-y-auto p-0" side="right">
        <SheetHeader className="border-b-2 border-border p-5 pr-16">
          <SheetTitle>{isPractice ? "Practice settings" : "Review settings"}</SheetTitle>
          <SheetDescription>
            {isPractice
              ? "Customize feedback, playback, and media display while practicing."
              : "Choose how media should be displayed while reviewing this attempt."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="dictation-auto-play-segment">
                Play segments automatically
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                Continue to the next segment when playback ends and play selected segments
                automatically.
              </p>
            </div>
            <Switch
              checked={props.autoPlayOnSegmentChange}
              className="mt-0.5 shrink-0"
              id="dictation-auto-play-segment"
              onCheckedChange={props.onAutoPlayOnSegmentChange}
            />
          </div>

          <div className="space-y-2 rounded-base border-2 border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="font-heading" htmlFor="dictation-auto-play-delay">
                Delay between segments
              </Label>
              <span className="text-xs text-foreground/60">seconds</span>
            </div>
            <Input
              aria-describedby="dictation-auto-play-delay-help"
              disabled={!props.autoPlayOnSegmentChange}
              id="dictation-auto-play-delay"
              inputMode="numeric"
              max={10}
              min={0}
              onChange={(event) => props.onAutoPlayDelayChange(Number(event.target.value) * 1_000)}
              step={0.5}
              type="number"
              value={props.autoPlayDelayMs / 1_000}
            />
            <p
              className="text-xs leading-relaxed text-foreground/70"
              id="dictation-auto-play-delay-help"
            >
              Applied before automatic playback. Enter 0 for an immediate transition; maximum 10
              seconds.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
            <div className="space-y-1">
              <Label className="font-heading" htmlFor="dictation-show-video">
                Show video player
              </Label>
              <p className="text-xs leading-relaxed text-foreground/70">
                {isPractice
                  ? "Keep the YouTube video visible while practicing. Turn this off for an audio-only layout."
                  : "Keep the YouTube video visible while reviewing. Turn this off for an audio-only layout."}
              </p>
            </div>
            <Switch
              checked={showVideo}
              className="mt-0.5 shrink-0"
              id="dictation-show-video"
              onCheckedChange={onShowVideoChange}
            />
          </div>

          {isPractice ? (
            <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
              <div className="space-y-1">
                <Label className="font-heading" htmlFor="dictation-show-correct-answer">
                  Show correct answer after checking
                </Label>
                <p className="text-xs leading-relaxed text-foreground/70">
                  When off, you will only see whether your answer is correct or needs review.
                </p>
              </div>
              <Switch
                checked={props.showCorrectAnswer}
                className="mt-0.5 shrink-0"
                id="dictation-show-correct-answer"
                onCheckedChange={props.onShowCorrectAnswerChange}
              />
            </div>
          ) : null}

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3 rounded-base border-2 border-border bg-background p-4">
            <div className="flex items-center gap-2 font-heading text-sm">
              <span>Keyboard shortcuts</span>
            </div>
            <div className="space-y-2 text-xs">
              {PRACTICE_SHORTCUTS.map((item) => (
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
