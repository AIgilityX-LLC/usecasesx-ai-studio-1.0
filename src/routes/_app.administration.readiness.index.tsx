/**
 * Readiness — the single go-live view.
 *
 * Answers one question for five audiences at once: can this be launched
 * publicly, and if not, what is holding it back? Every percentage is derived
 * from the same measured gates as the launch checklist, so nothing here is a
 * hand-maintained status. Unmeasured gates score partial credit and say so —
 * a gate that has never run is never reported as cleared.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getLaunchReadinessFn } from "@/lib/qa/qa.functions";
import {
  READINESS_VERDICT_LABEL,
  audienceReadiness,
  buildReadinessGates,
  readinessVerdict,
  type GateStatus,
  type ReadinessVerdict,
} from "@/lib/release/readiness";
import { buildLaunchChecklist, checklistProgress, verifiedLabel } from "@/lib/release/checklist";
import { RELEASE_TARGET_DATE, RELEASE_VERSION } from "@/lib/release";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/administration/readiness/")({
  head: () => privateHead("Readiness"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view launch readiness">
      <ReadinessOverviewPage />
    </RequireRoles>
  ),
});

function statusBadge(status: GateStatus) {
  if (status === "pass") return <Badge variant="default">Cleared</Badge>;
  if (status === "fail") return <Badge variant="destructive">Blocking</Badge>;
  if (status === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Not measured</Badge>;
}

function statusIcon(status: GateStatus) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" aria-hidden />;
  if (status === "attention")
    return <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

function verdictBadge(verdict: ReadinessVerdict) {
  if (verdict === "ready") return <Badge variant="default">Go</Badge>;
  if (verdict === "conditional") return <Badge variant="secondary">Conditional</Badge>;
  return <Badge variant="destructive">No-go</Badge>;
}

function ReadinessOverviewPage() {
  const readReadiness = useServerFn(getLaunchReadinessFn);
  const readiness = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => readReadiness(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (readiness.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (readiness.error || !readiness.data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Readiness unavailable</AlertTitle>
          <AlertDescription>
            {readiness.error instanceof Error
              ? readiness.error.message
              : "The readiness picture could not be read for this account."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const data = readiness.data;
  const gates = buildReadinessGates({
    run: data.runs[0] ?? null,
    browserRun: data.browserRun ?? null,
    cohort: data.summary,
    waiverActive: data.waiverActive,
    waiverNote: data.waiverNote ?? undefined,
    generatedAt: new Date().toISOString(),
    actor: "admin console",
  });
  const verdict = readinessVerdict(gates);
  const audiences = audienceReadiness(gates);
  const items = buildLaunchChecklist(gates);
  const progress = checklistProgress(items);
  const blocking = items.filter((item) => item.status === "fail");
  const unmeasured = items.filter((item) => item.status === "unknown");

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Readiness</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            v{RELEASE_VERSION} · target {RELEASE_TARGET_DATE}. One measured picture of whether the
            product can go live publicly, scored separately for investors, demos, clients,
            deployment and production.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void readiness.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <span>Public launch verdict</span>
            {verdictBadge(verdict)}
            <span className="text-sm font-normal text-muted-foreground">
              {READINESS_VERDICT_LABEL[verdict]}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress.percent} aria-label="Gates cleared" />
          <p className="text-sm text-muted-foreground">
            {progress.cleared} of {progress.total} gates cleared · {progress.open} open ·{" "}
            {progress.blocking} blocking · {unmeasured.length} never measured.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map((audience) => (
              <Link
                key={audience.audience}
                to="/administration/readiness/$audience"
                params={{ audience: audience.audience }}
                className="rounded-md border border-border p-3 transition-colors hover:bg-accent"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {audience.label}
                </p>
                <p className="text-2xl font-semibold">{audience.percent}%</p>
                <div className="mt-1">{verdictBadge(audience.verdict)}</div>
                <p className="mt-1 text-xs text-muted-foreground">{audience.detail}</p>
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each percentage is weighted per audience. Open one to see which gates contributed and
            the exact participant breakdown behind it.
          </p>
        </CardContent>
      </Card>

      {blocking.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>
            {blocking.length} gate{blocking.length === 1 ? "" : "s"} block a public launch
          </AlertTitle>
          <AlertDescription>{blocking.map((item) => item.label).join(" · ")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gates behind these scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {statusIcon(item.status)}
                  {item.label}
                  {statusBadge(item.status)}
                </p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                <p className="text-xs text-muted-foreground">
                  {verifiedLabel(item.verifiedAt)} · recovers up to {item.leverage} points across
                  the five scores
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.actions.map((action) => (
                  <Button
                    key={action.to}
                    size="sm"
                    variant={action.primary ? "default" : "outline"}
                    asChild
                  >
                    <Link to={action.to}>
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where to act</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to="/administration/launch-readiness">Leverage-ordered checklist</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/administration/launch-checks">Run P0/P1 checks</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/administration/pilot">Pilot cohort and evidence</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/administration/release-candidate">Release candidate record</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
