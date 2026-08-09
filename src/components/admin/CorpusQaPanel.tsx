import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Download, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { runLaunchCorpusQa } from "@/lib/corpus-qa.functions";
import {
  importLogToCsv,
  qaReportToCsv,
  PROVENANCE_NAMES,
  QUALITY_NAMES,
  type ImportLogEntry,
  type QaReport,
  type QaResult,
} from "@/lib/admin/corpus-quality";
import { usePlatformAdmin } from "@/lib/admin/platform-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ResultList({
  title,
  tone,
  results,
}: {
  title: string;
  tone: "danger" | "success" | "muted";
  results: QaResult[];
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "success"
        ? "text-primary"
        : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${toneClass}`}>{title}</h4>
        <Badge variant="outline">{results.length}</Badge>
      </div>
      {results.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing in this bucket.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {results.slice(0, 25).map((r) => (
            <li key={r.id} className="text-xs">
              <span className="font-medium">{r.title}</span>{" "}
              <span className="text-muted-foreground">({r.slug})</span>
              <div className="text-muted-foreground">
                {PROVENANCE_NAMES[r.provenance] ?? r.provenance} ·{" "}
                {QUALITY_NAMES[r.quality_status] ?? r.quality_status}
                {r.issues.length > 0 && ` · ${r.issues.map((i) => i.code).join(", ")}`}
              </div>
            </li>
          ))}
          {results.length > 25 && (
            <li className="text-xs text-muted-foreground">
              +{results.length - 25} more — download the CSV for the full list.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Admin surface for re-running the launch-corpus quality gate and exporting an
 * auditable report + import log with provenance labels.
 */
export function CorpusQaPanel() {
  const { canPublishGlobal, loading } = usePlatformAdmin();
  const runQa = useServerFn(runLaunchCorpusQa);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<QaReport | null>(null);
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

  const run = async () => {
    setBusy(true);
    try {
      const payload = await runQa({});
      setReport(payload.report);
      setImportLog(payload.importLog);
      toast.success(
        `Quality gate re-run over ${payload.report.totals.records} records — ${payload.report.totals.passing} passing.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quality run failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!canPublishGlobal) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Launch-corpus QA is restricted to platform publishers.
        </CardContent>
      </Card>
    );
  }

  const stamp = report ? report.generatedAt.slice(0, 19).replace(/[:T]/g, "-") : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4" /> Launch-corpus QA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Re-executes the provenance and quality gate over every catalogue record and diffs the
          result against what is currently published. Nothing is mutated — this is a read-only
          audit.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Run launch-corpus QA
          </Button>
          <Button
            variant="outline"
            disabled={!report}
            onClick={() =>
              report &&
              download(
                `launch-corpus-quality-${stamp}.csv`,
                "text/csv",
                qaReportToCsv(report),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Quality report (CSV)
          </Button>
          <Button
            variant="outline"
            disabled={!report}
            onClick={() =>
              report &&
              download(
                `launch-corpus-quality-${stamp}.json`,
                "application/json",
                JSON.stringify({ report, importLog }, null, 2),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Full package (JSON)
          </Button>
          <Button
            variant="outline"
            disabled={!report || importLog.length === 0}
            onClick={() =>
              download(
                `launch-corpus-import-log-${stamp}.csv`,
                "text/csv",
                importLogToCsv(importLog),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Import log (CSV)
          </Button>
        </div>

        {report && (
          <>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Records", report.totals.records],
                ["Published", report.totals.published],
                ["Gate passing", report.totals.passing],
                ["Blockers", report.totals.blockers],
                ["Warnings", report.totals.warnings],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {label}
                  </div>
                  <div className="text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>

            {report.diff.publishedFailing.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {report.diff.publishedFailing.length} published record(s) no longer pass the gate.
                  Unpublish or fix them before launch.
                </span>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <ResultList
                title="Published but failing"
                tone="danger"
                results={report.diff.publishedFailing}
              />
              <ResultList
                title="Passing but not published"
                tone="success"
                results={report.diff.unpublishedPassing}
              />
              <ResultList
                title="Published and passing"
                tone="muted"
                results={report.diff.publishedPassing}
              />
              <ResultList
                title="Not published, still failing"
                tone="muted"
                results={report.diff.unpublishedFailing}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold">By provenance</h4>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {Object.entries(report.byProvenance).map(([k, v]) => (
                    <li key={k}>
                      {PROVENANCE_NAMES[k] ?? k}: {v}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold">By quality status</h4>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {Object.entries(report.byQualityStatus).map(([k, v]) => (
                    <li key={k}>
                      {QUALITY_NAMES[k] ?? k}: {v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
