/**
 * Single-request handoff export.
 *
 * A handoff leaves the product as a file only through this dialog, so the file
 * and the audit record are produced together. The receipt below the buttons
 * names the exact `audit_events` row that was appended, the provenance the
 * file carries, and the role that was allowed (or refused) the export.
 */

import { useState } from "react";
import { Check, Download, FileText, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canExportReport, ReportExportDeniedError } from "@/lib/reports/report-access";
import { recordHandoffExport } from "@/lib/domain/handoffs.repository";
import {
  downloadHandoffCsv,
  downloadHandoffPdf,
  referenceLine,
} from "@/lib/handoffs/handoff.export";
import {
  HANDOFF_STATUS_META,
  HANDOFF_TARGET_META,
  requestTypeLabel,
  sourceHasDrifted,
  type HandoffRequest,
} from "@/lib/handoffs/handoff.model";

type Receipt = {
  format: "pdf" | "csv";
  auditEventId: string | null;
  requestId: string;
  recordedAt: string | null;
  fileName: string | null;
  outcome: "completed" | "denied";
  deniedReason: string | null;
  role: string | null;
  provenance: string[];
};

/** The provenance lines that go into both the file and the audit record. */
export function handoffProvenanceLines(request: HandoffRequest): string[] {
  const lines = [
    `Target — ${HANDOFF_TARGET_META[request.target].label}`,
    `Requested output — ${requestTypeLabel(request.target, request.requestType)}`,
    `Status — ${HANDOFF_STATUS_META[request.status].label}`,
    `Source version — ${request.sourceVersion?.fingerprint ?? "not captured"}`,
    `Consent — ${request.consent?.confirmed ? `confirmed ${request.consent.confirmedAt ?? ""}`.trim() : "not required or not confirmed"}`,
  ];
  for (const ref of request.sourceRefs) lines.push(`Reference — ${referenceLine(ref)}`);
  if (sourceHasDrifted(request.sourceVersion, request.sourceRefs))
    lines.push("Warning — referenced records changed after this request was raised");
  return lines;
}

export function HandoffExportDialog({
  request,
  workspaceRole,
  open,
  onOpenChange,
}: {
  request: HandoffRequest;
  workspaceRole: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(format: "pdf" | "csv") {
    setBusy(true);
    const provenance = handoffProvenanceLines(request);
    let fileName: string | null = null;
    let deniedReason: string | null = null;
    try {
      fileName =
        format === "csv"
          ? downloadHandoffCsv(request, workspaceRole)
          : downloadHandoffPdf(request, workspaceRole);
    } catch (error) {
      deniedReason =
        error instanceof ReportExportDeniedError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The export could not be produced.";
    }
    const outcome: "completed" | "denied" = deniedReason ? "denied" : "completed";
    const audit = await recordHandoffExport({
      request,
      format,
      fileName,
      outcome,
      deniedReason,
      workspaceRole,
      provenance,
    });
    setReceipt({
      format,
      auditEventId: audit.auditEventId,
      requestId: audit.requestId,
      recordedAt: audit.recordedAt,
      fileName,
      outcome,
      deniedReason,
      role: workspaceRole,
      provenance,
    });
    setBusy(false);
  }

  const csvDecision = canExportReport(workspaceRole, "csv");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export this request</DialogTitle>
          <DialogDescription>
            The file carries the confirmed context snapshot, the requested output, and the consent
            and provenance record. Producing it appends an audit row.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run("pdf")} disabled={busy} data-testid="handoff-export-pdf">
            <FileText className="mr-2 h-4 w-4" aria-hidden />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => void run("csv")}
            disabled={busy}
            data-testid="handoff-export-csv"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        </div>
        {!csvDecision.allowed && (
          <p className="text-xs text-muted-foreground" data-testid="handoff-csv-restriction">
            {csvDecision.reason}
          </p>
        )}

        {receipt && (
          <div
            className="space-y-3 rounded-lg border border-dashed p-4"
            data-testid="handoff-export-receipt"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              {receipt.outcome === "denied" ? (
                <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
              ) : (
                <Check className="h-4 w-4 text-primary" aria-hidden />
              )}
              Export receipt
              <Badge variant={receipt.outcome === "denied" ? "destructive" : "secondary"}>
                {receipt.outcome === "denied" ? "Denied" : "Recorded"}
              </Badge>
            </p>
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <Row label="Format" value={receipt.format.toUpperCase()} testId="receipt-format" />
              <Row label="File" value={receipt.fileName ?? "—"} testId="receipt-file" />
              <Row
                label="Audit event"
                value={receipt.auditEventId ?? "not recorded"}
                testId="receipt-audit-id"
                mono
              />
              <Row label="Request ID" value={receipt.requestId} testId="receipt-request-id" mono />
              <Row
                label="Recorded"
                value={receipt.recordedAt ? new Date(receipt.recordedAt).toLocaleString() : "—"}
                testId="receipt-recorded-at"
              />
              <Row label="Your role" value={receipt.role ?? "no membership"} testId="receipt-role" />
            </dl>
            {receipt.deniedReason && (
              <p className="text-sm text-destructive" data-testid="receipt-denied-reason">
                {receipt.deniedReason}
              </p>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Provenance
              </p>
              <ul className="mt-1 space-y-0.5 text-sm" data-testid="receipt-provenance">
                {receipt.provenance.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  testId,
  mono = false,
}: {
  label: string;
  value: string;
  testId: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "text-sm"} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
