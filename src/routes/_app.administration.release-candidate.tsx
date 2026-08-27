/**
 * Release candidate status — the frozen candidate identity, what verification
 * recorded, the known-issues scope and the migration manifest, alongside the
 * live launch-readiness picture. The one-click action re-runs the signed-in
 * P0/P1 checks and writes the run to the audit ledger.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  RELEASE_FREEZE_DATE,
  RELEASE_MARKER,
  RELEASE_NAME,
  RELEASE_TARGET_DATE,
  RELEASE_VERSION,
  releaseLabel,
} from "@/lib/release";
import {
  CHANGE_CONTROL,
  KNOWN_ISSUE_SCOPE,
  MIGRATION_MANIFEST,
  ROLLBACK_POSTURE,
  VERIFICATION_STEPS,
} from "@/lib/release/candidate";
import {
  READINESS_VERDICT_LABEL,
  audienceReadiness,
  buildReadinessGates,
  buildReadinessMarkdown,
  failingAssertions,
  readinessToCsv,
  readinessVerdict,
  type GateStatus,
  type ReadinessInput,
} from "@/lib/release/readiness";
import { getLaunchReadinessFn, runAndRecordLaunchChecksFn } from "@/lib/qa/qa.functions";
import { RUN_TRIGGER_LABEL, describeRun } from "@/lib/qa/launch-runs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/administration/release-candidate")({
  head: () => privateHead("Release candidate"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view the release candidate record">
      <ReleaseCandidatePage />
    </RequireRoles>
  ),
});

function gateBadge(status: GateStatus) {
  if (status === "pass") return <Badge variant="default">Pass</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (status === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Not measured</Badge>;
}

function download(filename: string, mime: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Report downloaded", { description: filename });
}

function ReleaseCandidatePage() {
  const queryClient = useQueryClient();
  const readReadiness = useServerFn(getLaunchReadinessFn);
  const runAndRecord = useServerFn(runAndRecordLaunchChecksFn);

  const readiness = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => readReadiness(),
  });

  const rerun = useMutation({
    mutationFn: (cohort: string) =>
      runAndRecord({
        data: {
          cohort,
          trigger: "manual" as const,
          triggerDetail: "Re-run from the release candidate console",
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

  const data = readiness.data;
  const latestRun = data?.runs?.[0] ?? null;
  const input: ReadinessInput | null = data
    ? {
        run: latestRun,
        cohort: data.summary,
        waiverActive: data.waiverActive,
        ...(data.waiverNote ? { waiverNote: data.waiverNote } : {}),
        generatedAt: new Date().toISOString(),
        actor: latestRun?.actorEmail ?? "platform admin",
      }
    : null;
  const gates = input ? buildReadinessGates(input) : [];
  const verdict = input ? readinessVerdict(gates) : null;
  const audiences = input ? audienceReadiness(gates) : [];
  const failing = failingAssertions(latestRun);
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Release candidate</h1>
        <p className="text-sm text-muted-foreground">
          {RELEASE_NAME} · candidate <span className="font-mono">v{RELEASE_VERSION}</span> under
          change freeze since {RELEASE_FREEZE_DATE}, targeting {RELEASE_TARGET_DATE}.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Frozen version</CardTitle>
          <Badge variant="outline" className="font-mono">
            <Lock className="mr-1 h-3 w-3" aria-hidden />
            {releaseLabel()}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-mono">v{RELEASE_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Release marker</dt>
              <dd className="font-mono">{RELEASE_MARKER}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Freeze date</dt>
              <dd>{RELEASE_FREEZE_DATE}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Target date</dt>
              <dd>{RELEASE_TARGET_DATE}</dd>
            </div>
          </dl>
          <div className="space-y-1 text-sm">
            <p className="font-medium">Change control</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {CHANGE_CONTROL.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={rerun.isPending || !data}
              onClick={() => data && rerun.mutate(data.cohort)}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${rerun.isPending ? "animate-spin" : ""}`}
                aria-hidden
              />
              {rerun.isPending ? "Running…" : "Re-run and record launch checks"}
            </Button>
            <Button
              variant="outline"
              disabled={!input}
              onClick={() =>
                input &&
                download(
                  `launch-readiness-${stamp}.md`,
                  "text/markdown",
                  buildReadinessMarkdown(input),
                )
              }
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden /> Readiness report
            </Button>
            <Button
              variant="outline"
              disabled={!input}
              onClick={() =>
                input &&
                download(`launch-readiness-${stamp}.csv`, "text/csv", readinessToCsv(input))
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden /> Readiness CSV
            </Button>
          </div>

          {readiness.isPending && <Skeleton className="h-24 w-full" />}

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

          {input && verdict && (
            <>
              <Alert variant={verdict === "blocked" ? "destructive" : "default"}>
                {verdict === "ready" ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <AlertCircle className="h-4 w-4" aria-hidden />
                )}
                <AlertTitle>{READINESS_VERDICT_LABEL[verdict]}</AlertTitle>
                <AlertDescription>
                  Cohort <span className="font-mono">{data?.cohort}</span> ·{" "}
                  {latestRun ? describeRun(latestRun) : "no recorded launch-check run yet"}.
                </AlertDescription>
              </Alert>

              <section className="space-y-3" aria-label="Readiness by audience">
                <p className="text-sm font-medium">Readiness by audience</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {audiences.map((entry) => (
                    <Link
                      key={entry.audience}
                      to="/administration/readiness/$audience"
                      params={{ audience: entry.audience }}
                      className="rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Open ${entry.label} drilldown — ${entry.percent} percent`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{entry.label}</span>
                        <span className="text-xl font-semibold tabular-nums">{entry.percent}%</span>
                      </div>
                      <Progress
                        className="mt-2"
                        value={entry.percent}
                        aria-label={`${entry.label} ${entry.percent} percent`}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
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
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{entry.detail}</p>
                      <p className="mt-2 text-xs font-medium text-primary">View drilldown →</p>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentages are computed from the measured gates below, weighted by what each
                  audience depends on. Unmeasured gates never score full marks.
                </p>
              </section>

              <ul className="divide-y">
                {gates.map((gate) => (
                  <li key={gate.id} className="flex flex-wrap items-center gap-2 py-3">
                    {gateBadge(gate.status)}
                    <span className="font-medium">{gate.label}</span>
                    <span className="text-sm text-muted-foreground">{gate.detail}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <p className="text-sm font-medium">Failing assertions</p>
                {failing.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {latestRun
                      ? "None — every check passed or was deliberately skipped."
                      : "Not measured: record a run to populate this section."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {failing.map((result) => (
                      <li key={result.id} className="rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="destructive">{result.status}</Badge>
                          <Badge variant="outline">{result.severity.toUpperCase()}</Badge>
                          <span className="font-medium">{result.title}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{result.observed}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {data && data.runs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recorded runs</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {data.runs.map((run) => (
                      <li key={run.id}>
                        {new Date(run.createdAt).toLocaleString()} ·{" "}
                        {RUN_TRIGGER_LABEL[run.trigger] ?? run.trigger} · {run.passed}/{run.total}{" "}
                        passed · P0 failures {run.p0Failures} ·{" "}
                        {run.actorEmail ?? run.actorId ?? "unknown actor"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {VERIFICATION_STEPS.map((step) => (
              <li key={step.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                {step.result === "pass" ? (
                  <Badge variant="default">Pass</Badge>
                ) : (
                  <Badge variant="outline">Runs in CI</Badge>
                )}
                <span className="font-medium">{step.label}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{step.command}</code>
                <span className="text-muted-foreground">{step.detail}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Known issues in scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {KNOWN_ISSUE_SCOPE.map((issue) => (
              <li key={issue.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={issue.impact === "High" ? "destructive" : "secondary"}>
                    {issue.impact}
                  </Badge>
                  <Badge variant="outline">{issue.classification}</Badge>
                  <span className="font-medium">{issue.issue}</span>
                </div>
                <p className="text-muted-foreground">{issue.mitigation}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Migration manifest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th scope="col" className="py-2 pr-3">
                    #
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Migration
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Purpose
                  </th>
                  <th scope="col" className="py-2">
                    Kind
                  </th>
                </tr>
              </thead>
              <tbody>
                {MIGRATION_MANIFEST.map((entry) => (
                  <tr key={entry.file} className="border-b last:border-0">
                    <td className="py-2 pr-3">{entry.order}</td>
                    <td className="py-2 pr-3 font-mono text-xs break-all">{entry.file}</td>
                    <td className="py-2 pr-3">{entry.purpose}</td>
                    <td className="py-2">
                      <Badge variant="outline">{entry.kind}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {ROLLBACK_POSTURE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
