import { describe, expect, it } from "vitest";

import {
  NARRATIVE_BLOCKED_MESSAGE,
  buildGuardedNarrative,
  buildNarrativeCitations,
  buildNarrativeGaps,
  buildPortfolioReport,
  type ReportItemInput,
} from "@/lib/reports/report-model";
import type { UseCaseContent } from "@/lib/domain/saved-use-cases.repository";
import type { PortfolioEntry } from "@/lib/portfolio-model";
import type { ScoreDimensions } from "@/lib/usecasex.store";
import type { Benefit } from "@/lib/value/benefits.model";

function content(overrides: Partial<UseCaseContent> = {}): UseCaseContent {
  return {
    slug: "demand-forecasting",
    title: "Demand forecasting",
    summary: "Forecast demand across regions.",
    valuePotential: "High",
    complexity: "Medium",
    riskLevel: "Low",
    timeToValue: "3–6 months",
    maturityLevel: "Pilot",
    maturity: "Pilot",
    industry: { slug: "retail", name: "Retail" },
    businessFunction: "Supply chain",
    aiCapability: "Forecasting",
    ...overrides,
  };
}

function score(): ScoreDimensions {
  return {
    strategicAlignment: 80,
    valuePotential: 80,
    feasibility: 80,
    timeToValue: 80,
    riskManageability: 80,
    governanceReadiness: 80,
  };
}

function entry(overrides: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    useCaseId: "uc-1",
    useCaseSlug: "demand-forecasting",
    rank: 1,
    decision: "approved",
    fundingState: "funded",
    deliveryStage: "in_delivery",
    dependsOn: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PortfolioEntry;
}

function benefit(overrides: Partial<Benefit> = {}): Benefit {
  return {
    id: "b-1",
    useCaseId: "studio-1",
    name: "Stock-out reduction",
    category: "cost_reduction",
    kpi: "Stock-outs per month",
    unitType: "currency",
    currency: "USD",
    period: "annual",
    baselineValue: 100,
    targetValue: 60,
    expectedValue: 40000,
    confidence: "medium",
    measurementFrequency: "monthly",
    benefitOwner: "Ops director",
    evidenceSource: null,
    evidenceLinks: [],
    state: "proposed",
    verificationMethod: "manual",
    erpVerificationStatus: "not_configured",
    erpSystem: null,
    erpReference: null,
    erpLastVerifiedAt: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const meta = { organization: "Acme" };

describe("narrative provenance guard", () => {
  it("blocks the narrative when nothing is selected", () => {
    const result = buildGuardedNarrative(buildPortfolioReport([], null), [], meta);
    expect(result.status).toBe("blocked");
    expect(result.text).toBe(NARRATIVE_BLOCKED_MESSAGE);
  });

  it("blocks when only repository content exists with no score, decision or value", () => {
    const items: ReportItemInput[] = [{ useCaseId: "uc-1", content: content() }];
    const result = buildGuardedNarrative(buildPortfolioReport(items, null), items, meta);
    expect(result.status).toBe("blocked");
    expect(result.text).toBe(NARRATIVE_BLOCKED_MESSAGE);
    expect(result).toMatchObject({ reason: expect.stringContaining("No score") });
  });

  it("allows the narrative as soon as one citable record backs the selection", () => {
    const items: ReportItemInput[] = [
      { useCaseId: "uc-1", content: content(), score: score() },
      { useCaseId: "uc-2", content: content({ slug: "chat-support", title: "Chat support" }) },
    ];
    const result = buildGuardedNarrative(buildPortfolioReport(items, null), items, meta);
    expect(result.status).toBe("ok");
    expect(result.text.startsWith("Acme has 2 AI use cases")).toBe(true);
  });

  it("renders every missing record as an explicit gap naming its provenance", () => {
    const items: ReportItemInput[] = [
      { useCaseId: "uc-1", content: content(), score: score() },
      { useCaseId: "uc-2", content: content({ slug: "chat-support", title: "Chat support" }) },
    ];
    const report = buildPortfolioReport(items, null);
    const gaps = buildNarrativeGaps(report);
    expect(gaps.every((g) => g.startsWith("Gap — "))).toBe(true);
    expect(gaps.some((g) => g.includes("no saved score") && g.includes("Your scoring"))).toBe(true);
    expect(gaps.some((g) => g.includes("studio value register"))).toBe(true);
    expect(gaps.some((g) => g.includes("no delivery owner"))).toBe(true);
    expect(gaps.some((g) => g.includes("no recorded next action"))).toBe(true);
    // The gaps are appended to the paragraph, never silently dropped.
    const guarded = buildGuardedNarrative(report, items, meta);
    for (const gap of gaps) expect(guarded.text).toContain(gap);
  });

  it("states no gap for a fully recorded use case", () => {
    const items: ReportItemInput[] = [
      {
        useCaseId: "uc-1",
        content: content(),
        score: score(),
        entry: entry({ deliveryOwner: "A. Rahman", nextAction: "Sign off data access" }),
        benefits: [benefit({ state: "verified" })],
      },
    ];
    const report = buildPortfolioReport(items, null);
    expect(buildNarrativeGaps(report)).toEqual([]);
    expect(buildGuardedNarrative(report, items, meta).status).toBe("ok");
  });

  it("lists the citations behind each row of the roll-up", () => {
    const items: ReportItemInput[] = [
      {
        useCaseId: "uc-1",
        content: content(),
        score: score(),
        entry: entry(),
        benefits: [benefit()],
      },
      { useCaseId: "uc-2", content: content({ slug: "chat-support", title: "Chat support" }) },
    ];
    const citations = buildNarrativeCitations(buildPortfolioReport(items, null), items);
    expect(citations[0]!.sources).toEqual(["repository", "score", "portfolio", "studio_value"]);
    expect(citations[1]!.sources).toEqual(["repository"]);
  });
});
