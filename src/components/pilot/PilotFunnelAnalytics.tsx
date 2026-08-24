/**
 * Pilot funnel analytics: invited vs claimed vs onboarded vs activated, shown
 * cumulatively over time and broken down by the sector and country participants
 * declared at intake. Every number is counted from a recorded timestamp.
 */

import { useMemo } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PilotCohortRow } from "@/lib/pilot/pilot.model";
import {
  buildFunnelBreakdown,
  buildFunnelSeries,
  conversionPercent,
  funnelAnalyticsToCsv,
  type CohortOnboardingProfile,
  type FunnelBreakdownRow,
} from "@/lib/pilot/pilot.enrollment-analytics";

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BreakdownTable({ rows, label }: { rows: FunnelBreakdownRow[]; label: string }) {
  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">No seats to break down by {label} yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Pilot enrolment funnel by {label}</caption>
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th scope="col" className="py-2 pr-4">
              {label}
            </th>
            <th scope="col" className="py-2 pr-4">
              Invited
            </th>
            <th scope="col" className="py-2 pr-4">
              Claimed
            </th>
            <th scope="col" className="py-2 pr-4">
              Onboarded
            </th>
            <th scope="col" className="py-2">
              Activated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="py-2 pr-4">{row.key}</td>
              <td className="py-2 pr-4">{row.invited}</td>
              <td className="py-2 pr-4">{row.claimed}</td>
              <td className="py-2 pr-4">{row.onboarded}</td>
              <td className="py-2">{row.activated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PilotFunnelAnalytics({
  rows,
  onboarding,
}: {
  rows: readonly PilotCohortRow[];
  onboarding: readonly CohortOnboardingProfile[];
}) {
  const series = useMemo(() => buildFunnelSeries(rows, onboarding), [rows, onboarding]);
  const bySector = useMemo(
    () => buildFunnelBreakdown(rows, onboarding, "sector"),
    [rows, onboarding],
  );
  const byCountry = useMemo(
    () => buildFunnelBreakdown(rows, onboarding, "country"),
    [rows, onboarding],
  );
  const latest = series[series.length - 1] ?? {
    date: "",
    invited: 0,
    claimed: 0,
    onboarded: 0,
    activated: 0,
  };
  const stages = [
    { key: "invited", label: "Invited", value: latest.invited },
    { key: "claimed", label: "Claimed", value: latest.claimed },
    { key: "onboarded", label: "Onboarded", value: latest.onboarded },
    { key: "activated", label: "Activated", value: latest.activated },
  ] as const;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Funnel analytics</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={series.length === 0 && bySector.length === 0}
            onClick={() => {
              downloadCsv(
                "pilot-funnel-analytics.csv",
                funnelAnalyticsToCsv({ series, bySector, byCountry }),
              );
              toast.success("Funnel analytics downloaded");
            }}
          >
            <Download className="mr-1 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Counted from recorded seat, intake and activation timestamps. Revoked seats are excluded.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.key} className="rounded-lg border p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {stage.label}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold">{stage.value}</div>
              <Progress
                className="mt-2"
                value={conversionPercent(stage.value, latest.invited)}
                aria-label={`${stage.label} share of invited seats`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {conversionPercent(stage.value, latest.invited)}% of invited
              </p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="time">
          <TabsList>
            <TabsTrigger value="time">Over time</TabsTrigger>
            <TabsTrigger value="sector">By sector</TabsTrigger>
            <TabsTrigger value="country">By country</TabsTrigger>
          </TabsList>
          <TabsContent value="time" className="pt-3">
            {series.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No enrolment activity recorded yet, so there is no series to plot.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Cumulative pilot enrolment funnel by calendar day
                  </caption>
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th scope="col" className="py-2 pr-4">
                        Day
                      </th>
                      <th scope="col" className="py-2 pr-4">
                        Invited
                      </th>
                      <th scope="col" className="py-2 pr-4">
                        Claimed
                      </th>
                      <th scope="col" className="py-2 pr-4">
                        Onboarded
                      </th>
                      <th scope="col" className="py-2 pr-4">
                        Activated
                      </th>
                      <th scope="col" className="py-2">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((point) => (
                      <tr key={point.date} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{point.date}</td>
                        <td className="py-2 pr-4">{point.invited}</td>
                        <td className="py-2 pr-4">{point.claimed}</td>
                        <td className="py-2 pr-4">{point.onboarded}</td>
                        <td className="py-2 pr-4">{point.activated}</td>
                        <td className="py-2 min-w-[120px]">
                          <Progress
                            value={conversionPercent(point.activated, point.invited)}
                            aria-label={`Activated share on ${point.date}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="sector" className="pt-3">
            <BreakdownTable rows={bySector} label="Sector" />
          </TabsContent>
          <TabsContent value="country" className="pt-3">
            <BreakdownTable rows={byCountry} label="Country" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
