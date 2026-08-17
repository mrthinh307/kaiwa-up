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

type SharedSettingsProps = {
  onShowVideoChange: (value: boolean) => void;
  showVideo: boolean;
};

type PracticeSettingsProps = SharedSettingsProps & {
  autoPlayDelayMs: number;
  autoPlayOnSegmentChange: boolean;
  mode: "practice";
  onAutoPlayDelayChange: (value: number) => void;
  onAutoPlayOnSegmentChange: (value: boolean) => void;
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
        <SheetHeader className="border-b-4 border-border p-5 pr-16">
          <SheetTitle>{isPractice ? "Practice settings" : "Review settings"}</SheetTitle>
          <SheetDescription>
            {isPractice
              ? "Customize feedback, playback, and media display while practicing."
              : "Choose how media should be displayed while reviewing this attempt."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {isPractice ? (
            <>
              <div className="flex items-start justify-between gap-4 rounded-base border-2 border-border bg-background p-4">
                <div className="space-y-1">
                  <Label className="font-heading" htmlFor="dictation-auto-play-segment">
                    Play segment automatically
                  </Label>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Start the video or audio automatically after moving to another segment.
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
                    Delay before playback
                  </Label>
                  <span className="text-xs text-foreground/60">milliseconds</span>
                </div>
                <Input
                  aria-describedby="dictation-auto-play-delay-help"
                  disabled={!props.autoPlayOnSegmentChange}
                  id="dictation-auto-play-delay"
                  inputMode="numeric"
                  max={10000}
                  min={0}
                  onChange={(event) => props.onAutoPlayDelayChange(Number(event.target.value))}
                  step={1}
                  type="number"
                  value={props.autoPlayDelayMs}
                />
                <p
                  className="text-xs leading-relaxed text-foreground/70"
                  id="dictation-auto-play-delay-help"
                >
                  Enter 0 for immediate playback. Maximum 10000 ms.
                </p>
              </div>
            </>
          ) : null}

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

          <div className="rounded-base border-2 border-border bg-secondary-background p-4 text-xs leading-relaxed text-foreground/70">
            Your preference is saved automatically on this device.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
