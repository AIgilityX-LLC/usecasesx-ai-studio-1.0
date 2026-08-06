/**
 * Roadmap analytics — counts and per-quarter trend for the items in view.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DELIVERY_STAGES, DELIVERY_STAGE_LABELS } from "@/lib/portfolio-model";
import type { RoadmapAnalytics } from "@/lib/roadmap";

function Stat({ label, value, tone = false }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${tone ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export function RoadmapAnalyticsPanel({
  analytics,
  scopeLabel,
}: {
  analytics: RoadmapAnalytics;
  scopeLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Roadmap analytics</span>
          <Badge variant="secondary">{scopeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DELIVERY_STAGES.map((stage) => (
            <Stat
              key={stage}
              label={DELIVERY_STAGE_LABELS[stage]}
              value={String(analytics.byStage[stage])}
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Overdue" value={String(analytics.overdue)} tone={analytics.overdue > 0} />
          <Stat
            label="Blocked or dependency risk"
            value={String(analytics.blocked + analytics.dependencyRisk)}
            tone={analytics.blocked + analytics.dependencyRisk > 0}
          />
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Next-action completeness</p>
            <p className="text-xl font-semibold">{analytics.nextActionCompleteness}%</p>
            <Progress
              value={analytics.nextActionCompleteness}
              className="mt-2 h-2"
              aria-label="Next-action completeness"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics.withNextAction} of {analytics.total} have a next action
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Trend by quarter</h3>
          {analytics.periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to chart yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">
                  Roadmap counts by quarter, stage, overdue and next-action completeness
                </caption>
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Quarter
                    </th>
                    {DELIVERY_STAGES.map((stage) => (
                      <th key={stage} scope="col" className="py-2 pr-3 font-medium">
                        {DELIVERY_STAGE_LABELS[stage]}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Overdue
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Next action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.periods.map((period) => (
                    <tr key={period.period} className="border-b last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        {period.label}
                      </th>
                      {DELIVERY_STAGES.map((stage) => (
                        <td key={stage} className="py-2 pr-3 tabular-nums">
                          {period.byStage[stage]}
                        </td>
                      ))}
                      <td
                        className={`py-2 pr-3 tabular-nums ${period.overdue > 0 ? "text-destructive" : ""}`}
                      >
                        {period.overdue}
                      </td>
                      <td className="py-2 tabular-nums">{period.nextActionCompleteness}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
