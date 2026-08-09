import { describe, expect, it } from "vitest";

import {
  buildExecutiveNarrative,
  buildPortfolioReport,
  buildUseCaseReport,
  buildUseCasesCsv,
  USE_CASE_CSV_COLUMNS,
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

function score(overrides: Partial<ScoreDimensions> = {}): ScoreDimensions {
  return {
    strategicAlignment: 80,
    valuePotential: 80,
    feasibility: 80,
    timeToValue: 80,
    riskManageability: 80,
    governanceReadiness: 80,
    ...overrides,
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

describe("buildUseCaseReport", () => {
  it("renders explicit gaps rather than inventing values", () => {
    const report = buildUseCaseReport({
      content: content({ businessFunction: null, timeToValue: null }),
    });
    const fn = report.context.find((f) => f.label === "Business function");
    expect(fn?.value).toBe("—");
    expect(report.score).toBeNull();
    expect(report.gaps).toContain(
      "No score recorded — the composite score and priority band are blank.",
    );
  });

  it("reads decision, owner and roadmap fields from the portfolio record", () => {
    const report = buildUseCaseReport({
      content: content(),
      score: score(),
      entry: entry({
        deliveryOwner: "A. Rahman",
        targetPeriod: "Q3 2026",
        milestone: "Pilot live",
        nextAction: "Sign off data access",
      }),
      benefits: [benefit()],
    });
    expect(report.owner.find((f) => f.label === "Delivery owner")?.value).toBe("A. Rahman");
    expect(report.roadmap.find((f) => f.label === "Target period")?.value).toBe("Q3 2026");
    expect(report.nextAction).toBe("Sign off data access");
    expect(report.score?.total).toBeGreaterThan(0);
    expect(report.gaps).toHaveLength(0);
  });

  it("flags high risk and missing value as gaps", () => {
    const report = buildUseCaseReport({
      content: content({ riskLevel: "High" }),
      score: score(),
      entry: entry({ nextAction: "Review" }),
    });
    expect(report.gaps.some((g) => g.includes("High"))).toBe(true);
    expect(report.gaps.some((g) => g.includes("value register"))).toBe(true);
  });
});

describe("buildPortfolioReport", () => {
  const items: ReportItemInput[] = [
    {
      useCaseId: "uc-1",
      content: content(),
      score: score(),
      entry: entry({ deliveryOwner: "A. Rahman", nextAction: "Kick off" }),
      benefits: [benefit(), benefit({ id: "b-2", state: "verified" })],
    },
    {
      useCaseId: "uc-2",
      content: content({ slug: "fraud-triage", title: "Fraud triage", riskLevel: "Critical" }),
      score: score({ strategicAlignment: 40, valuePotential: 40, feasibility: 40 }),
    },
    { useCaseId: "uc-3", content: content({ slug: "chat-support", title: "Chat support" }) },
  ];

  it("counts only what the records show", () => {
    const report = buildPortfolioReport(items, null);
    expect(report.totals.useCases).toBe(3);
    expect(report.totals.scored).toBe(2);
    expect(report.totals.highRisk).toBe(1);
    expect(report.totals.benefits).toBe(2);
    expect(report.totals.evidencedBenefits).toBe(1);
    expect(report.totals.withOwner).toBe(1);
  });

  it("bands only scored use cases and never places unscored items", () => {
    const report = buildPortfolioReport(items, null);
    const banded = report.bands.flatMap((b) => b.slugs);
    expect(banded).not.toContain("chat-support");
    expect(banded).toHaveLength(2);
  });

  it("derives recommendations from counted conditions", () => {
    const report = buildPortfolioReport(items, null);
    expect(report.recommendations.some((r) => r.includes("Score the remaining"))).toBe(true);
    expect(report.recommendations.some((r) => r.includes("governance review"))).toBe(true);
    expect(buildPortfolioReport([], null).recommendations).toEqual([
      "Add scored use cases to this report to produce recommendations.",
    ]);
  });

  it("narrates only figures present in the totals", () => {
    const report = buildPortfolioReport(items, null);
    const narrative = buildExecutiveNarrative(report, { organization: "Acme" });
    expect(narrative.startsWith("Acme has 3 AI use cases")).toBe(true);
    expect(narrative).toContain("2 benefits");
    expect(buildExecutiveNarrative(buildPortfolioReport([], null), { organization: null })).toBe(
      "This workspace has no use cases selected for this report.",
    );
  });

  it("exports a stable CSV contract with quoted values", () => {
    const csv = buildUseCasesCsv([
      {
        useCaseId: "uc-1",
        content: content({ summary: 'Has "quotes", and commas' }),
        score: score(),
      },
    ]);
    const [header, row] = csv.split("\r\n");
    expect(header?.split(",")).toHaveLength(USE_CASE_CSV_COLUMNS.length);
    expect(row?.split(",").length).toBeGreaterThanOrEqual(USE_CASE_CSV_COLUMNS.length);
    expect(csv).toContain("demand-forecasting");
  });
});
