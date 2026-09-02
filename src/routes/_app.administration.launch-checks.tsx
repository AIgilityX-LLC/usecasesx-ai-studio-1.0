/**
 * Signed-in launch checks — the P0/P1 harness that can only run inside a real
 * session. Each check runs on its own so a failure can be reproduced in
 * isolation; the assembled run is written to the ledger as evidence. The
 * browser suite has its own panel: a Worker cannot drive a browser, so its
 * Playwright report is imported and recorded rather than invented.
 */
import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  FileText,
  ListChecks,
  MonitorPlay,
  PlayCircle,
  Save,
  Upload,
  XCircle,
} from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  listBrowserSuiteRunsFn,
  recordBrowserSuiteRunFn,
  recordLaunchCheckResultsFn,
  runAndRecordLaunchChecksFn,
  runLaunchCheckFn,
  runLaunchChecksFn,
} from "@/lib/qa/qa.functions";
import { PILOT_COHORT } from "@/lib/pilot/pilot.model";
import {
  LAUNCH_CHECKS,
  buildHarnessMarkdown,
  harnessResultsToCsv,
  summarizeResults,
  type CheckResult,
} from "@/lib/qa/harness";
import {
  browserRunToCsv,
  describeBrowserRun,
  parsePlaywrightReport,
  type BrowserSuiteRun,
} from "@/lib/qa/browser-suite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/administration/launch-checks")({
  head: () => privateHead("Launch checks"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="run the signed-in launch checks">
      <LaunchChecks />
    </RequireRoles>
  ),
});

function statusBadge(status: CheckResult["status"]) {
  if (status === "pass") return <Badge variant="default">Pass</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="outline">Skipped</Badge>;
}

function verdictBadge(verdict: BrowserSuiteRun["verdict"]) {
  if (verdict === "pass") return <Badge variant="default">Pass</Badge>;
  if (verdict === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (verdict === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
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
  toast.success("Evidence downloaded", { description: filename });
}

function LaunchChecks() {
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Signed-in launch checks</h1>
        <p className="text-sm text-muted-foreground">
          Runs {LAUNCH_CHECKS.length} P0/P1 probes through your own session — identity, entitlement
          resolution, row scoping and tenant isolation — so the results reflect exactly what this
          account is allowed to see.
        </p>
      </header>
      <StepHarness stamp={stamp} />
      <BrowserSuitePanel stamp={stamp} />
    </div>
  );
}

/** Step-by-step harness: run one check, run them in sequence, then record. */
function StepHarness({ stamp }: { stamp: string }) {
  const runOne = useServerFn(runLaunchCheckFn);
  const runAll = useServerFn(runLaunchChecksFn);
  const runAndRecord = useServerFn(runAndRecordLaunchChecksFn);
  const recordResults = useServerFn(recordLaunchCheckResultsFn);
  const queryClient = useQueryClient();

  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sequential, setSequential] = useState(false);
  const cancelled = useRef(false);

  const ordered = useMemo(
    () => LAUNCH_CHECKS.map((check) => results[check.id]).filter(Boolean) as CheckResult[],
    [results],
  );
  const completed = ordered.length;
  const summary = completed > 0 ? summarizeResults(ordered) : null;
  const runAt = new Date().toISOString();

  const executeOne = async (id: string) => {
    setActiveId(id);
    try {
      const result = await runOne({ data: { id } });
      setResults((prev) => ({ ...prev, [id]: result as CheckResult }));
      return result as CheckResult;
    } finally {
      setActiveId(null);
    }
  };

  const singleMutation = useMutation({
    mutationFn: executeOne,
    onSuccess: (result) =>
      toast[result.status === "pass" ? "success" : "error"](`${result.title}: ${result.status}`, {
        description: result.observed,
      }),
    onError: (error: unknown) =>
      toast.error("Check did not complete", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const sequenceMutation = useMutation({
    mutationFn: async () => {
      cancelled.current = false;
      setSequential(true);
      setResults({});
      const collected: CheckResult[] = [];
      for (const check of LAUNCH_CHECKS) {
        if (cancelled.current) break;
        collected.push(await executeOne(check.id));
      }
      setSequential(false);
      return collected;
    },
    onSuccess: (collected) => {
      if (collected.length === 0) return;
      const s = summarizeResults(collected);
      toast[s.verdict === "pass" ? "success" : "error"](`Sequence: ${s.verdict.toUpperCase()}`, {
        description: `${s.passed}/${s.total} passed · ${s.p0Failures} P0 failure(s)`,
      });
    },
    onError: (error: unknown) => {
      setSequential(false);
      toast.error("Sequence stopped", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      if (ordered.length === 0) throw new Error("Run at least one check before recording.");
      return recordResults({
        data: {
          cohort: PILOT_COHORT,
          trigger: "manual" as const,
          triggerDetail: `Step-by-step harness (${ordered.length}/${LAUNCH_CHECKS.length} checks)`,
          results: ordered.map((result) => ({
            id: result.id,
            status: result.status,
            observed: result.observed,
            durationMs: result.durationMs,
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Run recorded for audit");
      void queryClient.invalidateQueries({ queryKey: ["launch-readiness"] });
    },
    onError: (error: unknown) =>
      toast.error("Run was not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const batchMutation = useMutation({
    mutationFn: () =>
      runAndRecord({
        data: {
          cohort: PILOT_COHORT,
          trigger: "manual" as const,
          triggerDetail: "Run and recorded from the launch checks page",
        },
      }),
    onSuccess: (result) => {
      const map: Record<string, CheckResult> = {};
      for (const item of result.run.results) map[item.id] = item as CheckResult;
      setResults(map);
      void queryClient.invalidateQueries({ queryKey: ["launch-readiness"] });
      toast[result.run.summary.verdict === "pass" ? "success" : "error"](
        `Run recorded: ${result.run.summary.verdict.toUpperCase()}`,
        {
          description: `${result.run.summary.passed}/${result.run.summary.total} passed · ${result.run.summary.p0Failures} P0 failure(s)`,
        },
      );
    },
    onError: (error: unknown) =>
      toast.error("Run was not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const dryRunMutation = useMutation({
    mutationFn: () => runAll(),
    onSuccess: (result) => {
      const map: Record<string, CheckResult> = {};
      for (const item of result.results) map[item.id] = item as CheckResult;
      setResults(map);
    },
    onError: (error: unknown) =>
      toast.error("Launch checks did not complete", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const busy =
    sequential ||
    singleMutation.isPending ||
    batchMutation.isPending ||
    dryRunMutation.isPending ||
    recordMutation.isPending;

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" aria-hidden /> Step-by-step P0/P1 harness
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => sequenceMutation.mutate()}>
            <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
            {sequential ? "Running sequence…" : "Run all, step by step"}
          </Button>
          {sequential && (
            <Button
              variant="outline"
              onClick={() => {
                cancelled.current = true;
              }}
            >
              Stop after current check
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={busy || ordered.length === 0}
            onClick={() => recordMutation.mutate()}
          >
            <Save className="mr-2 h-4 w-4" aria-hidden />
            {recordMutation.isPending ? "Recording…" : "Record these results"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => batchMutation.mutate()}>
            Run all and record in one go
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => dryRunMutation.mutate()}>
            Dry run (no ledger write)
          </Button>
          <Button
            variant="outline"
            disabled={ordered.length === 0}
            onClick={() =>
              download(`launch-checks-${stamp}.csv`, "text/csv", harnessResultsToCsv(ordered))
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Results CSV
          </Button>
          <Button
            variant="outline"
            disabled={ordered.length === 0 || !summary}
            onClick={() =>
              summary &&
              download(
                `launch-checks-${stamp}.md`,
                "text/markdown",
                buildHarnessMarkdown({
                  runAt,
                  actor: "step-by-step harness",
                  isAdmin: true,
                  results: ordered,
                }),
              )
            }
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden /> Evidence report
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/administration/release-candidate">Release candidate status</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={(completed / LAUNCH_CHECKS.length) * 100} />
          <p className="text-xs text-muted-foreground">
            {completed}/{LAUNCH_CHECKS.length} checks run
            {summary
              ? ` · ${summary.passed} passed · ${summary.failed} failed · ${summary.errored} errored · ${summary.p0Failures} P0 failure(s)`
              : " · nothing measured yet"}
          </p>
        </div>

        {summary && completed === LAUNCH_CHECKS.length && (
          <Alert variant={summary.verdict === "fail" ? "destructive" : "default"}>
            {summary.verdict === "pass" ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            <AlertTitle>
              {summary.verdict === "pass"
                ? "All checks passed"
                : summary.verdict === "attention"
                  ? "Passed with P1 attention"
                  : "P0 failures — do not freeze the release"}
            </AlertTitle>
            <AlertDescription>
              Record the run so the readiness gates read this measurement.
            </AlertDescription>
          </Alert>
        )}

        <ul className="divide-y">
          {LAUNCH_CHECKS.map((check) => {
            const result = results[check.id];
            const running = activeId === check.id;
            return (
              <li key={check.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {result ? (
                    statusBadge(result.status)
                  ) : (
                    <Badge variant="outline">{running ? "Running…" : "Not run"}</Badge>
                  )}
                  <Badge variant="outline">{check.severity.toUpperCase()}</Badge>
                  <span className="font-medium">{check.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {check.area}
                    {result ? ` · ${result.durationMs} ms` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => singleMutation.mutate(check.id)}
                  >
                    {result ? "Re-run" : "Run"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{check.expectation}</p>
                {result && <p className="text-sm">{result.observed}</p>}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Browser P0/P1 suite evidence: import the Playwright report, record, review. */
function BrowserSuitePanel({ stamp }: { stamp: string }) {
  const listRuns = useServerFn(listBrowserSuiteRunsFn);
  const recordRun = useServerFn(recordBrowserSuiteRunFn);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [participantEmail, setParticipantEmail] = useState("");
  const [notes, setNotes] = useState("");

  const runs = useQuery({
    queryKey: ["browser-suite-runs", PILOT_COHORT],
    queryFn: () => listRuns({ data: { cohort: PILOT_COHORT, limit: 10 } }),
  });
  const latest = (runs.data?.[0] ?? null) as BrowserSuiteRun | null;

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const parsed = parsePlaywrightReport(JSON.parse(await file.text()));
      if (parsed.results.length === 0) {
        throw new Error("No specs found in that report — export it with the JSON reporter.");
      }
      return recordRun({
        data: {
          cohort: PILOT_COHORT,
          participantEmail: participantEmail.trim() || null,
          durationMs: Math.round(parsed.durationMs),
          notes: notes.trim() || null,
          specResults: parsed.results,
        },
      });
    },
    onSuccess: (run) => {
      void queryClient.invalidateQueries({ queryKey: ["browser-suite-runs", PILOT_COHORT] });
      void queryClient.invalidateQueries({ queryKey: ["launch-readiness"] });
      toast[run.verdict === "pass" ? "success" : "error"](
        `Browser suite recorded: ${run.verdict.toUpperCase()}`,
        { description: describeBrowserRun(run) },
      );
    },
    onError: (error: unknown) =>
      toast.error("Browser suite run was not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorPlay className="h-4 w-4" aria-hidden /> Browser P0/P1 suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>How this gate is measured</AlertTitle>
          <AlertDescription>
            The app runtime cannot drive a browser, so the suite runs outside it — as a signed-in
            participant — with{" "}
            <code className="rounded bg-muted px-1">
              bun run test:e2e -- --reporter=json &gt; report.json
            </code>
            . Import that report here and the readiness browser gate reads the measurement instead
            of “unknown”.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="browser-participant">Signed in as (participant email)</Label>
            <Input
              id="browser-participant"
              type="email"
              placeholder="participant@example.com"
              value={participantEmail}
              onChange={(event) => setParticipantEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="browser-notes">Notes (optional)</Label>
            <Input
              id="browser-notes"
              placeholder="Chromium + WebKit, preview build"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importMutation.mutate(file);
              event.target.value = "";
            }}
          />
          <Button disabled={importMutation.isPending} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            {importMutation.isPending ? "Recording…" : "Record browser suite run"}
          </Button>
          <Button
            variant="outline"
            disabled={!latest}
            onClick={() =>
              latest &&
              download(`browser-suite-${stamp}.csv`, "text/csv", browserRunToCsv(latest))
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Latest run CSV
          </Button>
        </div>

        {latest ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {verdictBadge(latest.verdict)}
              <span className="text-sm">{describeBrowserRun(latest)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(latest.createdAt).toLocaleString()}
                {latest.actorEmail ? ` · ${latest.actorEmail}` : ""}
              </span>
            </div>
            <ul className="divide-y">
              {latest.specResults.slice(0, 50).map((result, index) => (
                <li key={`${result.spec}-${index}`} className="flex flex-wrap gap-2 py-2 text-sm">
                  <Badge
                    variant={
                      result.status === "passed"
                        ? "default"
                        : result.status === "skipped"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {result.status}
                  </Badge>
                  <span className="font-medium">{result.title}</span>
                  <span className="text-xs text-muted-foreground">{result.spec}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {result.durationMs} ms
                  </span>
                  {result.error && (
                    <p className="w-full text-xs text-destructive">{result.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {runs.isPending ? "Loading recorded runs…" : describeBrowserRun(null)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
