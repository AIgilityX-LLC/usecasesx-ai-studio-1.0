/**
 * Audience readiness drilldown — which gates contributed to one audience's
 * percentage, the measured counts behind them and the pilot participant
 * breakdown. Read-only; every figure comes from the same measured gates the
 * release candidate console shows.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, XCircle } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getLaunchReadinessFn } from "@/lib/qa/qa.functions";
import {
  READINESS_AUDIENCE_LABEL,
  READINESS_VERDICT_LABEL,
  audienceContributions,
  audienceReadiness,
  buildReadinessGates,
  isReadinessAudience,
  measuredCounts,
  participantBreakdown,
  type GateStatus,
  type ReadinessInput,
} from "@/lib/release/readiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/platform-admin/readiness/$audience")({
  head: () => privateHead("Readiness drilldown"),
  params: {
    parse: (raw: Record<string, string>) => {
      if (!isReadinessAudience(raw.audience)) throw notFound();
      return { audience: raw.audience };
    },
    stringify: (parsed: { audience: string }) => ({ audience: parsed.audience }),
  },
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view readiness drilldowns">
      <AudienceDrilldownPage />
    </RequireRoles>
  ),
});

function gateBadge(status: GateStatus) {
  if (status === "pass") return <Badge variant="default">Pass</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (status === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Not measured</Badge>;
}

function AudienceDrilldownPage() {
  const { audience } = Route.useParams();
  const readReadiness = useServerFn(getLaunchReadinessFn);
  const readiness = useQuery({ queryKey: ["launch-readiness"], queryFn: () => readReadiness() });

  const data = readiness.data;
  const latestRun = data?.runs?.[0] ?? null;
  const input: ReadinessInput | null = data
    ? {
        run: latestRun,
        browserRun: data.browserRun ?? null,
        cohort: data.summary,
        waiverActive: data.waiverActive,
        ...(data.waiverNote ? { waiverNote: data.waiverNote } : {}),
        generatedAt: new Date().toISOString(),
        actor: latestRun?.actorEmail ?? "platform admin",
      }
    : null;
  const gates = input ? buildReadinessGates(input) : [];
  const entry = input ? audienceReadiness(gates).find((a) => a.audience === audience) : null;
  const contributions = gates.length ? audienceContributions(audience, gates) : [];
  const inScope = contributions.filter((c) => c.weight > 0);
  const outOfScope = contributions.filter((c) => c.weight === 0);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/platform-admin/release-candidate">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to release candidate
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {READINESS_AUDIENCE_LABEL[audience]} — drilldown
        </h1>
        <p className="text-sm text-muted-foreground">
          How this percentage was measured: the gates in scope, their weights, the counts behind
          them and the pilot participant breakdown.
        </p>
      </header>

      {readiness.isPending && <Skeleton className="h-40 w-full" />}

      {readiness.isError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Readiness could not be read</AlertTitle>
          <AlertDescription>
            {readiness.error instanceof Error
              ? readiness.error.message
              : "Please retry from the admin console."}
          </AlertDescription>
        </Alert>
      )}

      {input && entry && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Score</CardTitle>
              <Badge
                variant={
                  entry.verdict === "ready"
                    ? "default"
                    : entry.verdict === "conditional"
                      ? "secondary"
                      : "destructive"
                }
              >
                {READINESS_VERDICT_LABEL[entry.verdict]}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-4xl font-semibold tabular-nums">{entry.percent}%</div>
              <Progress
                value={entry.percent}
                aria-label={`${entry.label} ${entry.percent} percent`}
              />
              <p className="text-sm text-muted-foreground">{entry.detail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contributing gates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th scope="col" className="py-2 pr-3">
                        Gate
                      </th>
                      <th scope="col" className="py-2 pr-3">
                        Status
                      </th>
                      <th scope="col" className="py-2 pr-3">
                        Weight
                      </th>
                      <th scope="col" className="py-2 pr-3">
                        Contributed
                      </th>
                      <th scope="col" className="py-2">
                        Lost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inScope.map((c) => (
                      <tr key={c.gate.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{c.gate.label}</div>
                          <div className="text-xs text-muted-foreground">{c.gate.detail}</div>
                        </td>
                        <td className="py-2 pr-3">{gateBadge(c.gate.status)}</td>
                        <td className="py-2 pr-3 tabular-nums">{c.weight}</td>
                        <td className="py-2 pr-3 tabular-nums">{c.contributedPercent}%</td>
                        <td className="py-2 tabular-nums">{c.lostPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {outOfScope.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Not in scope for this audience: {outOfScope.map((c) => c.gate.label).join(", ")}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Measured counts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {measuredCounts(input).map((count) => (
                  <li
                    key={count.label}
                    className="flex flex-wrap items-baseline gap-2 py-2 text-sm"
                  >
                    <span className="font-medium">{count.label}</span>
                    <span className="font-mono">{count.value}</span>
                    <span className="text-muted-foreground">{count.source}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participant breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {participantBreakdown(input.cohort).map((row) => (
                  <div key={row.label} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {row.count === null ? "—" : row.count}
                    </div>
                    <div className="text-xs text-muted-foreground">{row.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cohort <span className="font-mono">{data?.cohort}</span>
                {input.waiverActive
                  ? ` · evidence waiver active${input.waiverNote ? ` — ${input.waiverNote}` : ""}`
                  : " · no evidence waiver in force"}
                .
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/platform-admin/pilot">Open pilot cohort</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
