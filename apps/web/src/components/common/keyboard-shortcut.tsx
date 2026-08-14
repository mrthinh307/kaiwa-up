import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type KeyboardShortcutProps = {
  className?: string;
  keyLabel: string;
};

export function KeyboardShortcut({ className, keyLabel }: KeyboardShortcutProps) {
  const accessibleKeyLabel = keyLabel === "⎵" ? "Space" : keyLabel;

  return (
    <KbdGroup
      aria-label={`Control or Command plus ${accessibleKeyLabel}`}
      className={cn("whitespace-nowrap", className)}
    >
      <Kbd>Ctrl</Kbd>
      <span aria-hidden="true">/</span>
      <Kbd>⌘</Kbd>
      <span aria-hidden="true">+</span>
      <Kbd>{keyLabel}</Kbd>
    </KbdGroup>
  );
}
