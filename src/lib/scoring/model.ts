/**
 * Scoring — scorecard model and deterministic calculation engine (client-safe).
 *
 * Definitions and results are deliberately separate concerns:
 *   - a *scorecard definition* owns the dimensions, criteria, scales, weights
 *     and thresholds. It is versioned and either global or workspace-owned.
 *   - a *scorecard result* is an immutable calculation of one set of responses
 *     against one definition version.
 *
 * Everything in this file is a pure function: the same responses against the
 * same definition always produce the same numbers. No transport, no clock,
 * no randomness, no AI. AI may only propose evidence and explanation text
 * elsewhere — it can never change a score.
 */

import { z } from "zod";

/* --------------------------------------------------------------- definition */

export type ScaleOption = {
  /** Raw answer value. Always 0..scaleMax on the definition. */
  value: number;
  label: string;
  /** What choosing this option actually means, shown in the UI. */
  meaning?: string;
};

export type Criterion = {
  id: string;
  label: string;
  help?: string;
  /** Relative weight inside its dimension. Normalised at calculation time. */
  weight: number;
  /** When true a high raw answer is *worse* (used for risk-style criteria). */
  inverse?: boolean;
  scale: ScaleOption[];
};

export type Dimension = {
  id: string;
  label: string;
  intent: string;
  /** Relative weight inside the scorecard. Normalised at calculation time. */
  weight: number;
  /** Marks the dimension used for the risk adjustment. At most one. */
  isRiskDimension?: boolean;
  criteria: Criterion[];
};

export type RecommendationBand = {
  id: string;
  label: string;
  /** Inclusive lower bound on the risk-adjusted score (0..100). */
  min: number;
  tone: "positive" | "caution" | "warning" | "negative";
  guidance: string;
};

export type ScorecardDefinition = {
  slug: string;
  name: string;
  description: string;
  version: number;
  /** Highest raw answer value. Scales run 0..scaleMax. */
  scaleMax: number;
  /**
   * How much a poor risk profile can pull the composite down.
   * riskAdjusted = composite * (1 - riskWeighting * (1 - riskScore/100)).
   */
  riskWeighting: number;
  /** Below this share of answered weight the result is flagged incomplete. */
  minimumCompleteness: number;
  dimensions: Dimension[];
  bands: RecommendationBand[];
};

/* ------------------------------------------------------------------ results */

export type Responses = Record<string, number>;

export type CriterionOutcome = {
  criterionId: string;
  label: string;
  answered: boolean;
  /** Raw selected value, or null when unanswered. */
  raw: number | null;
  /** Label of the selected scale option. */
  answerLabel: string | null;
  inverse: boolean;
  /** 0..1 after inversion. */
  normalised: number | null;
  /** Share of the dimension this criterion carries (0..1). */
  weightShare: number;
  /** Points this criterion adds to the composite (0..100 scale). */
  contribution: number;
  explanation: string;
};

export type DimensionOutcome = {
  dimensionId: string;
  label: string;
  intent: string;
  /** 0..100, computed from answered criteria only. Null when nothing answered. */
  score: number | null;
  /** Share of the composite this dimension carries (0..1). */
  weightShare: number;
  contribution: number;
  answeredCount: number;
  totalCount: number;
  isRiskDimension: boolean;
  criteria: CriterionOutcome[];
  explanation: string;
};

export type Confidence = "high" | "medium" | "low";

export type ScoreResult = {
  scorecardSlug: string;
  scorecardVersion: number;
  /** 0..100 weighted composite priority across answered dimensions. */
  composite: number | null;
  /** Composite after the risk adjustment. */
  riskAdjusted: number | null;
  /** 0..1 share of criterion weight that was answered. */
  completeness: number;
  confidence: Confidence;
  /** True when completeness is under the definition's minimum. */
  incomplete: boolean;
  missing: { dimensionId: string; dimensionLabel: string; criterionId: string; label: string }[];
  dimensions: DimensionOutcome[];
  recommendation: RecommendationBand | null;
  /** Human-readable maths, one line per step. */
  calculation: string[];
};

/* ------------------------------------------------------------------- helpers */

/** Round to 1 decimal so stored and displayed values never drift. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function share(weight: number, total: number): number {
  return total > 0 ? weight / total : 0;
}

export function normaliseAnswer(raw: number, scaleMax: number, inverse?: boolean): number {
  if (scaleMax <= 0) return 0;
  const clamped = Math.min(Math.max(raw, 0), scaleMax);
  const ratio = clamped / scaleMax;
  return inverse ? 1 - ratio : ratio;
}

function confidenceFor(completeness: number): Confidence {
  if (completeness >= 0.85) return "high";
  if (completeness >= 0.6) return "medium";
  return "low";
}

export function bandFor(
  definition: ScorecardDefinition,
  value: number | null,
): RecommendationBand | null {
  if (value === null) return null;
  const sorted = [...definition.bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => value >= b.min) ?? sorted[sorted.length - 1] ?? null;
}

/* ------------------------------------------------------------------- compute */

/**
 * Deterministic scorecard calculation.
 *
 * Unanswered criteria are excluded from their dimension rather than treated as
 * zero, so a partially completed scorecard is not silently punished — instead
 * it is flagged through `completeness`, `confidence` and `missing`.
 */
export function calculateScore(
  definition: ScorecardDefinition,
  responses: Responses,
): ScoreResult {
  const calculation: string[] = [];
  const missing: ScoreResult["missing"] = [];

  const totalDimensionWeight = definition.dimensions.reduce((s, d) => s + d.weight, 0);

  let answeredWeight = 0;
  let totalWeight = 0;

  const dimensions: DimensionOutcome[] = definition.dimensions.map((dim) => {
    const dimWeightShare = share(dim.weight, totalDimensionWeight);
    const totalCriterionWeight = dim.criteria.reduce((s, c) => s + c.weight, 0);

    let answeredCriterionWeight = 0;
    let weightedSum = 0;

    const criteria: CriterionOutcome[] = dim.criteria.map((crit) => {
      const critShare = share(crit.weight, totalCriterionWeight);
      const raw = responses[crit.id];
      const answered = typeof raw === "number" && Number.isFinite(raw);

      // Completeness is measured on the composite-weighted criterion weight.
      const globalWeight = dimWeightShare * critShare;
      totalWeight += globalWeight;

      if (!answered) {
        missing.push({
          dimensionId: dim.id,
          dimensionLabel: dim.label,
          criterionId: crit.id,
          label: crit.label,
        });
        return {
          criterionId: crit.id,
          label: crit.label,
          answered: false,
          raw: null,
          answerLabel: null,
          inverse: Boolean(crit.inverse),
          normalised: null,
          weightShare: critShare,
          contribution: 0,
          explanation: "Not answered — excluded from the dimension average.",
        };
      }

      answeredWeight += globalWeight;
      answeredCriterionWeight += crit.weight;

      const normalised = normaliseAnswer(raw, definition.scaleMax, crit.inverse);
      weightedSum += normalised * crit.weight;

      const option = crit.scale.find((s) => s.value === raw);
      const contribution = round1(normalised * critShare * dimWeightShare * 100);

      return {
        criterionId: crit.id,
        label: crit.label,
        answered: true,
        raw,
        answerLabel: option?.label ?? String(raw),
        inverse: Boolean(crit.inverse),
        normalised: round1(normalised * 100) / 100,
        weightShare: critShare,
        contribution,
        explanation: crit.inverse
          ? `Answer ${raw}/${definition.scaleMax} inverted to ${Math.round(normalised * 100)}%` +
            ` (lower exposure scores higher), weighted ${Math.round(critShare * 100)}% of ${dim.label}.`
          : `Answer ${raw}/${definition.scaleMax} = ${Math.round(normalised * 100)}%,` +
            ` weighted ${Math.round(critShare * 100)}% of ${dim.label}.`,
      };
    });

    const score =
      answeredCriterionWeight > 0 ? round1((weightedSum / answeredCriterionWeight) * 100) : null;

    const outcome: DimensionOutcome = {
      dimensionId: dim.id,
      label: dim.label,
      intent: dim.intent,
      score,
      weightShare: dimWeightShare,
      contribution: score === null ? 0 : round1(score * dimWeightShare),
      answeredCount: criteria.filter((c) => c.answered).length,
      totalCount: criteria.length,
      isRiskDimension: Boolean(dim.isRiskDimension),
      criteria,
      explanation:
        score === null
          ? `No criteria answered, so ${dim.label} is excluded from the composite.`
          : `${dim.label} scores ${score}/100 from ${criteria.filter((c) => c.answered).length} of ${criteria.length} criteria, carrying ${Math.round(dimWeightShare * 100)}% of the composite.`,
    };
    return outcome;
  });

  // Composite: weighted mean over dimensions that have at least one answer.
  const scored = dimensions.filter((d) => d.score !== null);
  const scoredWeight = scored.reduce((s, d) => s + d.weightShare, 0);
  const composite =
    scoredWeight > 0
      ? round1(scored.reduce((s, d) => s + (d.score as number) * d.weightShare, 0) / scoredWeight)
      : null;

  const completeness = totalWeight > 0 ? round1((answeredWeight / totalWeight) * 100) / 100 : 0;
  const confidence = confidenceFor(completeness);

  const riskDim = dimensions.find((d) => d.isRiskDimension && d.score !== null);
  const riskAdjusted =
    composite === null
      ? null
      : riskDim
        ? round1(
            composite * (1 - definition.riskWeighting * (1 - (riskDim.score as number) / 100)),
          )
        : composite;

  const recommendation = bandFor(definition, riskAdjusted);

  calculation.push(
    `Each answer is normalised to 0–100% of the ${definition.scaleMax}-point scale; risk-style criteria are inverted so lower exposure scores higher.`,
  );
  calculation.push(
    "Each dimension is the weighted average of its answered criteria; unanswered criteria are excluded, not scored as zero.",
  );
  if (composite !== null) {
    calculation.push(
      `Composite priority = weighted average of ${scored.length} scored dimension(s) = ${composite}/100.`,
    );
  } else {
    calculation.push("Composite priority is unavailable until at least one criterion is answered.");
  }
  if (riskDim && composite !== null) {
    calculation.push(
      `Risk adjustment: ${composite} × (1 − ${definition.riskWeighting} × (1 − ${riskDim.score}/100)) = ${riskAdjusted}/100.`,
    );
  }
  calculation.push(
    `Completeness = ${Math.round(completeness * 100)}% of criterion weight answered → ${confidence} confidence.`,
  );
  if (recommendation) {
    calculation.push(
      `Risk-adjusted ${riskAdjusted}/100 falls in the “${recommendation.label}” band (≥ ${recommendation.min}).`,
    );
  }

  return {
    scorecardSlug: definition.slug,
    scorecardVersion: definition.version,
    composite,
    riskAdjusted,
    completeness,
    confidence,
    incomplete: completeness < definition.minimumCompleteness,
    missing,
    dimensions,
    recommendation,
    calculation,
  };
}

/* ------------------------------------------------------------------ schemas */

const scaleOptionSchema = z.object({
  value: z.number(),
  label: z.string(),
  meaning: z.string().optional(),
});

const criterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  help: z.string().optional(),
  weight: z.number().positive(),
  inverse: z.boolean().optional(),
  scale: z.array(scaleOptionSchema).min(2),
});

const dimensionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  intent: z.string(),
  weight: z.number().positive(),
  isRiskDimension: z.boolean().optional(),
  criteria: z.array(criterionSchema).min(1),
});

export const scorecardDefinitionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.number().int().positive(),
  scaleMax: z.number().int().positive(),
  riskWeighting: z.number().min(0).max(1),
  minimumCompleteness: z.number().min(0).max(1),
  dimensions: z.array(dimensionSchema).min(1),
  bands: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        min: z.number(),
        tone: z.enum(["positive", "caution", "warning", "negative"]),
        guidance: z.string(),
      }),
    )
    .min(1),
});

export const responsesSchema = z.record(z.string(), z.number().int().min(0).max(10));

/** Guard against responses that reference criteria the definition does not have. */
export function pruneResponses(
  definition: ScorecardDefinition,
  responses: Responses,
): Responses {
  const known = new Set(definition.dimensions.flatMap((d) => d.criteria.map((c) => c.id)));
  return Object.fromEntries(Object.entries(responses).filter(([k]) => known.has(k)));
}
