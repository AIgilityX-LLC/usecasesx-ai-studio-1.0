/**
 * Report model — pure builders for the executive use case report and the
 * portfolio report.
 *
 * Design rules that the reports depend on:
 *
 *  • Every figure in a report is either read straight from a workspace record
 *    or derived by a function in this file from those records. Nothing is
 *    invented, estimated or filled in with sample data, so a report always
 *    reconciles with the Repository, Studio, scoring and portfolio surfaces it
 *    was generated from.
 *  • Missing data stays missing. A field with no stored value renders as an
 *    explicit gap, never as a plausible-looking default.
 *  • Every block carries a provenance label so a reader can tell an authored
 *    record from a derived roll-up from a generated narrative.
 *
 * Everything here is framework-free and unit tested.
 */

import type { UseCaseContent } from "@/lib/domain/saved-use-cases.repository";
import type { PortfolioEntry } from "@/lib/portfolio-model";
import {
  DELIVERY_STAGE_LABELS,
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISION_LABELS,
} from "@/lib/portfolio-model";
import {
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_PERIOD_LABELS,
  BENEFIT_STATE_LABELS,
  BENEFIT_UNIT_LABELS,
  EVIDENCED_STATES,
  ERP_VERIFICATION_LABELS,
  type Benefit,
} from "@/lib/value/benefits.model";
import {
  computeTotalScore,
  interpretScore,
  SCORE_LABELS,
  type Portfolio,
  type ScoreDimensions,
} from "@/lib/usecasex.store";

/* ------------------------------------------------------------------ sources */

/** Where a block of a report came from. Rendered next to every section. */
export type ProvenanceSource =
  | "repository"
  | "score"
  | "portfolio"
  | "studio_value"
  | "derived"
  | "narrative";

export const PROVENANCE_LABELS: Record<ProvenanceSource, string> = {
  repository: "Repository record",
  score: "Your scoring",
  portfolio: "Portfolio decision record",
  studio_value: "Studio value register",
  derived: "Derived from the records in this report",
  narrative: "Generated narrative — review before sharing",
};

export const PROVENANCE_HELP: Record<ProvenanceSource, string> = {
  repository: "Published use case content from the UseCasesX™ repository.",
  score: "The six-dimension score you saved for this use case.",
  portfolio: "Decision, funding and delivery fields recorded on the portfolio item.",
  studio_value: "Benefits captured against the linked AI Use Case Studio™ draft.",
  derived: "Counts and roll-ups calculated from the records listed in this report.",
  narrative: "Assembled from the counts above. It adds no facts of its own and is editable.",
};

/* ------------------------------------------------------------------- inputs */

export interface ReportItemInput {
  /** Stable repository id for the use case. Present once the slug resolves. */
  useCaseId?: string | null;
  /** Stable id of the linked Studio draft, when the lineage resolves. */
  studioUseCaseId?: string | null;
  content: UseCaseContent;
  score?: ScoreDimensions | undefined;
  note?: string | undefined;
  priority?: string | undefined;
  /** Portfolio decision record, when the report is scoped to a portfolio. */
  entry?: PortfolioEntry | undefined;
  benefits?: Benefit[];
}

export interface ReportMeta {
  organization: string | null;
  author: string | null;
  authorRole: string | null;
  /** ISO timestamp the report was generated. */
  generatedAt: string;
  workspaceLabel?: string | null;
}

/* ------------------------------------------------------------------ helpers */

const EM_DASH = "—";

export function orGap(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : EM_DASH;
}

export function isGap(value: string | null | undefined): boolean {
  return (value ?? "").trim().length === 0;
}

function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isHighRisk(content: UseCaseContent): boolean {
  const level = (content.riskLevel ?? "").toLowerCase();
  return level === "high" || level === "critical";
}

/* ------------------------------------------------- per-use-case report model */

export interface ReportField {
  label: string;
  value: string;
  source: ProvenanceSource;
}

export interface UseCaseReport {
  slug: string;
  useCaseId: string | null;
  studioUseCaseId: string | null;
  title: string;
  /** Context — where the use case sits in the organization. */
  context: ReportField[];
  /** Opportunity — the business problem and its qualifiers. */
  opportunity: ReportField[];
  /** Solution — the AI approach and its maturity. */
  solution: ReportField[];
  /** Six-dimension score plus the composite, or null when never scored. */
  score: {
    dimensions: Array<{ key: keyof ScoreDimensions; label: string; value: number }>;
    total: number;
    interpretation: string;
  } | null;
  /** Value register rows for this use case. */
  value: {
    benefits: Benefit[];
    evidencedCount: number;
    ownerGaps: number;
  };
  /** Feasibility read from the score dimension plus the repository qualifiers. */
  feasibility: ReportField[];
  risks: ReportField[];
  owner: ReportField[];
  roadmap: ReportField[];
  nextAction: string | null;
  /** Every gap the report could not fill from stored data. */
  gaps: string[];
}

export function buildUseCaseReport(item: ReportItemInput): UseCaseReport {
  const { content, score, entry, note, priority } = item;
  const benefits = item.benefits ?? [];
  const gaps: string[] = [];

  const context: ReportField[] = [
    { label: "Industry", value: orGap(content.industry?.name), source: "repository" },
    { label: "Business function", value: orGap(content.businessFunction), source: "repository" },
    { label: "AI capability", value: orGap(content.aiCapability), source: "repository" },
    {
      label: "Maturity",
      value: orGap(content.maturityLevel ?? content.maturity),
      source: "repository",
    },
  ];

  const opportunity: ReportField[] = [
    { label: "Summary", value: orGap(content.summary), source: "repository" },
    { label: "Value potential", value: orGap(content.valuePotential), source: "repository" },
    { label: "Time to value", value: orGap(content.timeToValue), source: "repository" },
    { label: "Your priority", value: orGap(priority), source: "score" },
  ];
  if (note && note.trim()) {
    opportunity.push({ label: "Your note", value: note.trim(), source: "score" });
  }

  const solution: ReportField[] = [
    { label: "AI capability", value: orGap(content.aiCapability), source: "repository" },
    { label: "Complexity", value: orGap(content.complexity), source: "repository" },
    {
      label: "Delivery stage",
      value: entry ? (DELIVERY_STAGE_LABELS[entry.deliveryStage] ?? entry.deliveryStage) : EM_DASH,
      source: "portfolio",
    },
  ];

  const total = score ? computeTotalScore(score) : 0;
  const scoreBlock = score
    ? {
        dimensions: (Object.keys(SCORE_LABELS) as Array<keyof ScoreDimensions>).map((key) => ({
          key,
          label: SCORE_LABELS[key],
          value: score[key],
        })),
        total,
        interpretation: interpretScore(total).label,
      }
    : null;
  if (!scoreBlock) gaps.push("No score recorded — the composite score and priority band are blank.");

  const feasibility: ReportField[] = [
    {
      label: "Feasibility score",
      value: score ? `${score.feasibility}/100` : EM_DASH,
      source: "score",
    },
    {
      label: "Governance readiness",
      value: score ? `${score.governanceReadiness}/100` : EM_DASH,
      source: "score",
    },
    { label: "Complexity", value: orGap(content.complexity), source: "repository" },
    { label: "Time to value", value: orGap(content.timeToValue), source: "repository" },
  ];

  const risks: ReportField[] = [
    { label: "Risk level", value: orGap(content.riskLevel), source: "repository" },
    {
      label: "Risk manageability",
      value: score ? `${score.riskManageability}/100` : EM_DASH,
      source: "score",
    },
    {
      label: "Blocker",
      value: entry ? orGap(entry.blockedReason) : EM_DASH,
      source: "portfolio",
    },
  ];
  if (isHighRisk(content)) {
    gaps.push(`Risk level is ${content.riskLevel} — governance review required before delivery.`);
  }

  const ownerName = entry?.deliveryOwner ?? entry?.ownerName ?? null;
  const owner: ReportField[] = [
    { label: "Delivery owner", value: orGap(ownerName), source: "portfolio" },
    {
      label: "Decision",
      value: entry
        ? (PORTFOLIO_ITEM_DECISION_LABELS[entry.decision] ?? entry.decision)
        : EM_DASH,
      source: "portfolio",
    },
    {
      label: "Funding",
      value: entry ? (FUNDING_STATE_LABELS[entry.fundingState] ?? entry.fundingState) : EM_DASH,
      source: "portfolio",
    },
    {
      label: "Last reviewed",
      value: entry?.lastReviewedAt ? entry.lastReviewedAt.slice(0, 10) : EM_DASH,
      source: "portfolio",
    },
  ];
  if (entry && isGap(ownerName)) gaps.push("No delivery owner named on the portfolio item.");

  const roadmap: ReportField[] = [
    { label: "Target period", value: entry ? orGap(entry.targetPeriod) : EM_DASH, source: "portfolio" },
    {
      label: "Planned start",
      value: entry ? orGap(entry.plannedStartDate) : EM_DASH,
      source: "portfolio",
    },
    {
      label: "Planned end",
      value: entry ? orGap(entry.plannedEndDate) : EM_DASH,
      source: "portfolio",
    },
    { label: "Milestone", value: entry ? orGap(entry.milestone) : EM_DASH, source: "portfolio" },
    {
      label: "Depends on",
      value: entry && entry.dependsOn.length > 0 ? String(entry.dependsOn.length) : EM_DASH,
      source: "portfolio",
    },
  ];

  const evidencedCount = benefits.filter((b) => EVIDENCED_STATES.includes(b.state)).length;
  const ownerGaps = benefits.filter((b) => isGap(b.benefitOwner)).length;
  if (benefits.length === 0) {
    gaps.push("No benefits captured in the Studio value register — value is unquantified.");
  }

  const nextAction = entry?.nextAction?.trim() ? entry.nextAction.trim() : null;
  if (entry && !nextAction) gaps.push("No next action recorded on the portfolio item.");

  return {
    slug: content.slug,
    useCaseId: item.useCaseId ?? null,
    studioUseCaseId: item.studioUseCaseId ?? null,
    title: content.title,
    context,
    opportunity,
    solution,
    score: scoreBlock,
    value: { benefits, evidencedCount, ownerGaps },
    feasibility,
    risks,
    owner,
    roadmap,
    nextAction,
    gaps,
  };
}

/* -------------------------------------------------- portfolio report model */

export interface PriorityBand {
  key: "quick_win" | "candidate" | "readiness" | "low";
  label: string;
  range: string;
  slugs: string[];
  titles: string[];
}

export interface PortfolioReport {
  portfolio: Portfolio | null;
  reports: UseCaseReport[];
  totals: {
    useCases: number;
    scored: number;
    averageScore: number | null;
    highRisk: number;
    blocked: number;
    withOwner: number;
    withNextAction: number;
    benefits: number;
    evidencedBenefits: number;
  };
  bands: PriorityBand[];
  /** Highest-conviction items: scored, ranked, decision-approved first. */
  shortlist: Array<{ slug: string; title: string; total: number | null; decision: string }>;
  roadmap: Array<{
    slug: string;
    title: string;
    stage: string;
    targetPeriod: string;
    owner: string;
    milestone: string;
    nextAction: string;
  }>;
  gaps: Array<{ slug: string; title: string; issues: string[] }>;
  recommendations: string[];
}

const BAND_DEFS: Array<{ key: PriorityBand["key"]; label: string; range: string; min: number; max: number }> =
  [
    { key: "quick_win", label: "Quick wins / strategic", range: "80–100", min: 80, max: 101 },
    { key: "candidate", label: "Strong candidate — plan", range: "60–79", min: 60, max: 80 },
    { key: "readiness", label: "Readiness improvement", range: "40–59", min: 40, max: 60 },
    { key: "low", label: "Low priority / not ready", range: "0–39", min: 0, max: 40 },
  ];

export function buildPortfolioReport(
  items: ReportItemInput[],
  portfolio: Portfolio | null,
): PortfolioReport {
  const reports = items.map(buildUseCaseReport);

  const scored = reports.filter((r) => r.score !== null);
  const averageScore = scored.length
    ? Math.round(scored.reduce((acc, r) => acc + (r.score?.total ?? 0), 0) / scored.length)
    : null;

  const bands: PriorityBand[] = BAND_DEFS.map((def) => {
    const matched = scored.filter(
      (r) => (r.score?.total ?? -1) >= def.min && (r.score?.total ?? -1) < def.max,
    );
    return {
      key: def.key,
      label: def.label,
      range: def.range,
      slugs: matched.map((r) => r.slug),
      titles: matched.map((r) => r.title),
    };
  });

  const byIndex = new Map(items.map((item) => [item.content.slug, item]));

  const shortlist = [...reports]
    .sort((a, b) => {
      const rankA = byIndex.get(a.slug)?.entry?.rank;
      const rankB = byIndex.get(b.slug)?.entry?.rank;
      if (rankA != null && rankB != null && rankA !== rankB) return rankA - rankB;
      if (rankA != null && rankB == null) return -1;
      if (rankB != null && rankA == null) return 1;
      return (b.score?.total ?? -1) - (a.score?.total ?? -1);
    })
    .slice(0, 10)
    .map((r) => {
      const entry = byIndex.get(r.slug)?.entry;
      return {
        slug: r.slug,
        title: r.title,
        total: r.score?.total ?? null,
        decision: entry
          ? (PORTFOLIO_ITEM_DECISION_LABELS[entry.decision] ?? entry.decision)
          : EM_DASH,
      };
    });

  const roadmap = reports
    .map((r) => {
      const entry = byIndex.get(r.slug)?.entry;
      if (!entry) return null;
      return {
        slug: r.slug,
        title: r.title,
        stage: DELIVERY_STAGE_LABELS[entry.deliveryStage] ?? entry.deliveryStage,
        targetPeriod: orGap(entry.targetPeriod),
        owner: orGap(entry.deliveryOwner ?? entry.ownerName),
        milestone: orGap(entry.milestone),
        nextAction: orGap(entry.nextAction),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const allBenefits = items.flatMap((i) => i.benefits ?? []);
  const totals = {
    useCases: reports.length,
    scored: scored.length,
    averageScore,
    highRisk: items.filter((i) => isHighRisk(i.content)).length,
    blocked: items.filter((i) => !isGap(i.entry?.blockedReason)).length,
    withOwner: items.filter((i) => !isGap(i.entry?.deliveryOwner ?? i.entry?.ownerName)).length,
    withNextAction: items.filter((i) => !isGap(i.entry?.nextAction)).length,
    benefits: allBenefits.length,
    evidencedBenefits: allBenefits.filter((b) => EVIDENCED_STATES.includes(b.state)).length,
  };

  const gaps = reports
    .filter((r) => r.gaps.length > 0)
    .map((r) => ({ slug: r.slug, title: r.title, issues: r.gaps }));

  return {
    portfolio,
    reports,
    totals,
    bands,
    shortlist,
    roadmap,
    gaps,
    recommendations: buildRecommendations(totals, bands, reports.length),
  };
}

/**
 * Deterministic recommendations. Each line is triggered by a counted condition
 * in this report — none of them assert anything the data does not show.
 */
export function buildRecommendations(
  totals: PortfolioReport["totals"],
  bands: PriorityBand[],
  itemCount: number,
): string[] {
  const out: string[] = [];
  const band = (key: PriorityBand["key"]) => bands.find((b) => b.key === key)?.slugs.length ?? 0;

  if (itemCount === 0) return ["Add scored use cases to this report to produce recommendations."];

  const quickWins = band("quick_win");
  if (quickWins > 0) {
    out.push(
      `Sequence ${pluralise(quickWins, "use case")} scoring 80 or above into the nearest delivery window.`,
    );
  }
  const readiness = band("readiness");
  if (readiness > 0) {
    out.push(
      `Run a readiness diagnostic on ${pluralise(readiness, "use case")} scoring 40–59 before committing funding.`,
    );
  }
  if (totals.scored < totals.useCases) {
    out.push(
      `Score the remaining ${pluralise(totals.useCases - totals.scored, "use case")} so the portfolio ranking is complete.`,
    );
  }
  if (totals.highRisk > 0) {
    out.push(
      `Route ${pluralise(totals.highRisk, "high or critical risk use case")} through governance review before delivery.`,
    );
  }
  if (totals.blocked > 0) {
    out.push(`Clear the recorded blocker on ${pluralise(totals.blocked, "item")}.`);
  }
  if (totals.useCases > 0 && totals.withOwner < totals.useCases) {
    out.push(
      `Name a delivery owner for ${pluralise(totals.useCases - totals.withOwner, "item")} that has none.`,
    );
  }
  if (totals.useCases > 0 && totals.withNextAction < totals.useCases) {
    out.push(
      `Record the next action for ${pluralise(totals.useCases - totals.withNextAction, "item")}.`,
    );
  }
  if (totals.benefits === 0) {
    out.push("Capture benefits in the Studio value register so this portfolio carries a value case.");
  } else if (totals.evidencedBenefits < totals.benefits) {
    out.push(
      `Move ${pluralise(totals.benefits - totals.evidencedBenefits, "benefit")} from owner-asserted to evidenced.`,
    );
  }
  return out;
}

/**
 * Executive narrative. Every clause restates a number computed above, so the
 * paragraph cannot drift from the tables it accompanies. It is presented as
 * editable generated text, never as an authored statement of fact.
 */
export function buildExecutiveNarrative(
  report: PortfolioReport,
  meta: Pick<ReportMeta, "organization">,
): string {
  const org = meta.organization?.trim() || "This workspace";
  const t = report.totals;
  if (t.useCases === 0) return `${org} has no use cases selected for this report.`;

  const sentences: string[] = [];
  sentences.push(
    `${org} has ${pluralise(t.useCases, "AI use case")} in scope for this report, of which ${t.scored} ${t.scored === 1 ? "has" : "have"} a recorded score.`,
  );
  if (t.averageScore !== null) {
    sentences.push(`The average composite score across scored items is ${t.averageScore} out of 100.`);
  }
  const quickWins = report.bands.find((b) => b.key === "quick_win")?.slugs.length ?? 0;
  const readiness = report.bands.find((b) => b.key === "readiness")?.slugs.length ?? 0;
  if (quickWins > 0 || readiness > 0) {
    sentences.push(
      `${quickWins} ${quickWins === 1 ? "item sits" : "items sit"} in the 80–100 band and ${readiness} in the 40–59 readiness band.`,
    );
  }
  if (t.highRisk > 0) {
    sentences.push(
      `${pluralise(t.highRisk, "item")} carries a high or critical repository risk level and needs governance review.`,
    );
  }
  if (t.benefits > 0) {
    sentences.push(
      `${pluralise(t.benefits, "benefit")} ${t.benefits === 1 ? "is" : "are"} recorded in the value register, ${t.evidencedBenefits} of which ${t.evidencedBenefits === 1 ? "is" : "are"} evidenced.`,
    );
  } else {
    sentences.push("No benefits have been captured yet, so this report states no financial value.");
  }
  return sentences.join(" ");
}

/* ---------------------------------------------------------------------- CSV */

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Documented, stable CSV contract for the use case report.
 *
 * Column keys never change or get reordered — downstream spreadsheets and
 * finance systems bind to them. New columns are appended at the end.
 */
export const USE_CASE_CSV_COLUMNS = [
  { key: "use_case_id", label: "Use case ID", help: "Stable repository identifier." },
  { key: "slug", label: "Slug", help: "Stable repository slug." },
  { key: "studio_use_case_id", label: "Studio ID", help: "Linked Studio draft identifier." },
  { key: "title", label: "Title", help: "Repository title." },
  { key: "industry", label: "Industry", help: "Repository classification." },
  { key: "business_function", label: "Business function", help: "Repository classification." },
  { key: "ai_capability", label: "AI capability", help: "Repository classification." },
  { key: "value_potential", label: "Value potential", help: "Repository qualifier." },
  { key: "complexity", label: "Complexity", help: "Repository qualifier." },
  { key: "risk_level", label: "Risk level", help: "Repository qualifier." },
  { key: "time_to_value", label: "Time to value", help: "Repository qualifier." },
  { key: "score_strategic", label: "Strategic alignment", help: "Your score, 0–100." },
  { key: "score_value", label: "Value potential score", help: "Your score, 0–100." },
  { key: "score_feasibility", label: "Feasibility score", help: "Your score, 0–100." },
  { key: "score_ttv", label: "Time to value score", help: "Your score, 0–100." },
  { key: "score_risk", label: "Risk manageability", help: "Your score, 0–100." },
  { key: "score_governance", label: "Governance readiness", help: "Your score, 0–100." },
  { key: "score_total", label: "Composite score", help: "Weighted composite, 0–100." },
  { key: "priority_band", label: "Priority band", help: "Derived from the composite score." },
  { key: "decision", label: "Decision", help: "Portfolio decision record." },
  { key: "funding_state", label: "Funding state", help: "Portfolio decision record." },
  { key: "delivery_stage", label: "Delivery stage", help: "Portfolio delivery record." },
  { key: "target_period", label: "Target period", help: "Portfolio delivery record." },
  { key: "planned_start", label: "Planned start", help: "Portfolio delivery record." },
  { key: "planned_end", label: "Planned end", help: "Portfolio delivery record." },
  { key: "milestone", label: "Milestone", help: "Portfolio delivery record." },
  { key: "owner", label: "Delivery owner", help: "Portfolio delivery record." },
  { key: "blocked_reason", label: "Blocker", help: "Portfolio delivery record." },
  { key: "next_action", label: "Next action", help: "Portfolio delivery record." },
  { key: "benefit_count", label: "Benefits", help: "Rows in the Studio value register." },
  { key: "benefits_evidenced", label: "Evidenced benefits", help: "Verified or sustained rows." },
  { key: "gaps", label: "Gaps", help: "Data gaps detected when the report was generated." },
] as const;

export type UseCaseCsvColumnKey = (typeof USE_CASE_CSV_COLUMNS)[number]["key"];

function bandFor(total: number | null | undefined): string {
  if (total == null) return "";
  const def = BAND_DEFS.find((b) => total >= b.min && total < b.max);
  return def ? `${def.range} ${def.label}` : "";
}

export function useCaseCsvRow(
  report: UseCaseReport,
  item: ReportItemInput,
): Record<UseCaseCsvColumnKey, string> {
  const c = item.content;
  const s = item.score;
  const e = item.entry;
  return {
    use_case_id: report.useCaseId ?? "",
    slug: report.slug,
    studio_use_case_id: report.studioUseCaseId ?? "",
    title: c.title,
    industry: c.industry?.name ?? "",
    business_function: c.businessFunction ?? "",
    ai_capability: c.aiCapability ?? "",
    value_potential: c.valuePotential ?? "",
    complexity: c.complexity ?? "",
    risk_level: c.riskLevel ?? "",
    time_to_value: c.timeToValue ?? "",
    score_strategic: s ? String(s.strategicAlignment) : "",
    score_value: s ? String(s.valuePotential) : "",
    score_feasibility: s ? String(s.feasibility) : "",
    score_ttv: s ? String(s.timeToValue) : "",
    score_risk: s ? String(s.riskManageability) : "",
    score_governance: s ? String(s.governanceReadiness) : "",
    score_total: report.score ? String(report.score.total) : "",
    priority_band: bandFor(report.score?.total ?? null),
    decision: e ? (PORTFOLIO_ITEM_DECISION_LABELS[e.decision] ?? e.decision) : "",
    funding_state: e ? (FUNDING_STATE_LABELS[e.fundingState] ?? e.fundingState) : "",
    delivery_stage: e ? (DELIVERY_STAGE_LABELS[e.deliveryStage] ?? e.deliveryStage) : "",
    target_period: e?.targetPeriod ?? "",
    planned_start: e?.plannedStartDate ?? "",
    planned_end: e?.plannedEndDate ?? "",
    milestone: e?.milestone ?? "",
    owner: e?.deliveryOwner ?? e?.ownerName ?? "",
    blocked_reason: e?.blockedReason ?? "",
    next_action: e?.nextAction ?? "",
    benefit_count: String(report.value.benefits.length),
    benefits_evidenced: String(report.value.evidencedCount),
    gaps: report.gaps.join(" | "),
  };
}

export function useCasesToCsv(items: ReportItemInput[]): string {
  const header = USE_CASE_CSV_COLUMNS.map((c) => toCsvCell(c.label)).join(",");
  const lines = items.map((item) => {
    const row = useCaseCsvRow(buildUseCaseReport(item), item);
    return USE_CASE_CSV_COLUMNS.map((c) => toCsvCell(row[c.key])).join(",");
  });
  return [header, ...lines].join("\r\n");
}

/** Stable benefit-level CSV, one row per benefit, keyed to the use case IDs. */
export const BENEFIT_CSV_COLUMNS = [
  { key: "use_case_id", label: "Use case ID" },
  { key: "slug", label: "Slug" },
  { key: "benefit_id", label: "Benefit ID" },
  { key: "name", label: "Benefit" },
  { key: "category", label: "Category" },
  { key: "unit_type", label: "Unit" },
  { key: "currency", label: "Currency" },
  { key: "period", label: "Period" },
  { key: "baseline_value", label: "Baseline" },
  { key: "target_value", label: "Target" },
  { key: "expected_value", label: "Expected" },
  { key: "confidence", label: "Confidence" },
  { key: "state", label: "State" },
  { key: "benefit_owner", label: "Benefit owner" },
  { key: "erp_verification", label: "ERP verification" },
  { key: "evidence_count", label: "Evidence items" },
] as const;

export function benefitsToCsv(items: ReportItemInput[]): string {
  const header = BENEFIT_CSV_COLUMNS.map((c) => toCsvCell(c.label)).join(",");
  const lines: string[] = [];
  for (const item of items) {
    for (const b of item.benefits ?? []) {
      lines.push(
        [
          item.useCaseId ?? "",
          item.content.slug,
          b.id,
          b.name,
          BENEFIT_CATEGORY_LABELS[b.category] ?? b.category,
          BENEFIT_UNIT_LABELS[b.unitType] ?? b.unitType,
          b.currency ?? "",
          BENEFIT_PERIOD_LABELS[b.period] ?? b.period,
          b.baselineValue ?? "",
          b.targetValue ?? "",
          b.expectedValue ?? "",
          b.confidence,
          BENEFIT_STATE_LABELS[b.state] ?? b.state,
          b.benefitOwner ?? "",
          ERP_VERIFICATION_LABELS[b.erpVerificationStatus] ?? b.erpVerificationStatus,
          String(b.evidenceLinks?.length ?? 0),
        ]
          .map(toCsvCell)
          .join(","),
      );
    }
  }
  return [header, ...lines].join("\r\n");
}

/** Filename with a stable, sortable prefix. */
export function reportFileName(kind: string, generatedAt = new Date()): string {
  const slug = kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `usecasex-${slug}-${generatedAt.toISOString().slice(0, 10)}`;
}
