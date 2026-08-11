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
import { ShieldAlert } from "lucide-react";

import { getPilotTriageFn } from "@/lib/pilot/pilot.functions";
import { TRIAGE_CLASSES, TRIAGE_CLASS_LABEL, TRIAGE_CLASS_TONE } from "@/lib/pilot/pilot.triage";
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
  const { findings, freeze } = report;

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
