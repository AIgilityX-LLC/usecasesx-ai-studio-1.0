import { describe, expect, test } from "bun:test";
import {
  applyScenarioScores,
  DEFAULT_SCENARIO_WEIGHTS,
  DEPENDENCY_TYPES,
  detectMapConcentration,
  detectPortfolioInsights,
  emptyScenarioDraft,
  toDependencyEdges,
  type PortfolioDependency,
} from "@/lib/portfolio/dependencies-scenarios";

describe("dependency catalogue", () => {
  test("covers FR-09 dependency types", () => {
    expect(DEPENDENCY_TYPES).toEqual([
      "data",
      "model",
      "vendor",
      "platform",
      "integration",
      "policy",
      "skills",
      "prerequisite_use_case",
    ]);
  });

  test("toDependencyEdges builds accessible adjacency", () => {
    const deps: PortfolioDependency[] = [
      {
        id: "1",
        portfolioId: "p",
        fromUseCaseId: "a",
        dependencyType: "vendor",
        toUseCaseId: null,
        label: "Acme LLM",
        notes: null,
      },
      {
        id: "2",
        portfolioId: "p",
        fromUseCaseId: "b",
        dependencyType: "prerequisite_use_case",
        toUseCaseId: "a",
        label: "Case A",
        notes: null,
      },
    ];
    const edges = toDependencyEdges(deps, { a: "Case A", b: "Case B" });
    expect(edges).toHaveLength(2);
    expect(edges[0]!.toLabel).toBe("Acme LLM");
    expect(edges[1]!.fromLabel).toBe("Case B");
    expect(edges[1]!.toLabel).toBe("Case A");
  });
});

describe("scenarios do not mutate baseline weights", () => {
  test("equal weights match baseline; skewed weights change ranking", () => {
    const entries = [
      {
        useCaseId: "1",
        title: "High value hard",
        valuePotential: "high",
        complexity: "high",
        riskLevel: "medium",
        timeToValue: "later",
      },
      {
        useCaseId: "2",
        title: "Modest easy",
        valuePotential: "low",
        complexity: "low",
        riskLevel: "low",
        timeToValue: "now",
      },
    ];
    const base = applyScenarioScores(entries, DEFAULT_SCENARIO_WEIGHTS);
    const valueHeavy = applyScenarioScores(entries, {
      ...DEFAULT_SCENARIO_WEIGHTS,
      value: 5,
      feasibility: 0.5,
    });
    expect(base[0]!.baselineScore).toBe(base[0]!.scenarioScore);
    expect(emptyScenarioDraft().weights).toEqual(DEFAULT_SCENARIO_WEIGHTS);
    // Value-heavy should prefer entry 1 higher relative to feasibility-heavy
    const valueRank = valueHeavy.findIndex((r) => r.useCaseId === "1");
    const baseRank = base.findIndex((r) => r.useCaseId === "1");
    expect(valueRank).toBeLessThanOrEqual(baseRank);
  });
});

describe("explainable insights", () => {
  test("detects duplicates, shared enablers and no-regret", () => {
    const insights = detectPortfolioInsights({
      entries: [
        {
          useCaseId: "a",
          title: "Claims Intake",
          valuePotential: "high",
          complexity: "low",
          riskLevel: "low",
          functionName: "Ops",
        },
        {
          useCaseId: "b",
          title: "Claims Intake",
          valuePotential: "medium",
          complexity: "medium",
          riskLevel: "medium",
          functionName: "Ops",
        },
        {
          useCaseId: "c",
          title: "Other",
          valuePotential: "low",
          complexity: "high",
          riskLevel: "high",
          functionName: "Ops",
        },
        {
          useCaseId: "d",
          title: "Finance bot",
          valuePotential: "medium",
          complexity: "medium",
          riskLevel: "low",
          functionName: "Ops",
        },
      ],
      dependencies: [
        {
          id: "1",
          portfolioId: "p",
          fromUseCaseId: "b",
          dependencyType: "data",
          toUseCaseId: "a",
          label: "Case A",
          notes: null,
        },
        {
          id: "2",
          portfolioId: "p",
          fromUseCaseId: "c",
          dependencyType: "data",
          toUseCaseId: "a",
          label: "Case A",
          notes: null,
        },
      ],
    });
    expect(insights.some((i) => i.kind === "duplicate")).toBe(true);
    expect(insights.some((i) => i.kind === "shared_enabler")).toBe(true);
    expect(insights.some((i) => i.kind === "no_regret")).toBe(true);
    expect(insights.some((i) => i.kind === "concentration")).toBe(true);
  });

  test("map concentration uses filtered set", () => {
    const insights = detectMapConcentration([
      { id: "1", title: "A", orgUnitName: "X", strategicThemeName: "Citizen" },
      { id: "2", title: "B", orgUnitName: "X", strategicThemeName: "Citizen" },
      { id: "3", title: "C", orgUnitName: "Y", strategicThemeName: "Citizen" },
      { id: "4", title: "D", orgUnitName: "Y", strategicThemeName: "Ops" },
    ]);
    expect(insights.some((i) => i.kind === "concentration")).toBe(true);
  });
});
