import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCtaAnalytics } from "@/lib/cta-analytics.functions";
import { ctaAnalyticsToCsv, type FunnelRow } from "@/lib/cta-analytics.server";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/administration/analytics")({
  head: () => privateHead("CTA conversion analytics"),
  component: AnalyticsRoute,
});

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const DEVICES = [
  { value: "all", label: "All devices" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function FunnelTable({ caption, rows }: { caption: string; rows: FunnelRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded in this window.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{caption}</th>
            <th className="py-2 pr-4 font-medium">Awareness</th>
            <th className="py-2 pr-4 font-medium">Consideration</th>
            <th className="py-2 pr-4 font-medium">Intent</th>
            <th className="py-2 pr-4 font-medium">Conversion</th>
            <th className="py-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono text-xs text-foreground">{row.key}</td>
              <td className="py-2 pr-4">{row.awareness}</td>
              <td className="py-2 pr-4">{row.consideration}</td>
              <td className="py-2 pr-4">{row.intent}</td>
              <td className="py-2 pr-4">{row.conversion}</td>
              <td className="py-2 font-semibold">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsDashboard() {
  const [range, setRange] = useState("30");
  const [device, setDevice] = useState("all");
  const fetchAnalytics = useServerFn(getCtaAnalytics);

  const window = useMemo(
    () => ({ from: isoDaysAgo(Number(range)), to: new Date().toISOString() }),
    [range],
  );

  const query = useQuery({
    queryKey: ["cta-analytics", range, device],
    queryFn: () =>
      fetchAnalytics({
        data: {
          from: window.from,
          to: window.to,
          device: device === "all" ? null : (device as "desktop" | "tablet" | "mobile"),
        },
      }),
  });

  function downloadCsv() {
    if (!query.data) return;
    const blob = new Blob([ctaAnalyticsToCsv(query.data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cta-funnel-${range}d-${device}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totals = query.data?.totals;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CTA conversion analytics</h1>
          <p className="text-sm text-muted-foreground">
            Funnel counts from recorded CTA events. Demo and internal activity are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={downloadCsv} disabled={!query.data}>
            Export CSV
          </Button>
        </div>
      </header>

      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading analytics…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : null}

      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["Awareness", totals.awareness],
              ["Consideration", totals.consideration],
              ["Intent", totals.intent],
              ["Conversion", totals.conversion],
              ["Total events", totals.total],
            ] as const
          ).map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {query.data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>By page</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelTable caption="Page" rows={query.data.byPage} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By device</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelTable caption="Device" rows={query.data.byDevice} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By day</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelTable caption="Day" rows={query.data.byDay} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function AnalyticsRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES}>
      <AnalyticsDashboard />
    </RequireRoles>
  );
}
