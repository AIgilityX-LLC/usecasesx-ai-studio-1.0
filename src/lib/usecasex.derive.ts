/**
 * Derived, schema-free classifications used across Browse, Detail and Portfolio.
 * These compute market segment, priority quadrant and ROI range from existing
 * use-case fields so no extra columns are required for them.
 */
import { SEGMENTS } from "@/lib/segments";

type LevelLike = string | null | undefined;

const LOW = new Set(["low", "beginner", "short"]);
const HIGH = new Set(["high", "critical", "advanced", "long"]);

function level(v: LevelLike): "low" | "medium" | "high" {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (HIGH.has(s)) return "high";
  if (LOW.has(s)) return "low";
  return "medium";
}

/** Priority quadrant from value potential (impact) and complexity (effort). */
export function derivePriority(c: {
  value_potential?: LevelLike;
  impact_score?: number | null;
  complexity?: LevelLike;
  effort_score?: number | null;
}): "Quick Win" | "Strategic Bet" | "Easy Extra" | "Moonshot" {
  const value =
    typeof c.impact_score === "number"
      ? c.impact_score >= 66 ? "high" : c.impact_score >= 34 ? "medium" : "low"
      : level(c.value_potential);
  const complexity = level(c.complexity);
  const highValue = value === "high" || value === "medium";
  const highComplexity = complexity === "high";
  if (highValue && !highComplexity) return "Quick Win";
  if (highValue && highComplexity) return "Strategic Bet";
  if (!highValue && !highComplexity) return "Easy Extra";
  return "Moonshot";
}

/** ROI band from value potential (or impact score fallback). */
export function deriveRoiRange(c: {
  value_potential?: LevelLike;
  impact_score?: number | null;
}): "high" | "medium" | "low" {
  if (typeof c.impact_score === "number") {
    return c.impact_score >= 66 ? "high" : c.impact_score >= 34 ? "medium" : "low";
  }
  return level(c.value_potential);
}

export const ROI_RANGE_LABEL: Record<string, string> = {
  high: "High ROI",
  medium: "Medium ROI",
  low: "Emerging ROI",
};

/** Market segment slugs a use case belongs to, from its industry slugs. */
export function segmentsForIndustries(industrySlugs: string[]): string[] {
  const set = new Set(industrySlugs);
  return SEGMENTS.filter((seg) => seg.industries.some((i) => set.has(i))).map((s) => s.slug);
}

/** Extract industry slugs from a listUseCases row shape. */
export function industrySlugsOf(row: Record<string, unknown>): string[] {
  const rel = (row.use_case_industries as Array<{ industries?: { slug?: string } }> | undefined) ?? [];
  return rel.map((x) => x.industries?.slug).filter((s): s is string => Boolean(s));
}
