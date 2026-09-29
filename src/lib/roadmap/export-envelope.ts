/**
 * Shared export envelope for roadmap / brief exports (FR-10 / FR-17).
 * Every export carries tenant, filters, versions, generated-at and confidentiality.
 */

export const CONFIDENTIALITY_MARKINGS = [
  "Internal",
  "Confidential",
  "Restricted",
] as const;
export type ConfidentialityMarking = (typeof CONFIDENTIALITY_MARKINGS)[number];

export type ExportEnvelope = {
  tenantName: string;
  workspaceId?: string | null;
  portfolioName?: string | null;
  filters: Record<string, string | null | undefined>;
  recordVersions: string[];
  scoringVersions: string[];
  generatedAt: string;
  confidentiality: ConfidentialityMarking;
  itemCount: number;
};

export function buildExportEnvelope(input: {
  tenantName?: string | null;
  workspaceId?: string | null;
  portfolioName?: string | null;
  filters?: Record<string, string | null | undefined>;
  recordVersions?: Array<string | null | undefined>;
  scoringVersions?: Array<string | null | undefined>;
  confidentiality?: ConfidentialityMarking;
  itemCount: number;
  now?: Date;
}): ExportEnvelope {
  const uniq = (values: Array<string | null | undefined>) =>
    [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];

  return {
    tenantName: input.tenantName?.trim() || "Workspace",
    workspaceId: input.workspaceId ?? null,
    portfolioName: input.portfolioName ?? null,
    filters: input.filters ?? {},
    recordVersions: uniq(input.recordVersions ?? []),
    scoringVersions: uniq(input.scoringVersions ?? []),
    generatedAt: (input.now ?? new Date()).toISOString(),
    confidentiality: input.confidentiality ?? "Internal",
    itemCount: input.itemCount,
  };
}

/** Comment / preamble lines suitable for CSV and SpreadsheetML. */
export function envelopeHeaderLines(env: ExportEnvelope): string[] {
  const filterText = Object.entries(env.filters)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return [
    `# Confidentiality: ${env.confidentiality}`,
    `# Tenant: ${env.tenantName}`,
    `# Portfolio: ${env.portfolioName ?? "—"}`,
    `# Filters: ${filterText || "none"}`,
    `# Record versions: ${env.recordVersions.join(", ") || "—"}`,
    `# Scoring versions: ${env.scoringVersions.join(", ") || "—"}`,
    `# Generated at: ${env.generatedAt}`,
    `# Item count: ${env.itemCount}`,
  ];
}
