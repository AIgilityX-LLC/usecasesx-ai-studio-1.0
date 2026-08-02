/**
 * Journey funnel — launch-learning view for the administration console.
 *
 * Reads the RLS-scoped `activation_funnel_daily` summary and folds it into the
 * core journey stages (Capture → Design → Score → Shortlist → Export) so the
 * team can see where users stop. No PII: only counts per day, event and
 * workspace, exactly as the reader is permitted to see them.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui-kit";
import { getActivationFunnelFn, type ActivationRow } from "@/lib/telemetry.functions";
import { PRODUCT_EVENTS } from "@/lib/telemetry/events";

type Stage = { key: string; label: string; events: string[]; hint: string };

/** Journey stages in the order the product asks users to walk them. */
const STAGES: Stage[] = [
  {
    key: "register",
    label: "Register",
    events: [PRODUCT_EVENTS.registered, PRODUCT_EVENTS.workspaceCreated],
    hint: "Account and workspace created",
  },
  {
    key: "capture",
    label: "Capture",
    events: [PRODUCT_EVENTS.opportunityCaptured],
    hint: "Business problem recorded before any AI solution",
  },
  {
    key: "design",
    label: "Design",
    events: [PRODUCT_EVENTS.opportunityConverted, PRODUCT_EVENTS.useCaseCompleted],
    hint: "Opportunity turned into a structured use case",
  },
  {
    key: "score",
    label: "Score",
    events: [PRODUCT_EVENTS.useCaseScored],
    hint: "Value, feasibility and risk assessed",
  },
  {
    key: "shortlist",
    label: "Shortlist",
    events: [PRODUCT_EVENTS.portfolioCreated],
    hint: "Prioritised into a portfolio",
  },
  {
    key: "export",
    label: "Export",
    events: [PRODUCT_EVENTS.reportExported],
    hint: "Evidence shared outside the product",
  },
];

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function JourneyFunnel() {
  const load = useServerFn(getActivationFunnelFn);
  const [range, setRange] = useState("30");
  const [workspaceFilter, setWorkspaceFilter] = useState("");

  const from = useMemo(() => isoDaysAgo(Number(range)), [range]);

  const query = useQuery({
    queryKey: ["journey-funnel", range],
    queryFn: () => load({ data: { from } }),
  });

  const rows: ActivationRow[] = useMemo(() => {
    const all = query.data?.rows ?? [];
    const needle = workspaceFilter.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((r) => (r.workspace_id ?? "").toLowerCase().includes(needle));
  }, [query.data, workspaceFilter]);

  const stageTotals = useMemo(() => {
    return STAGES.map((stage) => {
      const matching = rows.filter((r) => stage.events.includes(r.event_name));
      return {
        ...stage,
        events: matching.reduce((s, r) => s + Number(r.event_count ?? 0), 0),
        users: matching.reduce((s, r) => s + Number(r.user_count ?? 0), 0),
      };
    });
  }, [rows]);

  const entry = stageTotals[0]?.users ?? 0;

  const byDay = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const stage = STAGES.find((s) => s.events.includes(row.event_name));
      if (!stage) continue;
      const bucket = map.get(row.day) ?? {};
      bucket[stage.key] = (bucket[stage.key] ?? 0) + Number(row.event_count ?? 0);
      map.set(row.day, bucket);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 30);
  }, [rows]);

  if (query.isLoading) return <CardSkeleton />;
  if (query.isError || query.data?.error) {
    return (
      <ErrorState
        title="Journey analytics unavailable"
        description={query.data?.error ?? "We could not load activation events."}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journey funnel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Capture → Design → Score → Shortlist → Export, from recorded product events. Counts
            reflect what your role is permitted to read.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="funnel-range">Period</Label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger id="funnel-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="funnel-workspace">Workspace filter</Label>
            <Input
              id="funnel-workspace"
              value={workspaceFilter}
              placeholder="Workspace id contains…"
              onChange={(e) => setWorkspaceFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No activity in this period"
          description="Once users capture, design, score or export, their progress appears here."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stageTotals.map((stage) => (
              <Card key={stage.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{stage.label}</CardTitle>
                    <Badge variant="secondary">{percent(stage.users, entry)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{stage.hint}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-2xl font-semibold tabular-nums">{stage.users}</p>
                  <p className="text-xs text-muted-foreground">
                    users · {stage.events} events · {percent(stage.users, entry)} of entry
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Daily events by stage</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Journey stage event counts per day</caption>
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="py-2 pr-4">
                      Day
                    </th>
                    {STAGES.map((s) => (
                      <th key={s.key} scope="col" className="py-2 pr-4">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byDay.map(([day, counts]) => (
                    <tr key={day} className="border-b last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium">
                        {day}
                      </th>
                      {STAGES.map((s) => (
                        <td key={s.key} className="py-2 pr-4 tabular-nums">
                          {counts[s.key] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
