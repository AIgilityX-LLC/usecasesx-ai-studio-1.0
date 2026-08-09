/**
 * Export receipt.
 *
 * Every export writes an append-only `audit_events` row. The receipt shows the
 * identifier of that exact row plus the provenance behind the figures in the
 * file, so a recipient can trace a spreadsheet or PDF back to the governance
 * record that authorised it. Nothing here is decorative: the values shown are
 * the values written.
 */

import { Check, FileWarning, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProvenanceSummary } from "@/lib/reports/report-model";
import { EXPORT_FORMAT_LABELS, type ExportFormat } from "@/lib/reports/report-access";

export type ExportReceiptData = {
  format: ExportFormat;
  /** Primary key of the appended audit_events row; null when the append failed. */
  auditEventId: string | null;
  /** Correlation id sent with the audit record. */
  requestId: string;
  recordedAt: string | null;
  fileName: string | null;
  outcome: "completed" | "denied";
  deniedReason: string | null;
  workspaceRole: string | null;
  provenance: ProvenanceSummary;
};

export function ExportReceipt({ receipt }: { receipt: ExportReceiptData }) {
  const denied = receipt.outcome === "denied";
  return (
    <Card className="no-print border-dashed" data-testid="export-receipt">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {denied ? (
            <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
          ) : (
            <Check className="h-4 w-4 text-primary" aria-hidden />
          )}
          Export receipt
          <Badge variant={denied ? "destructive" : "secondary"}>
            {denied ? "Denied" : "Recorded"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <Row
            label="Format"
            value={EXPORT_FORMAT_LABELS[receipt.format]}
            testId="receipt-format"
          />
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
          <Row
            label="Your role"
            value={receipt.workspaceRole ?? "no membership"}
            testId="receipt-role"
          />
        </dl>

        {denied && receipt.deniedReason && (
          <p className="text-sm text-destructive" data-testid="receipt-denied-reason">
            {receipt.deniedReason}
          </p>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Provenance
          </p>
          {receipt.provenance.lines.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-sm" data-testid="receipt-provenance">
              {receipt.provenance.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No records back this selection.</p>
          )}
        </div>

        {receipt.provenance.gaps.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileWarning className="h-3.5 w-3.5" aria-hidden /> Gaps carried into this export
            </p>
            <ul
              className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground"
              data-testid="receipt-gaps"
            >
              {receipt.provenance.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
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
