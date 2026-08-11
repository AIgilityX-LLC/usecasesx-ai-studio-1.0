/**
 * Pilot triage & release readiness — read-only stabilisation panel.
 *
 * Shows the classified pilot evidence and the explicit freeze recommendation.
 * Every row is derived from recorded signals; when there is no evidence the
 * panel says so instead of showing a metric.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Download, FileText, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { getPilotTriageFn } from "@/lib/pilot/pilot.functions";
import { TRIAGE_CLASSES, TRIAGE_CLASS_LABEL, TRIAGE_CLASS_TONE } from "@/lib/pilot/pilot.triage";
import { buildTriageReportMarkdown, triageFindingsToCsv } from "@/lib/pilot/pilot.export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function PilotTriagePanel() {
  const loadTriage = useServerFn(getPilotTriageFn);
  const triage = useQuery({
    queryKey: ["pilot-triage"],
    queryFn: () => loadTriage({ data: { windowDays: 30 } }),
    retry: false,
  });

  if (triage.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Triage &amp; release readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (triage.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Triage report could not be built</AlertTitle>
        <AlertDescription>
          {triage.error instanceof Error ? triage.error.message : "Please try again."}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => void triage.refetch()}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const report = triage.data;
  if (!report) return null;
  const { findings, freeze, evidenceGap } = report;
  const stamp = report.generatedAt.slice(0, 10);

  const download = (filename: string, mime: string, text: string) => {
    const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Triage report downloaded", { description: filename });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Triage &amp; release readiness
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Last {report.windowDays} days · cohort {report.cohort}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        {evidenceGap.state !== "none" && (
          <Alert variant={evidenceGap.triggered ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{evidenceGap.title}</AlertTitle>
            <AlertDescription>
              <p>{evidenceGap.detail}</p>
              <p className="mt-1">
                {evidenceGap.triggered
                  ? `The ${evidenceGap.windowDays}-day evidence window has elapsed. ${evidenceGap.action}`
                  : `Watchdog fires after ${evidenceGap.windowDays} days without evidence. ${evidenceGap.action}`}
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Alert variant={freeze.verdict === "go" ? "default" : "destructive"}>
          <AlertTitle>{freeze.headline}</AlertTitle>
          <AlertDescription>
            {freeze.reasons.length === 0 ? (
              <p>No blocking reason recorded in the current evidence window.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {freeze.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs">
              {freeze.freezeRecommended
                ? "Recommendation: freeze scope now — P0 fixes only until launch."
                : "Recommendation: keep the pilot running to gather evidence before freezing."}
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              download(
                `pilot-triage-${report.cohort}-${stamp}.md`,
                "text/markdown",
                buildTriageReportMarkdown(report),
              )
            }
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden /> Triage report (Markdown)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={findings.length === 0}
            onClick={() =>
              download(
                `pilot-triage-findings-${report.cohort}-${stamp}.csv`,
                "text/csv",
                triageFindingsToCsv(findings),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Findings CSV
          </Button>
        </div>

        <div
          className="grid gap-2 sm:grid-cols-5"
          role="list"
          aria-label="Findings by triage class"
        >
          {TRIAGE_CLASSES.map((cls) => (
            <div key={cls} role="listitem" className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {TRIAGE_CLASS_LABEL[cls]}
              </p>
              <p className="mt-1 text-xl font-semibold">{freeze.counts[cls]}</p>
            </div>
          ))}
        </div>

        {findings.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No classified findings yet. Findings appear as participants answer checkpoints, send
            reports, or as AI, search and security signals accumulate.
          </p>
        ) : (
          <ul className="space-y-3">
            {findings.map((finding) => (
              <li key={finding.key} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={TRIAGE_CLASS_TONE[finding.triage]}>
                    {TRIAGE_CLASS_LABEL[finding.triage]}
                  </Badge>
                  <p className="font-medium">{finding.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {finding.observations} observation{finding.observations === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{finding.detail}</p>
                <p className="mt-1 text-sm">{finding.action}</p>
                {finding.evidenceRoute && (
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link to={finding.evidenceRoute}>View evidence</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
