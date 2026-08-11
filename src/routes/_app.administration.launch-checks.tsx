/**
 * Signed-in launch checks — the P0/P1 harness that can only run inside a real
 * session. Results are evidence, so each row shows what was observed, and the
 * whole run downloads as CSV or Markdown for the release record.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, PlayCircle, XCircle } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { runLaunchChecksFn } from "@/lib/qa/qa.functions";
import {
  LAUNCH_CHECKS,
  buildHarnessMarkdown,
  harnessResultsToCsv,
  type CheckResult,
} from "@/lib/qa/harness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const run = useServerFn(runLaunchChecksFn);
  const mutation = useMutation({
    mutationFn: () => run(),
    onSuccess: (result) =>
      toast[result.summary.verdict === "pass" ? "success" : "error"](
        `Launch checks: ${result.summary.verdict.toUpperCase()}`,
        {
          description: `${result.summary.passed}/${result.summary.total} passed · ${result.summary.p0Failures} P0 failure(s)`,
        },
      ),
    onError: (error: unknown) =>
      toast.error("Launch checks did not complete", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const run_ = mutation.data;
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

      <div className="flex flex-wrap gap-2">
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
          {mutation.isPending ? "Running…" : "Run launch checks"}
        </Button>
        <Button
          variant="outline"
          disabled={!run_}
          onClick={() =>
            run_ &&
            download(`launch-checks-${stamp}.csv`, "text/csv", harnessResultsToCsv(run_.results))
          }
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Results CSV
        </Button>
        <Button
          variant="outline"
          disabled={!run_}
          onClick={() =>
            run_ &&
            download(`launch-checks-${stamp}.md`, "text/markdown", buildHarnessMarkdown(run_))
          }
        >
          <FileText className="mr-2 h-4 w-4" aria-hidden /> Evidence report
        </Button>
      </div>

      {!run_ && !mutation.isPending && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No run yet. The checks are read-only apart from one deliberate insert that row-level
          security must refuse.
        </p>
      )}

      {run_ && (
        <>
          <Alert variant={run_.summary.verdict === "fail" ? "destructive" : "default"}>
            {run_.summary.verdict === "pass" ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            <AlertTitle>
              {run_.summary.verdict === "pass"
                ? "All checks passed"
                : run_.summary.verdict === "attention"
                  ? "Passed with P1 attention"
                  : "P0 failures — do not freeze the release"}
            </AlertTitle>
            <AlertDescription>
              Run {new Date(run_.runAt).toLocaleString()} as {run_.actor}
              {run_.isAdmin ? " (platform admin)" : ""} · {run_.summary.passed}/{run_.summary.total}{" "}
              passed · {run_.summary.failed} failed · {run_.summary.errored} errored ·{" "}
              {run_.summary.skipped} skipped.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {run_.results.map((result) => (
                  <li key={result.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(result.status)}
                      <Badge variant="outline">{result.severity.toUpperCase()}</Badge>
                      <span className="font-medium">{result.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {result.area} · {result.durationMs} ms
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.expectation}</p>
                    <p className="text-sm">{result.observed}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
