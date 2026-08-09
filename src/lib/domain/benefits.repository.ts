/**
 * Benefits repository — the only place that reads/writes `use_case_benefits`.
 *
 * Row-level security scopes every query to use cases the signed-in user can
 * already access; tenancy columns are stamped by a database trigger. Value
 * changes are audited by a database trigger, so history cannot be bypassed by
 * writing through another path.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeError, unwrapResult } from "./errors";
import type {
  Benefit,
  BenefitCategory,
  BenefitConfidence,
  BenefitInput,
  BenefitPeriod,
  BenefitState,
  BenefitUnitType,
  BenefitVerificationMethod,
  MeasurementFrequency,
} from "@/lib/value/benefits.model";

const COLUMNS =
  "id, use_case_id, name, category, kpi, unit_type, currency, period, baseline_value, target_value, expected_value, confidence, measurement_frequency, benefit_owner, evidence_source, state, verification_method, notes, created_at, updated_at";

type Row = {
  id: string;
  use_case_id: string;
  name: string;
  category: string;
  kpi: string | null;
  unit_type: string;
  currency: string | null;
  period: string;
  baseline_value: number | null;
  target_value: number | null;
  expected_value: number | null;
  confidence: string;
  measurement_frequency: string;
  benefit_owner: string | null;
  evidence_source: string | null;
  state: string;
  verification_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toBenefit(row: Row): Benefit {
  return {
    id: row.id,
    useCaseId: row.use_case_id,
    name: row.name,
    category: row.category as BenefitCategory,
    kpi: row.kpi,
    unitType: row.unit_type as BenefitUnitType,
    currency: row.currency,
    period: row.period as BenefitPeriod,
    baselineValue: row.baseline_value,
    targetValue: row.target_value,
    expectedValue: row.expected_value,
    confidence: row.confidence as BenefitConfidence,
    measurementFrequency: row.measurement_frequency as MeasurementFrequency,
    benefitOwner: row.benefit_owner,
    evidenceSource: row.evidence_source,
    state: row.state as BenefitState,
    verificationMethod: row.verification_method as BenefitVerificationMethod,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: BenefitInput) {
  return {
    use_case_id: input.useCaseId,
    name: input.name.trim(),
    category: input.category,
    kpi: input.kpi?.trim() || null,
    unit_type: input.unitType,
    // The database rejects a currency benefit with no currency; keep them paired.
    currency: input.unitType === "currency" ? (input.currency ?? "USD") : null,
    period: input.period,
    baseline_value: input.baselineValue,
    target_value: input.targetValue,
    expected_value: input.expectedValue,
    confidence: input.confidence,
    measurement_frequency: input.measurementFrequency,
    benefit_owner: input.benefitOwner?.trim() || null,
    evidence_source: input.evidenceSource?.trim() || null,
    state: input.state,
    verification_method: input.verificationMethod,
    notes: input.notes?.trim() || null,
  };
}

export async function listBenefits(useCaseId: string): Promise<Benefit[]> {
  const result = await supabase
    .from("use_case_benefits")
    .select(COLUMNS)
    .eq("use_case_id", useCaseId)
    .order("created_at", { ascending: true });
  return ((unwrapResult(result, { allowNull: true }) ?? []) as Row[]).map(toBenefit);
}

/** Batched read for portfolio, roadmap and report summaries. */
export async function listBenefitsForUseCases(useCaseIds: string[]): Promise<Benefit[]> {
  const ids = [...new Set(useCaseIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const result = await supabase.from("use_case_benefits").select(COLUMNS).in("use_case_id", ids);
  return ((unwrapResult(result, { allowNull: true }) ?? []) as Row[]).map(toBenefit);
}

export async function createBenefit(input: BenefitInput): Promise<Benefit> {
  const { data: userData } = await supabase.auth.getUser();
  const result = await supabase
    .from("use_case_benefits")
    .insert({ ...toRow(input), created_by: userData.user?.id ?? null })
    .select(COLUMNS)
    .single();
  if (result.error) throw normalizeError(result.error);
  return toBenefit(result.data as Row);
}

export async function updateBenefit(id: string, input: BenefitInput): Promise<Benefit> {
  const result = await supabase
    .from("use_case_benefits")
    .update(toRow(input))
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (result.error) throw normalizeError(result.error);
  return toBenefit(result.data as Row);
}

export async function deleteBenefit(id: string): Promise<void> {
  const result = await supabase.from("use_case_benefits").delete().eq("id", id);
  if (result.error) throw normalizeError(result.error);
}

export interface BenefitAuditEntry {
  id: string;
  eventType: string;
  at: string;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
}

/** Append-only audit trail of value changes for one use case. */
export async function listBenefitAudit(useCaseId: string): Promise<BenefitAuditEntry[]> {
  const result = await supabase
    .from("audit_events")
    .select("id, event_type, created_at, previous_value, new_value")
    .eq("entity_type", "use_case_benefit")
    .eq("entity_id", useCaseId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as {
    id: string;
    event_type: string;
    created_at: string;
    previous_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    at: row.created_at,
    previous: row.previous_value,
    next: row.new_value,
  }));
}
