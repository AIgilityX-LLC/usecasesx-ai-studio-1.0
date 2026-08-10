import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getLaunchLearning } from "@/lib/analytics/launch-learning.functions";
import { launchLearningToCsv } from "@/lib/analytics/launch-learning.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/administration/launch-learning")({
  head: () => privateHead("Launch learning"),
  component: LaunchLearningRoute,
});

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "28", label: "Last 4 weeks" },
  { value: "84", label: "Last 12 weeks" },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function LaunchLearningDashboard() {
  const load = useServerFn(getLaunchLearning);
  const [range, setRange] = useState("28");

  const window = useMemo(
    () => ({ from: isoDaysAgo(Number(range)), to: new Date().toISOString() }),
    [range],
  );

  const report = useQuery({
    queryKey: ["launch-learning", window.from, window.to],
    queryFn: () => load({ data: window }),
  });

  function download() {
    if (!report.data) return;
    const blob = new Blob([launchLearningToCsv(report.data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `launch-learning-${window.to.slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const data = report.data;
  const peak = Math.max(1, ...(data?.funnel ?? []).map((row) => row.users));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Launch learning</h1>
          <p className="text-sm text-muted-foreground">
            Activation funnel, AI usage, search gaps and enterprise interest. Demo and internal
            activity is excluded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={download} disabled={!data}>
            Export CSV
          </Button>
        </div>
      </header>

      {report.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading launch metrics…</p>
      ) : report.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {report.error instanceof Error ? report.error.message : "Could not load metrics."}
        </p>
      ) : !data ? null : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Activation funnel — visitor to workshop / advisory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.funnel.every((row) => row.users === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No qualifying activity in this window.
                </p>
              ) : (
                data.funnel.map((row) => (
                  <div key={row.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{row.label}</span>
                      <span className="text-muted-foreground">
                        {row.users}
                        {row.conversionPercent != null
                          ? ` · ${row.conversionPercent}% converted · ${row.dropOffPercent}% drop-off`
                          : ""}
                      </span>
                    </div>
                    <Progress value={Math.round((row.users / peak) * 100)} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <MetricList
              title="Top searches"
              empty="No searches recorded yet."
              rows={data.topSearches.map((row) => ({ key: row.query, value: row.searches }))}
            />
            <MetricList
              title="No-result searches"
              empty="No zero-result searches — good coverage."
              rows={data.noResultSearches.map((row) => ({
                key: row.query,
                value: row.zeroResultSearches,
              }))}
            />
            <MetricList
              title="AI usage by task"
              empty="No AI activity in this window."
              rows={data.aiUsage.map((row) => ({
                key: `${row.task}${row.errors > 0 ? ` (${row.errors} errors)` : ""}`,
                value: row.calls,
              }))}
            />
            <MetricList
              title="Enterprise interest"
              empty="No enterprise enquiries in this window."
              rows={data.enterpriseInterest.map((row) => ({
                key: row.interestArea,
                value: row.leads,
              }))}
            />
            <MetricList
              title="Feedback by status"
              empty="No feedback submitted yet."
              rows={data.feedbackByStatus.map((row) => ({ key: row.status, value: row.count }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { key: string; value: number }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4 py-2">
                <span className="min-w-0 truncate">{row.key}</span>
                <span className="tabular-nums text-muted-foreground">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LaunchLearningRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view launch learning metrics">
      <LaunchLearningDashboard />
    </RequireRoles>
  );
}
