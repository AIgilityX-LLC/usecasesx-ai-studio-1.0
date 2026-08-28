/**
 * Readiness to launch — one checklist, ordered by leverage.
 *
 * Every row is a live gate: measured status, when it was last verified, and the
 * button that goes to the surface that clears it. Pilot evidence updates on its
 * own as participants complete onboarding and checkpoints, so this page polls
 * rather than asking anyone to remember to refresh it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, RefreshCw, XCircle } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getLaunchReadinessFn, runAndRecordLaunchChecksFn } from "@/lib/qa/qa.functions";
import {
  READINESS_VERDICT_LABEL,
  audienceReadiness,
  buildReadinessGates,
  readinessVerdict,
  type GateStatus,
} from "@/lib/release/readiness";
import {
  buildLaunchChecklist,
  checklistProgress,
  verifiedLabel,
  type ChecklistItem,
} from "@/lib/release/checklist";
import { RELEASE_TARGET_DATE, RELEASE_VERSION } from "@/lib/release";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/administration/launch-readiness")({
  head: () => privateHead("Readiness to launch"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view the launch readiness checklist">
      <LaunchReadinessChecklistPage />
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

function LaunchReadinessChecklistPage() {
  const queryClient = useQueryClient();
  const readReadiness = useServerFn(getLaunchReadinessFn);
  const runAndRecord = useServerFn(runAndRecordLaunchChecksFn);

  const readiness = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => readReadiness(),
    // Pilot evidence lands whenever a participant finishes a step.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const rerun = useMutation({
    mutationFn: (cohort: string) =>
      runAndRecord({
        data: {
          cohort,
          trigger: "manual" as const,
          triggerDetail: "Re-run from the readiness checklist",
        },
      }),
    onSuccess: (result) => {
      const verdict = result.run.summary.verdict;
      toast[verdict === "pass" ? "success" : "error"](
        `Launch checks recorded: ${verdict.toUpperCase()}`,
        {
          description: `${result.run.summary.passed}/${result.run.summary.total} passed · ${result.run.summary.p0Failures} P0 failure(s)`,
        },
      );
      void queryClient.invalidateQueries({ queryKey: ["launch-readiness"] });
    },
    onError: (error: unknown) =>
      toast.error("Launch checks were not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  if (readiness.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-32 w-full" />
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
    cohort: data.summary,
    waiverActive: data.waiverActive,
    waiverNote: data.waiverNote ?? undefined,
    generatedAt: new Date().toISOString(),
    actor: "admin console",
  });
  const items = buildLaunchChecklist(gates);
  const progress = checklistProgress(items);
  const verdict = readinessVerdict(gates);
  const audiences = audienceReadiness(gates);
  const evidence = data.evidence ?? { onboardingProfiles: 0, latestEvidenceAt: null };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Readiness to launch</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            v{RELEASE_VERSION} · target {RELEASE_TARGET_DATE}. Ordered by leverage: the top item
            recovers the most readiness across investor, demo, client and production scores.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void readiness.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh statuses
          </Button>
          <Button size="sm" disabled={rerun.isPending} onClick={() => rerun.mutate(data.cohort)}>
            {rerun.isPending ? "Running…" : "Re-run launch checks"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{READINESS_VERDICT_LABEL[verdict]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress.percent} aria-label="Checklist progress" />
          <p className="text-sm text-muted-foreground">
            {progress.cleared} of {progress.total} gates cleared · {progress.open} open ·{" "}
            {progress.blocking} blocking.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-xs text-muted-foreground">{audience.detail}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilot evidence collected automatically</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Onboarding intakes" value={String(evidence.onboardingProfiles)} />
          <Fact label="Checkpoint responses" value={String(data.summary.checkpointResponses)} />
          <Fact label="Activated seats" value={String(data.summary.activated)} />
          <Fact
            label="Last participant evidence"
            value={
              evidence.latestEvidenceAt
                ? new Date(evidence.latestEvidenceAt).toLocaleString()
                : "None yet"
            }
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((item, index) => (
          <ChecklistRow key={item.id} item={item} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}

function ChecklistRow({ item, rank }: { item: ChecklistItem; rank: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-sm font-semibold text-muted-foreground">{rank}</span>
          {statusIcon(item.status)}
          <div className="space-y-1">
            <p className="font-medium">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.detail}</p>
            <p className="text-sm text-muted-foreground">{item.why}</p>
            <p className="text-xs text-muted-foreground">
              {verifiedLabel(item.verifiedAt)}
              {item.leverage > 0 ? ` · ${item.leverage} readiness points recoverable` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {statusBadge(item.status)}
          {item.actions.map((action) => (
            <Button
              key={action.to + action.label}
              asChild
              size="sm"
              variant={action.primary ? "default" : "outline"}
            >
              <Link to={action.to}>
                {action.label}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
