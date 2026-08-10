import { Trophy } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileProgressCardProps = {
  level: number;
  nextLevelExp: number;
  totalExp: number;
};

export function ProfileProgressCard({ level, nextLevelExp, totalExp }: ProfileProgressCardProps) {
  const remainingExp = Math.max(nextLevelExp - totalExp, 0);

  return (
    <Card className="bg-secondary-background">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground">
            <Trophy aria-hidden="true" className="size-5" />
          </span>
          <div>
            <CardTitle className="text-xl sm:text-2xl">Learning progress</CardTitle>
            <CardDescription className="mt-1">
              Keep building your conversation reflexes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.12em]">Current level</p>
            <p className="mt-1 text-3xl font-heading">Level {level}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-heading uppercase tracking-[0.12em]">Total earned</p>
            <p className="mt-1 text-xl font-heading sm:text-2xl">{totalExp} EXP</p>
          </div>
        </div>

        <progress
          aria-label={`Level progress: ${totalExp} of ${nextLevelExp} EXP`}
          className="mt-6 h-5 w-full overflow-hidden rounded-full border-2 border-border bg-background [&::-moz-progress-bar]:bg-main [&::-webkit-progress-bar]:bg-background [&::-webkit-progress-value]:bg-main"
          max={nextLevelExp}
          value={totalExp}
        />

        <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-heading">{remainingExp} EXP remaining</p>
          <p className="text-foreground/70">Next level at {nextLevelExp} EXP</p>
        </div>
      </CardContent>
    </Card>
  );
}
