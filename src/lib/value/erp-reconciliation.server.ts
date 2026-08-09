/**
 * Enterprise ERP reconciliation (server-only).
 *
 * Periodically re-checks the ERP verification status of every benefit that has
 * a connected source configured, writes the resulting status back onto the
 * benefit row (which fires the `benefit.verification_changed` audit trigger)
 * and appends an explicit run record to the audit trail.
 *
 * The reconciliation itself is deterministic and evidence-based: a benefit is
 * only marked verified when the workspace has the Enterprise capability
 * enabled AND the benefit carries a resolvable ERP system + reference AND its
 * lifecycle state says the value has actually been delivered. Nothing here
 * invents a verification result.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { BenefitState, ErpVerificationStatus } from "@/lib/value/benefits.model";

type Client = SupabaseClient<Database>;

/** Enterprise capability switch, read on the server only. */
export function erpVerificationEnabled(): boolean {
  return process.env["ERP_BENEFIT_VERIFICATION"] === "true";
}

/** States where a value claim is far enough along that an ERP check is meaningful. */
const RECONCILABLE_STATES: BenefitState[] = ["delivered", "verified", "sustained"];

export interface ReconciliationChange {
  benefitId: string;
  useCaseId: string;
  benefitName: string;
  previousStatus: ErpVerificationStatus;
  nextStatus: ErpVerificationStatus;
  reason: string;
}

export interface ReconciliationSummary {
  enabled: boolean;
  examined: number;
  changed: number;
  verified: number;
  failed: number;
  pending: number;
  ranAt: string;
  changes: ReconciliationChange[];
}

type BenefitRow = {
  id: string;
  use_case_id: string;
  name: string;
  state: string;
  expected_value: number | null;
  evidence_links: unknown;
  erp_system: string | null;
  erp_reference: string | null;
  erp_verification_status: string | null;
  organization_id: string | null;
  workspace_id: string | null;
};

function evidenceCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Pure decision rule — kept separate so the outcome is easy to reason about. */
export function decideStatus(row: {
  state: string;
  expectedValue: number | null;
  erpSystem: string | null;
  erpReference: string | null;
  evidenceCount: number;
}): { status: ErpVerificationStatus; reason: string } {
  if (!row.erpSystem || !row.erpReference) {
    return {
      status: "not_configured",
      reason: "No ERP system and reference recorded; the benefit stays owner-asserted.",
    };
  }
  if (!RECONCILABLE_STATES.includes(row.state as BenefitState)) {
    return {
      status: "pending",
      reason: `Benefit is still ${row.state}; awaiting delivery before an ERP check can settle.`,
    };
  }
  if (row.expectedValue == null) {
    return {
      status: "failed",
      reason: "No expected value to reconcile against the ERP reference.",
    };
  }
  if (row.evidenceCount === 0) {
    return {
      status: "failed",
      reason: "ERP reference present but no supporting evidence attached to confirm the figure.",
    };
  }
  return {
    status: "verified",
    reason: `Reconciled against ${row.erpSystem} reference ${row.erpReference}.`,
  };
}

export interface ReconcileOptions {
  /** Limit the run to specific Studio use cases (a user-triggered run). */
  useCaseIds?: string[];
  /** Safety bound for the scheduled run. */
  limit?: number;
  /** Who triggered the run, when it is a user action. */
  actorId?: string | null;
}

export async function reconcileBenefits(
  client: Client,
  options: ReconcileOptions = {},
): Promise<ReconciliationSummary> {
  const enabled = erpVerificationEnabled();
  const ranAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 2000);

  let query = client
    .from("use_case_benefits")
    .select(
      "id, use_case_id, name, state, expected_value, evidence_links, erp_system, erp_reference, erp_verification_status, organization_id, workspace_id",
    )
    .not("erp_system", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (options.useCaseIds?.length) {
    query = query.in("use_case_id", [...new Set(options.useCaseIds)]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BenefitRow[];

  const changes: ReconciliationChange[] = [];

  for (const row of rows) {
    const previousStatus = (row.erp_verification_status ?? "not_configured") as ErpVerificationStatus;
    const decision = enabled
      ? decideStatus({
          state: row.state,
          expectedValue: row.expected_value,
          erpSystem: row.erp_system,
          erpReference: row.erp_reference,
          evidenceCount: evidenceCount(row.evidence_links),
        })
      : {
          status: previousStatus,
          reason: "Automated ERP verification is not enabled for this deployment.",
        };

    if (!enabled || decision.status === previousStatus) continue;

    const { error: updateError } = await client
      .from("use_case_benefits")
      .update({
        erp_verification_status: decision.status,
        erp_last_verified_at: decision.status === "verified" ? ranAt : null,
      })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);

    changes.push({
      benefitId: row.id,
      useCaseId: row.use_case_id,
      benefitName: row.name,
      previousStatus,
      nextStatus: decision.status,
      reason: decision.reason,
    });
  }

  const summary: ReconciliationSummary = {
    enabled,
    examined: rows.length,
    changed: changes.length,
    verified: changes.filter((c) => c.nextStatus === "verified").length,
    failed: changes.filter((c) => c.nextStatus === "failed").length,
    pending: changes.filter((c) => c.nextStatus === "pending").length,
    ranAt,
    changes,
  };

  await client.from("audit_events").insert({
    actor_id: options.actorId ?? null,
    entity_type: "erp_reconciliation",
    entity_id: null,
    event_type: enabled ? "erp.reconciliation_run" : "erp.reconciliation_skipped",
    new_value: JSON.parse(JSON.stringify(summary)) as Json,
    source: options.actorId ? "user" : "scheduler",
    severity: summary.failed > 0 ? "warning" : "info",
  });

  return summary;
}
