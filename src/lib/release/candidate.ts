/**
 * Release candidate declaration (pure data).
 *
 * Mirrors the frozen record in `docs/release/*` so the admin console can show
 * the candidate without reading the filesystem. `bun run verify:release`
 * remains the enforcement point; this module is the read model.
 */

export type VerificationStep = {
  id: string;
  label: string;
  command: string;
  /** Result recorded when the candidate was frozen. */
  result: "pass" | "not_run";
  detail: string;
};

export type ManifestEntry = {
  order: number;
  file: string;
  purpose: string;
  kind: string;
};

export type KnownIssueScope = {
  id: number;
  issue: string;
  impact: "High" | "Medium" | "Low";
  classification: string;
  mitigation: string;
};

export const CHANGE_CONTROL: readonly string[] = [
  "P0 defect fixes only — a fix must reference an observed failure.",
  "Approved launch copy and content changes.",
  "Configuration and documentation updates.",
  "New feature work, schema drops/renames and RLS relaxations are out of scope.",
];

export const VERIFICATION_STEPS: readonly VerificationStep[] = [
  {
    id: "release",
    label: "Candidate integrity",
    command: "bun run verify:release",
    result: "pass",
    detail: "Migrations ordered, additive, seed-free and matching the manifest.",
  },
  {
    id: "routes",
    label: "Route tree",
    command: "bun run verify:routes",
    result: "pass",
    detail: "Generated route tree matches the route files on disk.",
  },
  {
    id: "nav",
    label: "Navigation integrity",
    command: "bun run check:nav-integrity",
    result: "pass",
    detail: "No navigation entry points at a route that does not exist.",
  },
  {
    id: "lint",
    label: "Lint",
    command: "bun run lint",
    result: "pass",
    detail: "ESLint clean across the repository.",
  },
  {
    id: "types",
    label: "Typecheck",
    command: "tsgo",
    result: "pass",
    detail: "TypeScript strict mode, no errors.",
  },
  {
    id: "unit",
    label: "Unit and contract suites",
    command: "bun run test:unit",
    result: "pass",
    detail: "Domain, entitlement, scoring, pilot and report contracts.",
  },
  {
    id: "build",
    label: "Production build",
    command: "bun run build",
    result: "pass",
    detail: "Workers SSR bundle produced from the frozen source.",
  },
  {
    id: "browser",
    label: "Browser P0 suite",
    command: "bun run test:e2e",
    result: "not_run",
    detail: "Runs in CI (launch-readiness workflow); browsers are absent in the build sandbox.",
  },
];

export const MIGRATION_MANIFEST: readonly ManifestEntry[] = [
  {
    order: 1,
    file: "20260811021640_b971d59c-f321-40af-bc27-e677da862a13.sql",
    purpose: "publish_use_case_submission() SECURITY DEFINER publish routine (admin-gated)",
    kind: "Function",
  },
  {
    order: 2,
    file: "20260811024402_6310c076-8e2b-4e0f-9dbb-3841610be68e.sql",
    purpose: "Revoke API-role EXECUTE on internal trigger routines",
    kind: "Hardening",
  },
  {
    order: 3,
    file: "20260811024451_aa5c18d7-c0b2-47c5-a563-e8e64dc90a38.sql",
    purpose: "Continue routine-privilege hardening sweep",
    kind: "Hardening",
  },
  {
    order: 4,
    file: "20260811024641_93bf03cf-233d-4868-a92e-ba3ea9bb9795.sql",
    purpose: "Public read policy + anon GRANT for publicly visible use-case feedback",
    kind: "Policy + grant",
  },
  {
    order: 5,
    file: "20260811033915_d2e22d78-8744-47ee-a4c6-b5d958443a61.sql",
    purpose: "Indexes for highest-traffic list reads",
    kind: "Index",
  },
  {
    order: 6,
    file: "20260811041900_37cd5a61-cf51-4f74-a054-5847ba39a38a.sql",
    purpose: "product_feedback triage columns (assignment, priority, SLA)",
    kind: "Additive columns",
  },
  {
    order: 7,
    file: "20260811041936_9561752f-ad9b-48aa-af1f-979569753437.sql",
    purpose: "v_feedback_queue set to security_invoker",
    kind: "Hardening",
  },
  {
    order: 8,
    file: "20260811043346_b61bc27d-656a-418c-a4bc-883d2040dda7.sql",
    purpose: "Pilot programme: invitations, checkpoints, settings singleton",
    kind: "Tables + RLS",
  },
  {
    order: 9,
    file: "20260811044550_485781c3-11f2-439e-9e43-8b746c61e000.sql",
    purpose: "pilot_audit_events append-only audit trail",
    kind: "Tables + RLS",
  },
  {
    order: 10,
    file: "20260811054329_9790a17c-ab86-4fb8-9ba9-77eef3234f8a.sql",
    purpose: "Data rights: export and deletion requests, consent records",
    kind: "Tables + RLS",
  },
  {
    order: 11,
    file: "20260811060031_237356d1-be44-4312-902c-21763004184e.sql",
    purpose: "Workshop item author-edit policy tightened",
    kind: "Policy",
  },
  {
    order: 12,
    file: "20260811060653_4c7e53cb-d762-4dea-bf25-76b37f438f61.sql",
    purpose: "pilot_rc_waivers waiver governance + launch check runs ledger",
    kind: "Tables + RLS",
  },
  {
    order: 13,
    file: "20260811062851_aaff588a-071a-418f-b704-e45908d0adc6.sql",
    purpose: "Sovereign Public Value Canvas™ storage",
    kind: "Tables + RLS",
  },
  {
    order: 14,
    file: "20260811070036_e855aa33-0e99-40ac-9942-3e5a35acfe44.sql",
    purpose: "Canvas document attachments and append-only version snapshots",
    kind: "Tables + RLS",
  },
  {
    order: 15,
    file: "20260811070115_ba4c9269-48cb-4a58-84b0-29e7bd1acb54.sql",
    purpose: "Storage policies for the private canvas-documents bucket",
    kind: "Storage policy",
  },
];

export const KNOWN_ISSUE_SCOPE: readonly KnownIssueScope[] = [
  {
    id: 1,
    issue: "Pilot evidence is empty until the cohort is enrolled and runs the mission.",
    impact: "High",
    classification: "P1 — evidence gate",
    mitigation: "Enrol 15–25 seats in Administration → Pilot programme, or record a waiver.",
  },
  {
    id: 2,
    issue: "Browser P0 suite cannot run in the build sandbox (no Playwright browsers).",
    impact: "Medium",
    classification: "P1",
    mitigation: "CI workflow launch-readiness.yml is the source of truth for browser evidence.",
  },
  {
    id: 3,
    issue: "Launch-learning aggregates depend on weekly views, so a metric can lag.",
    impact: "Low",
    classification: "P2",
    mitigation: "Aggregation failures degrade to an empty section rather than a wrong number.",
  },
  {
    id: 4,
    issue: "Repository breadth is the seeded reference set, so niche queries can return nothing.",
    impact: "Low",
    classification: "Content",
    mitigation: "Zero-result queries are surfaced in triage and answered with content.",
  },
  {
    id: 5,
    issue: "Search relevance is lexical, not semantic; synonyms may rank lower than expected.",
    impact: "Low",
    classification: "P2",
    mitigation: "Facets carry the discovery load; semantic ranking is post-launch work.",
  },
];

export const ROLLBACK_POSTURE: readonly string[] = [
  "Rollback: revert the application to the previous version; all migrations are additive so the schema may stay ahead.",
  "Forward-fix: ship a new additive migration (CREATE OR REPLACE / DROP POLICY IF EXISTS + CREATE POLICY) and bump the version.",
  "Editing an applied migration file is a P0 process violation and is never authorised.",
];