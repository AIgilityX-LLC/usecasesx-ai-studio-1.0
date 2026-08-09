/**
 * Single-request handoff export — CSV and PDF.
 *
 * A handoff export is a governance artefact: it must show exactly what the
 * receiving side was given. Every file therefore carries the confirmed context
 * snapshot (the source references and their captured versions), the requested
 * output, and the consent/provenance record — never a re-interpretation of it.
 *
 * Access is enforced here, not only in the UI: the same workspace-role matrix
 * that governs report exports governs these files.
 */

import { assertCanExportReport, type ExportFormat } from "@/lib/reports/report-access";
import { toCsvCell } from "@/lib/reports/report-model";
import { exportDeliverablePDF, type ExportDoc } from "@/lib/deliverables.export";
import {
  HANDOFF_STATUS_META,
  HANDOFF_TARGET_META,
  SENSITIVITY_META,
  requestTypeLabel,
  sourceHasDrifted,
  type HandoffRequest,
} from "./handoff.model";

/* ------------------------------------------------------------------ naming */

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "handoff"
  );
}

export function handoffExportFileName(request: HandoffRequest, extension: "csv" | "pdf"): string {
  const day = new Date().toISOString().slice(0, 10);
  return `handoff-${slugify(request.title)}-${request.id.slice(0, 8)}-${day}.${extension}`;
}

/* --------------------------------------------------------------------- CSV */

/**
 * Stable CSV contract for a single handoff request. Column order never
 * changes; new columns are appended at the end.
 */
export const HANDOFF_CSV_COLUMNS = [
  { key: "request_id", label: "Request ID" },
  { key: "workspace_id", label: "Workspace ID" },
  { key: "target", label: "Target" },
  { key: "target_label", label: "Target name" },
  { key: "request_type", label: "Requested output" },
  { key: "request_type_label", label: "Requested output name" },
  { key: "status", label: "Status" },
  { key: "delivery_mode", label: "Delivery" },
  { key: "sensitivity", label: "Sensitivity" },
  { key: "title", label: "Title" },
  { key: "summary", label: "Summary" },
  { key: "requested_by", label: "Requested by" },
  { key: "owner_user_id", label: "Owner" },
  { key: "created_at", label: "Raised at" },
  { key: "dispatched_at", label: "Dispatched at" },
  { key: "completed_at", label: "Completed at" },
  { key: "status_note", label: "Status note" },
  { key: "source_fingerprint", label: "Source version" },
  { key: "source_captured_at", label: "Source captured at" },
  { key: "reference_count", label: "References" },
  { key: "references", label: "Reference list" },
  { key: "source_drift", label: "Source drift" },
  { key: "consent_confirmed", label: "Consent confirmed" },
  { key: "consent_confirmed_at", label: "Consent confirmed at" },
  { key: "consent_statement", label: "Consent statement" },
  { key: "consent_shared_context", label: "Consent shared context" },
] as const;

export type HandoffCsvKey = (typeof HANDOFF_CSV_COLUMNS)[number]["key"];

export function referenceLine(ref: {
  type: string;
  id: string;
  label: string;
  version: string | null;
  capturedAt: string;
}): string {
  return `${ref.label} (${ref.type}:${ref.id} @ ${ref.version ?? "unversioned"}, captured ${ref.capturedAt})`;
}

export function buildHandoffCsvRow(request: HandoffRequest): Record<HandoffCsvKey, string> {
  return {
    request_id: request.id,
    workspace_id: request.workspaceId,
    target: request.target,
    target_label: HANDOFF_TARGET_META[request.target].label,
    request_type: request.requestType,
    request_type_label: requestTypeLabel(request.target, request.requestType),
    status: request.status,
    delivery_mode: request.deliveryMode,
    sensitivity: request.sensitivity,
    title: request.title,
    summary: request.summary ?? "",
    requested_by: request.requestedBy,
    owner_user_id: request.ownerUserId ?? "",
    created_at: request.createdAt,
    dispatched_at: request.dispatchedAt ?? "",
    completed_at: request.completedAt ?? "",
    status_note: request.statusNote ?? "",
    source_fingerprint: request.sourceVersion?.fingerprint ?? "",
    source_captured_at: request.sourceVersion?.capturedAt ?? "",
    reference_count: String(request.sourceRefs.length),
    references: request.sourceRefs.map(referenceLine).join(" | "),
    source_drift: sourceHasDrifted(request.sourceVersion, request.sourceRefs) ? "yes" : "no",
    consent_confirmed: request.consent?.confirmed ? "yes" : "no",
    consent_confirmed_at: request.consent?.confirmedAt ?? "",
    consent_statement: request.consent?.statement ?? "",
    consent_shared_context: (request.consent?.sharedContext ?? []).join(" | "),
  };
}

export function buildHandoffCsv(request: HandoffRequest): string {
  const row = buildHandoffCsvRow(request);
  const header = HANDOFF_CSV_COLUMNS.map((column) => toCsvCell(column.label)).join(",");
  const values = HANDOFF_CSV_COLUMNS.map((column) => toCsvCell(row[column.key])).join(",");
  return `${header}\r\n${values}\r\n`;
}

/* --------------------------------------------------------------------- PDF */

export function buildHandoffExportDoc(request: HandoffRequest): ExportDoc {
  const meta = HANDOFF_TARGET_META[request.target];
  const sensitivity = SENSITIVITY_META[request.sensitivity];
  const drifted = sourceHasDrifted(request.sourceVersion, request.sourceRefs);
  const payloadRows = Object.entries(request.payload ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [
      key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      Array.isArray(value) ? value.join(", ") : String(value),
    ]);

  return {
    title: request.title,
    subtitle: `${meta.label} · ${requestTypeLabel(request.target, request.requestType)} · ${HANDOFF_STATUS_META[request.status].label}`,
    sections: [
      {
        heading: "Request",
        kind: "table",
        columns: ["Field", "Value"],
        rows: [
          ["Request ID", request.id],
          ["Target", meta.label],
          ["Requested output", requestTypeLabel(request.target, request.requestType)],
          ["Status", HANDOFF_STATUS_META[request.status].label],
          [
            "Delivery",
            request.deliveryMode === "endpoint"
              ? "Sent to a connected service"
              : "Queued for a person to pick up",
          ],
          ["Sensitivity", sensitivity.label],
          ["Raised at", request.createdAt],
          ["Dispatched at", request.dispatchedAt ?? "—"],
          ["Completed at", request.completedAt ?? "—"],
          ["Status note", request.statusNote ?? "—"],
        ],
      },
      {
        heading: "Summary",
        kind: "text",
        body: request.summary?.trim() || "No summary was provided with this request.",
      },
      {
        heading: "Confirmed context snapshot",
        kind: "table",
        columns: ["Reference", "Type", "Version", "Captured at"],
        rows:
          request.sourceRefs.length > 0
            ? request.sourceRefs.map((ref) => [
                ref.label,
                `${ref.type}:${ref.id}`,
                ref.version ?? "unversioned",
                ref.capturedAt,
              ])
            : [["No records were referenced", "—", "—", "—"]],
      },
      {
        heading: "Requested output detail",
        kind: "table",
        columns: ["Field", "Value"],
        rows: payloadRows.length > 0 ? payloadRows : [["—", "No additional detail was captured."]],
      },
      {
        heading: "Consent and provenance",
        kind: "table",
        columns: ["Field", "Value"],
        rows: [
          ["Consent confirmed", request.consent?.confirmed ? "Yes" : "No"],
          ["Confirmed at", request.consent?.confirmedAt ?? "—"],
          ["Statement", request.consent?.statement ?? "—"],
          ["Shared context", (request.consent?.sharedContext ?? []).join("; ") || "—"],
          ["Source version", request.sourceVersion?.fingerprint ?? "not captured"],
          ["Source captured at", request.sourceVersion?.capturedAt ?? "—"],
          [
            "Source drift",
            drifted
              ? "Yes — the referenced records changed after this request was raised"
              : "No change detected",
          ],
        ],
      },
    ],
  };
}

/* ---------------------------------------------------------------- download */

function downloadText(filename: string, mime: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadHandoffCsv(
  request: HandoffRequest,
  role: string | null | undefined,
): string {
  assertCanExportReport(role, "csv" satisfies ExportFormat);
  const filename = handoffExportFileName(request, "csv");
  downloadText(filename, "text/csv", buildHandoffCsv(request));
  return filename;
}

export function downloadHandoffPdf(
  request: HandoffRequest,
  role: string | null | undefined,
): string {
  assertCanExportReport(role, "pdf" satisfies ExportFormat);
  const filename = handoffExportFileName(request, "pdf");
  exportDeliverablePDF(buildHandoffExportDoc(request), filename);
  return filename;
}
