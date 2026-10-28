/**
 * Pure export serializers for authorized audit reads.
 * Never includes application debug log streams.
 */

import type { AuditEvent, AuditExportFormat } from "./types";

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function jsonSnippet(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

const CSV_HEADERS = [
  "id",
  "tenant_id",
  "workspace_id",
  "actor_id",
  "actor_type",
  "event_type",
  "resource_type",
  "resource_id",
  "timestamp",
  "request_id",
  "session_id",
  "result",
  "severity",
  "source",
  "context",
  "before_state",
  "after_state",
  "metadata",
] as const;

/** Serialize audit events for download by tenant admins / auditors. */
export function serializeAuditExport(
  events: AuditEvent[],
  format: AuditExportFormat,
): { body: string; contentType: string; filename: string } {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    return {
      body: JSON.stringify(
        { exportedAt: new Date().toISOString(), count: events.length, events },
        null,
        2,
      ),
      contentType: "application/json; charset=utf-8",
      filename: `usecasesx-audit-${stamp}.json`,
    };
  }

  const rows = events.map((e) =>
    [
      e.id,
      e.tenant_id,
      e.workspace_id,
      e.actor_id,
      e.actor_type,
      e.event_type,
      e.resource_type,
      e.resource_id,
      e.timestamp,
      e.request_id,
      e.session_id,
      e.result,
      e.severity,
      e.source,
      jsonSnippet(e.context),
      jsonSnippet(e.before_state),
      jsonSnippet(e.after_state),
      jsonSnippet(e.metadata),
    ]
      .map(csvCell)
      .join(","),
  );

  return {
    body: [CSV_HEADERS.join(","), ...rows].join("\n"),
    contentType: "text/csv; charset=utf-8",
    filename: `usecasesx-audit-${stamp}.csv`,
  };
}
