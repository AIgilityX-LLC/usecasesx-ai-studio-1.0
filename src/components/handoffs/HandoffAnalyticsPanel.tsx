/**
 * Handoff analytics.
 *
 * Three questions the queue owner actually asks: where are requests going,
 * how is the queue moving, and what provenance problems are we carrying.
 * Every number is derived from the workspace's own request rows and the
 * append-only audit trail — nothing is modelled or estimated.
 */

import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui-kit";
import { buildHandoffAnalytics, type HandoffStatusEvent } from "@/lib/handoffs/handoff.analytics";
import type { HandoffRequest } from "@/lib/handoffs/handoff.model";

export function HandoffAnalyticsPanel({
  requests,
  events,
  windowDays = 30,
}: {
  requests: HandoffRequest[];
  events: HandoffStatusEvent[];
  windowDays?: number;
}) {
  const analytics = useMemo(
    () => buildHandoffAnalytics(requests, events, { days: windowDays }),
    [requests, events, windowDays],
  );

  if (analytics.total === 0) {
    return (
      <EmptyState
        title="Nothing to analyse yet"
        description="Analytics appear once this workspace has raised its first handoff request."
      />
    );
  }

  const maxTarget = Math.max(1, ...analytics.byTarget.map((t) => t.total));
  const maxDay = Math.max(1, ...analytics.transitions.map((d) => d.total));

  return (
    <div className="space-y-4" data-testid="handoff-analytics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Requests" value={String(analytics.total)} testId="metric-total" />
        <Metric label="Open" value={String(analytics.open)} testId="metric-open" />
        <Metric label="Completed" value={String(analytics.completed)} testId="metric-completed" />
        <Metric
          label="Median hours to complete"
          value={
            analytics.medianHoursToComplete === null ? "—" : String(analytics.medianHoursToComplete)
          }
          testId="metric-median"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Requests by target</CardTitle>
            <CardDescription>Every request raised from this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.byTarget.map((entry) => (
              <div key={entry.target} className="space-y-1" data-testid={`target-${entry.target}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{entry.label}</span>
                  <span className="text-muted-foreground">
                    {entry.total} total · {entry.open} open · {entry.completed} completed
                  </span>
                </div>
                <Progress value={(entry.total / maxTarget) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Status transitions over time
            </CardTitle>
            <CardDescription>
              {analytics.transitionCount} recorded status move
              {analytics.transitionCount === 1 ? "" : "s"} between {analytics.from} and{" "}
              {analytics.to}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.transitionCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No status changes were recorded in this window.
              </p>
            ) : (
              <div className="flex h-32 items-end gap-1" data-testid="transition-chart">
                {analytics.transitions.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (day.total / maxDay) * 100)}%` }}
                    title={`${day.date}: ${day.total} transition${day.total === 1 ? "" : "s"}`}
                  />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {analytics.byStatus
                .filter((entry) => entry.count > 0)
                .map((entry) => (
                  <Badge key={entry.status} variant="outline">
                    {entry.label} {entry.count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Top drift and provenance warnings
          </CardTitle>
          <CardDescription>
            Ranked by how many requests carry each problem right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="no-warnings">
              No drift or provenance warnings on this workspace&apos;s requests.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="handoff-warnings">
              {analytics.warnings.map((warning) => (
                <li
                  key={warning.type}
                  className="space-y-1"
                  data-testid={`warning-${warning.type}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{warning.label}</span>
                    <Badge
                      variant="outline"
                      className={
                        warning.severity === "warning"
                          ? "border-destructive/40 text-destructive"
                          : undefined
                      }
                    >
                      {warning.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{warning.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold" data-testid={testId}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
