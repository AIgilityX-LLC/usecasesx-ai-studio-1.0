/**
 * Production data audit model (pure).
 *
 * Answers one question for the 14 August launch: does production contain only
 * the records we intend to be public, with private, pilot and demo data
 * isolated from it? The shape is deliberately evidence-first — every check
 * carries what was observed, and an area with no measurement reports
 * "unknown" rather than "pass". Nothing here reads the database; the server
 * probe supplies observations.
 *
 * Nothing in this module deletes or rewrites data. Remediation is an explicit,
 * audited admin action, so an uncertain record is always reviewed first.
 */

import { SITE_URL } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/feedback/feedback.model";
import { FOUNDING_ACCESS_END, LAUNCH_DATE } from "@/lib/founding-access";
import { RELEASE_IDENTITY } from "@/lib/ops/production-config";

export type DataStatus = "pass" | "attention" | "fail" | "unknown";

export const DATA_AREAS = [
  "admin_access",
  "public_content",
  "demo_isolation",
  "private_records",
  "edition_config",
  "destinations",
] as const;

export type DataArea = (typeof DATA_AREAS)[number];

export const DATA_AREA_LABEL: Record<DataArea, string> = {
  admin_access: "Platform admin accounts",
  public_content: "Intended public content and taxonomy",
  demo_isolation: "Demo labelling and isolation",
  private_records: "Private, pilot and unpublished records",
  edition_config: "Edition configuration, limits and Founding end date",
  destinations: "Legal, help and contact destinations",
};

export type DataCheck = {
  id: string;
  area: DataArea;
  label: string;
  status: DataStatus;
  /** What was actually observed. Never contains a secret value. */
  observed: string;
  /** What to do when the status is not a pass. Review before deleting. */
  action?: string;
};

/** How a role grant is classified for review. Never used to grant anything. */
export type PrincipalKind = "named" | "demo" | "unnamed";

export type AdminGrantRow = {
  userId: string;
  role: string;
  displayName: string | null;
  email: string | null;
  kind: PrincipalKind;
  createdAt: string | null;
};

export type PublicInventoryRow = {
  id: string;
  label: string;
  count: number;
  /** What the count is expected to contain, in plain language. */
  expectation: string;
};

/** One anonymous read attempt against a table that must not be public. */
export type AnonymousProbeRow = {
  table: string;
  /** "sealed" = denied or empty for anonymous callers. */
  outcome: "sealed" | "readable";
  rows: number;
  detail: string;
};

export type SignOffRecord = {
  at: string;
  by: string;
  verdict: "approved" | "rejected";
  note: string;
};

export type ProductionDataReport = {
  generatedAt: string;
  actor: string;
  observedHost: string;
  release: typeof RELEASE_IDENTITY;
  checks: readonly DataCheck[];
  admins: readonly AdminGrantRow[];
  inventory: readonly PublicInventoryRow[];
  anonymousProbes: readonly AnonymousProbeRow[];
  signOffs: readonly SignOffRecord[];
};

/* -------------------------------------------------------------- principals */

const DEMO_NAME = /\b(demo|test|sample|qa|dummy|placeholder|fixture|seed)\b/i;
const DEMO_DOMAIN = /@(demo\.usecasex\.app|example\.(com|org|net)|test\.local)$/i;

/**
 * Classifies a role holder for review. A grant is only ever flagged here —
 * revoking it stays a deliberate admin action with an audit trail.
 */
export function classifyPrincipal(
  displayName: string | null | undefined,
  email: string | null | undefined,
): PrincipalKind {
  const name = displayName?.trim() ?? "";
  const mail = email?.trim() ?? "";
  if (DEMO_NAME.test(name) || DEMO_NAME.test(mail) || DEMO_DOMAIN.test(mail)) return "demo";
  if (name.length === 0 && mail.length === 0) return "unnamed";
  return "named";
}

/** Grants that must be revoked or renamed before launch. */
export function grantsNeedingReview(admins: readonly AdminGrantRow[]): readonly AdminGrantRow[] {
  return admins.filter((row) => row.kind !== "named");
}

/* ----------------------------------------------------------------- verdicts */

export type DataVerdict = "clean" | "conditional" | "blocked";

export function dataVerdict(checks: readonly DataCheck[]): DataVerdict {
  if (checks.some((c) => c.status === "fail")) return "blocked";
  if (checks.some((c) => c.status === "attention" || c.status === "unknown")) return "conditional";
  return "clean";
}

export function countDataStatus(checks: readonly DataCheck[]): Record<DataStatus, number> {
  const out: Record<DataStatus, number> = { pass: 0, attention: 0, fail: 0, unknown: 0 };
  for (const check of checks) out[check.status] += 1;
  return out;
}

export function checksForArea(checks: readonly DataCheck[], area: DataArea): readonly DataCheck[] {
  return checks.filter((check) => check.area === area);
}

/** A sign-off is only meaningful while no check is failing. */
export function canSignOff(checks: readonly DataCheck[]): boolean {
  return !checks.some((check) => check.status === "fail");
}

export function latestSignOff(signOffs: readonly SignOffRecord[]): SignOffRecord | null {
  return [...signOffs].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0] ?? null;
}

/* ---------------------------------------------------------------- contracts */

/** Configuration that the checklist asserts, so a doc drift shows up as a diff. */
export const EDITION_CONTRACT = Object.freeze({
  launchDate: LAUNCH_DATE,
  foundingAccessEnd: FOUNDING_ACCESS_END,
  canonicalOrigin: SITE_URL,
  supportEmail: SUPPORT_EMAIL,
});

/* ---------------------------------------------------------------- artifacts */

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function productionDataCsv(report: ProductionDataReport): string {
  const rows: string[][] = [["Area", "Check", "Status", "Observed", "Action"]];
  for (const check of report.checks) {
    rows.push([
      DATA_AREA_LABEL[check.area],
      check.label,
      check.status,
      check.observed,
      check.action ?? "",
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildProductionDataChecklist(report: ProductionDataReport): string {
  const counts = countDataStatus(report.checks);
  const verdict = dataVerdict(report.checks);
  const signOff = latestSignOff(report.signOffs);
  const lines: string[] = [
    `# Production data checklist — ${report.release.version}`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Generated by: ${report.actor}`,
    `- Observed host: ${report.observedHost}`,
    `- Release marker: ${report.release.marker} (target ${report.release.targetDate})`,
    `- Verdict: **${verdict.toUpperCase()}** — ${counts.pass} pass · ${counts.attention} attention · ${counts.fail} fail · ${counts.unknown} not measured`,
    `- Sign-off: ${
      signOff
        ? `${signOff.verdict} by ${signOff.by} at ${signOff.at}${signOff.note ? ` — ${signOff.note}` : ""}`
        : "not signed off"
    }`,
    "",
    "No record is deleted on the strength of this report. Anything flagged is reviewed by a named owner first.",
    "",
  ];

  for (const area of DATA_AREAS) {
    const checks = checksForArea(report.checks, area);
    if (checks.length === 0) continue;
    lines.push(`## ${DATA_AREA_LABEL[area]}`, "");
    lines.push("| Check | Status | Observed | Action |", "| --- | --- | --- | --- |");
    for (const check of checks) {
      lines.push(
        `| ${check.label} | ${check.status} | ${check.observed} | ${check.action ?? "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Platform admin review",
    "",
    "| Role | Holder | Classification | Granted |",
    "| --- | --- | --- | --- |",
  );
  for (const row of report.admins) {
    lines.push(
      `| ${row.role} | ${row.displayName ?? row.email ?? row.userId} | ${row.kind} | ${row.createdAt ?? "unknown"} |`,
    );
  }

  lines.push(
    "",
    "## Intended public content",
    "",
    "| Record set | Count | Expectation |",
    "| --- | --- | --- |",
  );
  for (const row of report.inventory) {
    lines.push(`| ${row.label} | ${row.count} | ${row.expectation} |`);
  }

  lines.push(
    "",
    "## Anonymous read attempts against private tables",
    "",
    "| Table | Outcome | Rows | Detail |",
    "| --- | --- | --- | --- |",
  );
  for (const probe of report.anonymousProbes) {
    lines.push(`| ${probe.table} | ${probe.outcome} | ${probe.rows} | ${probe.detail} |`);
  }

  lines.push(
    "",
    "## Configuration sign-off",
    "",
    `- Launch date: ${EDITION_CONTRACT.launchDate}`,
    `- Pro Founding Access complimentary through: ${EDITION_CONTRACT.foundingAccessEnd}`,
    `- Canonical origin: ${EDITION_CONTRACT.canonicalOrigin}`,
    `- Support destination: ${EDITION_CONTRACT.supportEmail}`,
    "",
  );
  return lines.join("\n");
}
