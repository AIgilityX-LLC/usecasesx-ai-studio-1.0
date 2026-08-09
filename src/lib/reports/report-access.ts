/**
 * Report export access model.
 *
 * Exports leave the product as files, so who may produce them is a governance
 * decision rather than a UI preference. The rules live here as pure functions
 * so the UI gate, the download helpers and the integration tests all read the
 * same matrix.
 *
 * Roles are the workspace membership roles returned by the workspace context
 * (`workspaceRole`). A user with no workspace membership is not a permitted
 * actor for any export.
 */

export const EXPORT_ROLES = ["owner", "admin", "contributor", "facilitator", "viewer"] as const;
export type ExportRole = (typeof EXPORT_ROLES)[number];

/** The export surfaces a report can produce. */
export const EXPORT_FORMATS = ["pdf", "csv", "csv_benefits"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "Print / PDF",
  csv: "Use case CSV",
  csv_benefits: "Benefits CSV",
};

/**
 * Permission matrix.
 *
 *  • Print/PDF renders exactly what the user may already read on screen, so
 *    every workspace member including viewers may produce it.
 *  • CSV is a raw data extract of scores, decisions and value records, so it is
 *    limited to roles that own or contribute to those records.
 */
const EXPORT_MATRIX: Record<ExportFormat, readonly ExportRole[]> = {
  pdf: ["owner", "admin", "contributor", "facilitator", "viewer"],
  csv: ["owner", "admin", "contributor", "facilitator"],
  csv_benefits: ["owner", "admin", "contributor", "facilitator"],
};

export type ExportDecision = { allowed: true } | { allowed: false; reason: string };

export function isExportRole(role: string | null | undefined): role is ExportRole {
  return typeof role === "string" && (EXPORT_ROLES as readonly string[]).includes(role);
}

/** Single source of truth for "may this actor export in this format?". */
export function canExportReport(
  role: string | null | undefined,
  format: ExportFormat,
): ExportDecision {
  if (!isExportRole(role)) {
    return {
      allowed: false,
      reason:
        "Access denied: you are not a member of this workspace, so you cannot export its reports.",
    };
  }
  if (!EXPORT_MATRIX[format].includes(role)) {
    return {
      allowed: false,
      reason: `Access denied: the ${role} role cannot generate the ${EXPORT_FORMAT_LABELS[format]} export. Ask a workspace owner or admin.`,
    };
  }
  return { allowed: true };
}

/** Thrown by the export helpers when an unauthorized actor calls them. */
export class ReportExportDeniedError extends Error {
  readonly code = "export_access_denied";
  readonly format: ExportFormat;
  readonly role: string | null;

  constructor(format: ExportFormat, role: string | null | undefined, reason: string) {
    super(reason);
    this.name = "ReportExportDeniedError";
    this.format = format;
    this.role = role ?? null;
  }
}

/** Throwing variant used at the call site of every download/print helper. */
export function assertCanExportReport(
  role: string | null | undefined,
  format: ExportFormat,
): void {
  const decision = canExportReport(role, format);
  if (!decision.allowed) throw new ReportExportDeniedError(format, role, decision.reason);
}
