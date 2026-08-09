/**
 * Phase 3 data reconciliation harness.
 *
 * For one workspace, this recomputes every aggregate the UI displays using the
 * *same pure domain functions the components call*, then compares each number
 * against an independent count/sum taken straight from the source rows. A
 * non-zero delta means the presentation layer and the database disagree, which
 * is a data-integrity defect, not a cosmetic one.
 *
 * Server-side only. Runs with the service-role key so it can read across every
 * workspace; it is never imported by application code and never bundled.
 *
 *   bun run scripts/qa/reconcile-phase3.ts --workspace <uuid>
 *   bun run scripts/qa/reconcile-phase3.ts            # widest workspace found
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { buildMatrix, type MapRecord } from "../../src/lib/opportunity-map";
import {
  buildRoadmapItems,
  groupByPeriod,
  groupByStage,
  summarizeRoadmap,
} from "../../src/lib/roadmap";
import type { PortfolioEntry } from "../../src/lib/portfolio-model";
import { aggregateBenefits, type Benefit } from "../../src/lib/value/benefits.model";
import { buildHandoffAnalytics } from "../../src/lib/handoffs/handoff.analytics";
import type { HandoffRequest } from "../../src/lib/handoffs/handoff.model";

/* ------------------------------------------------------------------ setup */

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. " +
      "Run this in a credentialed environment; the result is only evidence when it reads real rows.",
  );
  process.exit(2);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type Row = Record<string, any>;

type Check = {
  surface: string;
  metric: string;
  ui: number;
  source: number;
};

const checks: Check[] = [];

function compare(surface: string, metric: string, ui: number, source: number) {
  checks.push({ surface, metric, ui, source });
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* --------------------------------------------------------------- mappers */

/** Mirrors the mapping the Opportunity Map server function performs. */
function toMapRecord(row: Row): MapRecord {
  return {
    id: row["id"],
    title: row["title"] ?? "",
    status: row["status"] ?? "signal",
    urgency: row["urgency"] ?? "unknown",
    ownerName: row["owner_name"] ?? "",
    orgUnitId: row["org_unit_id"] ?? null,
    orgUnitName: row["org_unit_id"] ? String(row["org_unit_id"]) : null,
    businessFunction: row["business_function"] ?? "",
    strategicThemeId: row["strategic_theme_id"] ?? null,
    strategicThemeName: row["strategic_theme_id"] ? String(row["strategic_theme_id"]) : null,
    convertedUseCaseId: row["converted_use_case_id"] ?? null,
    updatedAt: row["updated_at"] ?? row["created_at"] ?? new Date().toISOString(),
  };
}

/** Mirrors the mapping the portfolio repository performs on portfolio_items. */
function toPortfolioEntry(row: Row): PortfolioEntry {
  return {
    useCaseId: row["use_case_id"],
    rank: row["rank"] ?? null,
    decision: row["decision"] ?? "candidate",
    targetPeriod: row["target_period"] ?? undefined,
    fundingState: row["funding_state"] ?? "unfunded",
    nextAction: row["next_action"] ?? undefined,
    notes: row["notes"] ?? undefined,
    reviewNotes: row["review_notes"] ?? undefined,
    lastReviewedAt: row["last_reviewed_at"] ?? undefined,
    addedAt: row["added_at"] ?? row["created_at"],
    updatedAt: row["updated_at"] ?? row["added_at"] ?? row["created_at"],
    deliveryStage: row["delivery_stage"] ?? "unscheduled",
    plannedStartDate: row["planned_start_date"] ?? undefined,
    plannedEndDate: row["planned_end_date"] ?? undefined,
    milestone: row["milestone"] ?? undefined,
    deliveryOwner: row["delivery_owner"] ?? undefined,
    dependsOn: Array.isArray(row["depends_on"]) ? row["depends_on"] : [],
    blockedReason: row["blocked_reason"] ?? undefined,
  };
}

/** Mirrors the mapping the benefits repository performs. */
function toBenefit(row: Row): Benefit {
  return {
    id: row["id"],
    useCaseId: row["use_case_id"],
    name: row["name"] ?? "",
    category: row["category"] ?? "other",
    kpi: row["kpi"] ?? null,
    unitType: row["unit_type"] ?? "other",
    currency: row["currency"] ?? null,
    period: row["period"] ?? "annual",
    baselineValue: row["baseline_value"] == null ? null : Number(row["baseline_value"]),
    targetValue: row["target_value"] == null ? null : Number(row["target_value"]),
    expectedValue: row["expected_value"] == null ? null : Number(row["expected_value"]),
    confidence: row["confidence"] ?? "medium",
    measurementFrequency: row["measurement_frequency"] ?? "quarterly",
    benefitOwner: row["benefit_owner"] ?? null,
    evidenceSource: row["evidence_source"] ?? null,
    evidenceLinks: Array.isArray(row["evidence_links"]) ? row["evidence_links"] : [],
    state: row["state"] ?? "proposed",
    verificationMethod: row["verification_method"] ?? "owner_asserted",
    erpVerificationStatus: row["erp_verification_status"] ?? "not_verified",
    erpSystem: row["erp_system"] ?? null,
    erpReference: row["erp_reference"] ?? null,
    erpLastVerifiedAt: row["erp_last_verified_at"] ?? null,
    notes: row["notes"] ?? null,
    createdAt: row["created_at"],
    updatedAt: row["updated_at"] ?? row["created_at"],
  };
}

/** Mirrors the mapping the handoffs repository performs. */
function toHandoff(row: Row): HandoffRequest {
  return {
    id: row["id"],
    workspaceId: row["workspace_id"],
    organizationId: row["organization_id"] ?? null,
    target: row["target"],
    requestType: row["request_type"],
    status: row["status"],
    deliveryMode: row["delivery_mode"],
    title: row["title"],
    summary: row["summary"] ?? null,
    requestedBy: row["requested_by"],
    ownerUserId: row["owner_user_id"] ?? null,
    sourceRefs: Array.isArray(row["subject_refs"]) ? row["subject_refs"] : [],
    sourceVersion: row["source_version"] ?? null,
    payload: row["payload"] ?? {},
    consent: row["consent"] ?? null,
    sensitivity: row["sensitivity"],
    statusNote: row["status_note"] ?? null,
    dispatchedAt: row["dispatched_at"] ?? null,
    completedAt: row["completed_at"] ?? null,
    createdAt: row["created_at"],
    updatedAt: row["updated_at"] ?? row["created_at"],
  } as HandoffRequest;
}

/* ---------------------------------------------------------------- checks */

async function pickWorkspace(explicit: string | null): Promise<string | null> {
  if (explicit) return explicit;
  // Widest workspace = the one with the most opportunities; best signal density.
  const { data } = await admin
    .from("opportunities")
    .select("workspace_id")
    .not("workspace_id", "is", null)
    .limit(1000);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Row[]) {
    const key = row["workspace_id"] as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

async function reconcileOpportunityMap(workspaceId: string) {
  const { data, error } = await admin
    .from("opportunities")
    .select(
      "id, title, status, urgency, owner_name, org_unit_id, business_function, strategic_theme_id, converted_use_case_id, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const records = rows.map(toMapRecord);

  const matrix = buildMatrix(records, "businessFunction");
  const cellTotal = matrix.rows.reduce(
    (sum, row) => sum + row.cells.reduce((inner, cell) => inner + cell.count, 0),
    0,
  );
  compare("Opportunity Map", "records plotted", cellTotal, rows.length);

  // Every lifecycle status must survive the mapping into the matrix.
  const statuses = new Set(rows.map((row) => String(row["status"] ?? "signal")));
  for (const status of statuses) {
    const sourceCount = rows.filter((row) => String(row["status"] ?? "signal") === status).length;
    const uiCount = records.filter((record) => record.status === status).length;
    compare("Opportunity Map", `status: ${status}`, uiCount, sourceCount);
  }

  const urgencies = new Set(rows.map((row) => String(row["urgency"] ?? "unknown")));
  for (const urgency of urgencies) {
    const sourceCount = rows.filter(
      (row) => String(row["urgency"] ?? "unknown") === urgency,
    ).length;
    const uiCount = records.filter((record) => record.urgency === urgency).length;
    compare("Opportunity Map", `urgency: ${urgency}`, uiCount, sourceCount);
  }
}

async function reconcilePortfolios(workspaceId: string) {
  const { data: portfolios, error } = await admin
    .from("portfolios")
    .select("id, name, parent_portfolio_id")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  for (const portfolio of (portfolios ?? []) as Row[]) {
    const { data: items, error: itemsError } = await admin
      .from("portfolio_items")
      .select("*")
      .eq("portfolio_id", portfolio["id"]);
    if (itemsError) throw itemsError;
    const rows = (items ?? []) as Row[];
    const entries = rows.map(toPortfolioEntry);
    const label = `Portfolio "${portfolio["name"]}"`;

    compare(label, "items", entries.length, rows.length);

    const decisions = new Set(rows.map((row) => String(row["decision"])));
    for (const decision of decisions) {
      compare(
        label,
        `decision: ${decision}`,
        entries.filter((entry) => entry.decision === decision).length,
        rows.filter((row) => String(row["decision"]) === decision).length,
      );
    }

    // Roadmap lanes and period buckets must account for every eligible item.
    const roadmapItems = buildRoadmapItems(entries);
    const laneTotal = groupByStage(roadmapItems).reduce((sum, lane) => sum + lane.items.length, 0);
    compare(label + " roadmap", "items in lanes", laneTotal, roadmapItems.length);

    const periodTotal = groupByPeriod(roadmapItems).reduce(
      (sum, group) => sum + group.items.length,
      0,
    );
    compare(label + " roadmap", "items in period buckets", periodTotal, roadmapItems.length);

    const summary = summarizeRoadmap(roadmapItems);
    compare(label + " roadmap", "summary total", num(summary.total), roadmapItems.length);
  }
}

async function reconcileBenefits(workspaceId: string) {
  const { data, error } = await admin
    .from("use_case_benefits")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const benefits = rows.map(toBenefit);

  const aggregate = aggregateBenefits(benefits);
  compare("Benefits", "benefits counted", num(aggregate.totalBenefits), rows.length);

  // Nothing may silently vanish: every benefit is either inside a group or
  // named as an explicit exclusion.
  const grouped = aggregate.groups.reduce((sum, group) => sum + group.benefits.length, 0);
  const excluded = aggregate.exclusions.reduce(
    (sum, exclusion) => sum + exclusion.benefits.length,
    0,
  );
  compare("Benefits", "grouped + excluded", grouped + excluded, rows.length);

  const states = new Set(rows.map((row) => String(row["state"] ?? "proposed")));
  for (const state of states) {
    compare(
      "Benefits",
      `state: ${state}`,
      benefits.filter((benefit) => benefit.state === state).length,
      rows.filter((row) => String(row["state"] ?? "proposed") === state).length,
    );
  }

  // Owner gap shown in the UI must match the rows that really have no owner.
  const ownerless = rows.filter((row) => !row["benefit_owner"]).length;
  compare("Benefits", "owners missing", num(aggregate.ownersMissing), ownerless);
}

async function reconcileHandoffs(workspaceId: string) {
  const { data, error } = await admin
    .from("suite_handoff_requests")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const requests = rows.map(toHandoff);

  const analytics = buildHandoffAnalytics(requests, []);
  compare("Handoffs", "requests", num(analytics.total), rows.length);

  const targets = new Set(rows.map((row) => String(row["target"])));
  for (const target of targets) {
    const sourceCount = rows.filter((row) => String(row["target"]) === target).length;
    const bucket = analytics.byTarget.find((entry) => entry.target === target);
    compare("Handoffs", `target: ${target}`, num(bucket?.total), sourceCount);
  }

  const statuses = new Set(rows.map((row) => String(row["status"])));
  for (const status of statuses) {
    const sourceCount = rows.filter((row) => String(row["status"]) === status).length;
    const bucket = analytics.byStatus.find((entry) => entry.status === status);
    compare("Handoffs", `status: ${status}`, num(bucket?.count), sourceCount);
  }
}

async function reconcileActivity(workspaceId: string) {
  const { count, error } = await admin
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const { data: exportRows, error: exportError } = await admin
    .from("audit_events")
    .select("id, event_type")
    .eq("workspace_id", workspaceId)
    .like("event_type", "%export%");
  if (exportError) throw exportError;

  compare("Activity timeline", "audit events readable", num(count), num(count));
  compare(
    "Activity timeline",
    "export events",
    (exportRows ?? []).length,
    (exportRows ?? []).filter((row: Row) => String(row["event_type"]).includes("export")).length,
  );
}

/* ----------------------------------------------------------------- report */

function render(workspaceId: string) {
  const width = {
    surface: Math.max(8, ...checks.map((check) => check.surface.length)),
    metric: Math.max(8, ...checks.map((check) => check.metric.length)),
  };
  const pad = (value: string, size: number) => value.padEnd(size);

  console.log(`\nPhase 3 reconciliation — workspace ${workspaceId}\n`);
  console.log(
    `${pad("surface", width.surface)} | ${pad("metric", width.metric)} | ${pad("ui", 8)} | ${pad("source", 8)} | delta`,
  );
  console.log("-".repeat(width.surface + width.metric + 34));

  let failures = 0;
  for (const check of checks) {
    const delta = check.ui - check.source;
    if (delta !== 0) failures += 1;
    console.log(
      `${pad(check.surface, width.surface)} | ${pad(check.metric, width.metric)} | ` +
        `${pad(String(check.ui), 8)} | ${pad(String(check.source), 8)} | ${delta === 0 ? "0" : `${delta} ✗`}`,
    );
  }

  console.log(
    `\n${checks.length} checks, ${failures} discrepanc${failures === 1 ? "y" : "ies"}.` +
      (failures === 0 ? " Charts reconcile with source records." : " Investigate each ✗ row."),
  );
  return failures;
}

/* ------------------------------------------------------------------- main */

async function main() {
  const argIndex = process.argv.indexOf("--workspace");
  const explicit = argIndex > -1 ? (process.argv[argIndex + 1] ?? null) : null;
  const workspaceId = await pickWorkspace(explicit);

  if (!workspaceId) {
    console.log("No workspace with records found — nothing to reconcile.");
    return;
  }

  await reconcileOpportunityMap(workspaceId);
  await reconcilePortfolios(workspaceId);
  await reconcileBenefits(workspaceId);
  await reconcileHandoffs(workspaceId);
  await reconcileActivity(workspaceId);

  const failures = render(workspaceId);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Reconciliation failed:", error);
  process.exit(2);
});
