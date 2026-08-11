/**
 * Signed-in preview test harness (pure).
 *
 * Declares the P0/P1 checks that can only be answered as a real signed-in
 * user — identity, entitlement resolution, row-level scoping and tenant
 * isolation — and renders the run as an evidence artifact. The probes live in
 * `harness.server.ts`; nothing here touches a client or a secret.
 */

export const CHECK_SEVERITIES = ["p0", "p1"] as const;
export type CheckSeverity = (typeof CHECK_SEVERITIES)[number];

export const CHECK_STATUSES = ["pass", "fail", "skipped", "error"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export type HarnessCheck = {
  id: string;
  title: string;
  severity: CheckSeverity;
  area: string;
  /** What a pass means, in plain language. */
  expectation: string;
};

export type CheckResult = HarnessCheck & {
  status: CheckStatus;
  /** What the probe actually observed. Never a guess. */
  observed: string;
  durationMs: number;
};

/** The checks the harness runs, in execution order. */
export const LAUNCH_CHECKS: readonly HarnessCheck[] = [
  {
    id: "session.identity",
    title: "Session identity resolves server-side",
    severity: "p0",
    area: "Access",
    expectation: "The bearer token resolves to the same user the request claims to be.",
  },
  {
    id: "profile.exists",
    title: "Signed-in user has a profile row",
    severity: "p0",
    area: "Access",
    expectation: "Onboarding created exactly one profile for this account.",
  },
  {
    id: "entitlement.resolves",
    title: "Entitlement check answers",
    severity: "p0",
    area: "Entitlements",
    expectation: "Plan resolution returns a definite answer instead of failing open.",
  },
  {
    id: "roles.own_scope",
    title: "Role rows are scoped to the caller",
    severity: "p0",
    area: "Access",
    expectation: "Reading roles returns only this user's role rows.",
  },
  {
    id: "repository.published_read",
    title: "Published repository is readable",
    severity: "p0",
    area: "Repository",
    expectation: "The signed-in user can read published use cases.",
  },
  {
    id: "repository.unpublished_hidden",
    title: "Unpublished use cases stay hidden from non-admins",
    severity: "p0",
    area: "Repository",
    expectation: "A non-admin read returns no draft or unpublished rows.",
  },
  {
    id: "submissions.own_scope",
    title: "Submissions list is own-user only",
    severity: "p0",
    area: "Submissions",
    expectation: "Every submission returned belongs to the caller.",
  },
  {
    id: "saved.own_scope",
    title: "Saved items are own-user only",
    severity: "p1",
    area: "Repository",
    expectation: "Every saved row returned belongs to the caller.",
  },
  {
    id: "workspace.membership",
    title: "Caller resolves to at least one workspace",
    severity: "p0",
    area: "Tenancy",
    expectation: "Workspace-scoped surfaces have a tenant to work in.",
  },
  {
    id: "tenancy.cross_workspace_denied",
    title: "Portfolios outside the caller's workspaces are invisible",
    severity: "p0",
    area: "Tenancy",
    expectation: "A deliberate cross-tenant read returns zero rows.",
  },
  {
    id: "telemetry.own_scope",
    title: "AI usage rows are own-user only",
    severity: "p1",
    area: "Observability",
    expectation: "AI usage reads never expose another user's activity.",
  },
  {
    id: "rls.spoofed_insert_denied",
    title: "Insert with a spoofed owner is rejected",
    severity: "p0",
    area: "Access",
    expectation: "A verdict snapshot claiming another approver is refused by the database.",
  },
  {
    id: "admin.surface_gated",
    title: "Admin-only configuration is gated",
    severity: "p1",
    area: "Access",
    expectation: "Platform admins can read pilot settings; everyone else cannot.",
  },
];

export type HarnessSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  p0Failures: number;
  p1Failures: number;
  /** "pass" only when no check failed or errored. */
  verdict: "pass" | "attention" | "fail";
};

export function summarizeResults(results: readonly CheckResult[]): HarnessSummary {
  const failed = results.filter((r) => r.status === "fail");
  const errored = results.filter((r) => r.status === "error");
  const p0Failures = [...failed, ...errored].filter((r) => r.severity === "p0").length;
  const p1Failures = [...failed, ...errored].filter((r) => r.severity === "p1").length;
  return {
    total: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: failed.length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errored: errored.length,
    p0Failures,
    p1Failures,
    verdict: p0Failures > 0 ? "fail" : p1Failures > 0 ? "attention" : "pass",
  };
}

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function harnessResultsToCsv(results: readonly CheckResult[]): string {
  const header = ["Check", "Severity", "Area", "Status", "Expectation", "Observed", "Duration ms"];
  const body = results.map((result) => [
    result.id,
    result.severity.toUpperCase(),
    result.area,
    result.status,
    result.expectation,
    result.observed,
    result.durationMs,
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Evidence artifact for the release record. */
export function buildHarnessMarkdown(run: {
  runAt: string;
  actor: string;
  isAdmin: boolean;
  results: readonly CheckResult[];
}): string {
  const summary = summarizeResults(run.results);
  const lines: string[] = [
    `# Signed-in launch checks`,
    ``,
    `Run ${run.runAt} as ${run.actor}${run.isAdmin ? " (platform admin)" : ""}`,
    ``,
    `**Verdict: ${summary.verdict.toUpperCase()}** — ${summary.passed}/${summary.total} passed · ` +
      `${summary.failed} failed · ${summary.errored} errored · ${summary.skipped} skipped`,
    ``,
    `- P0 failures: ${summary.p0Failures}`,
    `- P1 failures: ${summary.p1Failures}`,
    ``,
    `| Check | Severity | Status | Observed |`,
    `| --- | --- | --- | --- |`,
    ...run.results.map(
      (result) =>
        `| ${result.id} | ${result.severity.toUpperCase()} | ${result.status} | ${result.observed.replace(
          /\|/g,
          "\\|",
        )} |`,
    ),
    ``,
  ];
  return lines.join("\n");
}
