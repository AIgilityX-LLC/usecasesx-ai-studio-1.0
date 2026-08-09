import { Gauge, TriangleAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FairUseStatus } from "@/lib/ai/fair-use.server";

function resetLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "shortly";
  const mins = Math.max(0, Math.round((t - Date.now()) / 60000));
  if (mins < 60) return `in ${mins} min`;
  return `in ${Math.round(mins / 60)} h`;
}

/**
 * Shows how much of the complimentary Pro Founding Access allowance is left in
 * the rolling 24-hour window, and says plainly when generation is paused.
 */
export function FairUseMeter({
  status,
  loading,
  className,
}: {
  status: FairUseStatus | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading && !status) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Checking your fair-use allowance…
        </CardContent>
      </Card>
    );
  }
  if (!status) return null;

  const pct = Math.min(100, Math.round((status.user.used / Math.max(1, status.user.limit)) * 100));
  const exhausted = !status.allowed;
  const nearing = !exhausted && pct >= 80;

  return (
    <Card className={cn(exhausted && "border-destructive/50", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            {exhausted ? (
              <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden />
            ) : (
              <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            Fair-use allowance
          </span>
          <span
            className={cn(
              "text-sm tabular-nums",
              exhausted ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status.remaining} left
          </span>
        </div>

        <Progress value={pct} aria-label="Fair-use allowance consumed" />

        <p className="text-xs text-muted-foreground">
          {status.user.used} of {status.user.limit} generations used in the last{" "}
          {status.windowHours} hours · workspace {status.workspace.used}/{status.workspace.limit} ·
          resets {resetLabel(status.resetsAt)}
        </p>

        {exhausted && (
          <p className="text-xs text-destructive">
            Generation is paused until your allowance resets. Viewing and exporting existing work is
            unaffected.
          </p>
        )}
        {nearing && (
          <p className="text-xs text-muted-foreground">
            You are close to the limit for this window.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
