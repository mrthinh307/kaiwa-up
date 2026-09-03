import { Layers } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReflexStatsOverviewProps = {
  completedLessons: number;
  dueCount: number;
  totalLessons: number;
};

export function ReflexStatsOverview({
  completedLessons,
  dueCount,
  totalLessons,
}: ReflexStatsOverviewProps) {
  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <Card className="border-2 bg-secondary-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers aria-hidden="true" className="size-5" /> Your progress
          </CardTitle>
          <span className="text-xs font-heading text-foreground/65">{completionPercent}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-xs font-heading uppercase text-foreground/65">Completed</span>
            <span className="font-heading">
              {completedLessons} / {totalLessons}{" "}
              <span className="text-xs font-base text-foreground/60">lessons</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-border bg-background">
            <div
              className="h-full bg-main transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t-2 border-border pt-3">
          <div className="rounded-base border border-border bg-background p-2.5">
            <p className="text-[11px] font-heading uppercase tracking-wider text-foreground/60">
              Total
            </p>
            <p className="mt-0.5 text-xl font-heading">{totalLessons}</p>
          </div>
          <div className="rounded-base border border-border bg-background p-2.5">
            <p className="text-[11px] font-heading uppercase tracking-wider text-foreground/60">
              SRS Due
            </p>
            <p className="mt-0.5 text-xl font-heading">{dueCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
