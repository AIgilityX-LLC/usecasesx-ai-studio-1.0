/**
 * Value realization vocabulary and aggregation rules.
 *
 * A benefit is *measurable*: baseline → target → expected value, in a stated
 * unit, over a stated period, owned by a named person and measured at a stated
 * cadence. Pure module — no database client, safe to import anywhere.
 *
 * Aggregation is deliberately conservative: values are only ever summed inside
 * a compatible group (same unit type, same currency, same normalised period).
 * Anything that cannot be combined is reported as an exclusion rather than
 * quietly folded into a single headline number.
 */

export type BenefitUnitType = "currency" | "hours" | "fte" | "percent" | "count" | "other";

export const BENEFIT_UNIT_TYPES: BenefitUnitType[] = [
  "currency",
  "hours",
  "fte",
  "percent",
  "count",
  "other",
];

export const BENEFIT_UNIT_LABELS: Record<BenefitUnitType, string> = {
  currency: "Currency",
  hours: "Hours",
  fte: "FTE",
  percent: "Percent",
  count: "Count",
  other: "Other unit",
};

/** Percent and "other" are never summed — averaging or adding them misleads. */
export const NON_ADDITIVE_UNITS: BenefitUnitType[] = ["percent", "other"];

export type BenefitPeriod = "one_off" | "monthly" | "quarterly" | "annual";

export const BENEFIT_PERIODS: BenefitPeriod[] = ["one_off", "monthly", "quarterly", "annual"];

export const BENEFIT_PERIOD_LABELS: Record<BenefitPeriod, string> = {
  one_off: "One-off",
  monthly: "Per month",
  quarterly: "Per quarter",
  annual: "Per year",
};

/** Multiplier to express a recurring value as an annual run rate. */
export const PERIOD_TO_ANNUAL: Record<BenefitPeriod, number | null> = {
  one_off: null, // not a run rate — reported separately
  monthly: 12,
  quarterly: 4,
  annual: 1,
};

export type BenefitCategory =
  | "cost_reduction"
  | "revenue_growth"
  | "productivity"
  | "risk_reduction"
  | "quality"
  | "customer_experience"
  | "compliance"
  | "sustainability"
  | "other";

export const BENEFIT_CATEGORIES: BenefitCategory[] = [
  "cost_reduction",
  "revenue_growth",
  "productivity",
  "risk_reduction",
  "quality",
  "customer_experience",
  "compliance",
  "sustainability",
  "other",
];

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  cost_reduction: "Cost reduction",
  revenue_growth: "Revenue growth",
  productivity: "Productivity",
  risk_reduction: "Risk reduction",
  quality: "Quality",
  customer_experience: "Customer experience",
  compliance: "Compliance",
  sustainability: "Sustainability",
  other: "Other",
};

export type BenefitConfidence = "low" | "medium" | "high";

export const BENEFIT_CONFIDENCES: BenefitConfidence[] = ["low", "medium", "high"];

export const BENEFIT_CONFIDENCE_LABELS: Record<BenefitConfidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export type MeasurementFrequency = "monthly" | "quarterly" | "biannual" | "annual" | "ad_hoc";

export const MEASUREMENT_FREQUENCIES: MeasurementFrequency[] = [
  "monthly",
  "quarterly",
  "biannual",
  "annual",
  "ad_hoc",
];

export const MEASUREMENT_FREQUENCY_LABELS: Record<MeasurementFrequency, string> = {
  monthly: "Measured monthly",
  quarterly: "Measured quarterly",
  biannual: "Measured twice a year",
  annual: "Measured annually",
  ad_hoc: "Measured ad hoc",
};

/**
 * Benefit lifecycle. Pro keeps the workflow simple — a single state field the
 * benefit owner moves forward. Verified and sustained are evidence-backed
 * states; nothing sets them automatically today.
 */
export type BenefitState = "proposed" | "approved" | "delivered" | "verified" | "sustained";

export const BENEFIT_STATES: BenefitState[] = [
  "proposed",
  "approved",
  "delivered",
  "verified",
  "sustained",
];

export const BENEFIT_STATE_LABELS: Record<BenefitState, string> = {
  proposed: "Proposed",
  approved: "Approved",
  delivered: "Delivered",
  verified: "Verified",
  sustained: "Sustained",
};

export const BENEFIT_STATE_HELP: Record<BenefitState, string> = {
  proposed: "Estimated in the business case, not yet agreed.",
  approved: "Agreed by the benefit owner as a committed target.",
  delivered: "The change is live; the benefit should now be measurable.",
  verified: "Measured against the baseline and evidenced.",
  sustained: "Verified and still holding at the last measurement.",
};

/** States that represent evidenced value rather than an estimate. */
export const EVIDENCED_STATES: BenefitState[] = ["verified", "sustained"];

export type BenefitVerificationMethod = "manual" | "erp_automated";

export const BENEFIT_VERIFICATION_LABELS: Record<BenefitVerificationMethod, string> = {
  manual: "Manual evidence",
  erp_automated: "Automated ERP verification (Enterprise)",
};

export interface Benefit {
  id: string;
  useCaseId: string;
  name: string;
  category: BenefitCategory;
  kpi: string | null;
  unitType: BenefitUnitType;
  currency: string | null;
  period: BenefitPeriod;
  baselineValue: number | null;
  targetValue: number | null;
  expectedValue: number | null;
  confidence: BenefitConfidence;
  measurementFrequency: MeasurementFrequency;
  benefitOwner: string | null;
  evidenceSource: string | null;
  state: BenefitState;
  verificationMethod: BenefitVerificationMethod;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BenefitInput = Omit<Benefit, "id" | "createdAt" | "updatedAt">;

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "AUD", "CAD", "SGD"];

/* --------------------------------------------------------- aggregation ---- */

/** Key identifying a set of benefits that may legitimately be added together. */
export function compatibilityKey(benefit: {
  unitType: BenefitUnitType;
  currency: string | null;
  period: BenefitPeriod;
}): string {
  const recurring = PERIOD_TO_ANNUAL[benefit.period] !== null;
  // Recurring values normalise to an annual run rate; one-off values do not.
  const periodPart = recurring ? "annual" : "one_off";
  return `${benefit.unitType}|${benefit.currency ?? "-"}|${periodPart}`;
}

export interface ValueGroup {
  key: string;
  unitType: BenefitUnitType;
  currency: string | null;
  /** "annual" run rate or "one_off". */
  basis: "annual" | "one_off";
  count: number;
  /** Sum of expected values normalised to the group basis. */
  expectedTotal: number;
  /** Portion of the total that sits in verified or sustained benefits. */
  evidencedTotal: number;
  /** Benefits contributing to this group. */
  benefits: Benefit[];
}

export interface ValueExclusion {
  reason: "non_additive_unit" | "missing_value";
  label: string;
  benefits: Benefit[];
}

export interface ValueAggregate {
  groups: ValueGroup[];
  exclusions: ValueExclusion[];
  totalBenefits: number;
  /** True when more than one compatible group exists — no single headline number. */
  mixed: boolean;
  ownersMissing: number;
}

/**
 * Aggregate benefits without ever combining incompatible units, currencies or
 * periods. Percent/other units and benefits with no expected value are listed
 * as exclusions so the UI can state exactly what is not in the total.
 */
export function aggregateBenefits(benefits: Benefit[]): ValueAggregate {
  const groups = new Map<string, ValueGroup>();
  const nonAdditive: Benefit[] = [];
  const missingValue: Benefit[] = [];

  for (const benefit of benefits) {
    if (NON_ADDITIVE_UNITS.includes(benefit.unitType)) {
      nonAdditive.push(benefit);
      continue;
    }
    if (benefit.expectedValue == null || Number.isNaN(benefit.expectedValue)) {
      missingValue.push(benefit);
      continue;
    }
    const multiplier = PERIOD_TO_ANNUAL[benefit.period] ?? 1;
    const normalised = benefit.expectedValue * multiplier;
    const key = compatibilityKey(benefit);
    const basis: ValueGroup["basis"] =
      PERIOD_TO_ANNUAL[benefit.period] === null ? "one_off" : "annual";
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.expectedTotal += normalised;
      if (EVIDENCED_STATES.includes(benefit.state)) existing.evidencedTotal += normalised;
      existing.benefits.push(benefit);
    } else {
      groups.set(key, {
        key,
        unitType: benefit.unitType,
        currency: benefit.currency,
        basis,
        count: 1,
        expectedTotal: normalised,
        evidencedTotal: EVIDENCED_STATES.includes(benefit.state) ? normalised : 0,
        benefits: [benefit],
      });
    }
  }

  const exclusions: ValueExclusion[] = [];
  if (nonAdditive.length) {
    exclusions.push({
      reason: "non_additive_unit",
      label: "Percentage and non-standard units are shown individually, never summed.",
      benefits: nonAdditive,
    });
  }
  if (missingValue.length) {
    exclusions.push({
      reason: "missing_value",
      label: "No expected value recorded yet, so these are excluded from the total.",
      benefits: missingValue,
    });
  }

  return {
    groups: [...groups.values()].sort((a, b) => b.expectedTotal - a.expectedTotal),
    exclusions,
    totalBenefits: benefits.length,
    mixed: groups.size > 1,
    ownersMissing: benefits.filter((b) => !b.benefitOwner?.trim()).length,
  };
}

/* ----------------------------------------------------------- formatting --- */

export function formatBenefitAmount(
  value: number | null | undefined,
  unitType: BenefitUnitType,
  currency: string | null,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (unitType === "currency" && currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency} ${Math.round(value).toLocaleString()}`;
    }
  }
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(2));
  const suffix: Partial<Record<BenefitUnitType, string>> = {
    hours: " hrs",
    fte: " FTE",
    percent: "%",
    count: "",
    other: "",
  };
  return `${rounded.toLocaleString()}${suffix[unitType] ?? ""}`;
}

export function describeGroup(group: ValueGroup): string {
  const unit =
    group.unitType === "currency"
      ? (group.currency ?? "Currency")
      : BENEFIT_UNIT_LABELS[group.unitType];
  return group.basis === "annual" ? `${unit} · annual run rate` : `${unit} · one-off`;
}

/** A benefit is measurable when it carries a baseline, a target and an owner. */
export function isMeasurable(benefit: Benefit): boolean {
  return (
    benefit.baselineValue != null &&
    benefit.targetValue != null &&
    Boolean(benefit.benefitOwner?.trim())
  );
}
