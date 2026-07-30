import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  isStepComplete,
  progressOf,
  validateAll,
  validateStep,
  type WizardState,
} from "@/lib/studio-wizard";

const complete: WizardState = {
  opportunity: { title: "Claims triage", problemStatement: "Manual triage is slow." },
  businessContext: { businessFunction: "Claims", currentState: "12 day cycle time." },
  solution: { proposedSolution: "Classify inbound claims and route them." },
  dataTechnology: { dataSources: ["Claims system"] },
  stakeholders: { stakeholders: ["Head of Claims"], ownerName: "A. Owner" },
  value: { expectedBenefits: ["Faster settlement"], kpis: ["Cycle time"] },
  feasibility: { complexity: "Medium", timeToValue: "3–6 months" },
  risk: { riskLevel: "Medium", risks: ["Model drift"] },
  recommendation: { recommendation: "Proceed to pilot", nextAction: "Book a design workshop." },
};

describe("studio wizard", () => {
  it("covers all nine design steps", () => {
    expect(WIZARD_STEPS).toHaveLength(9);
  });

  it("flags each missing required field with a specific message", () => {
    const issues = validateStep({}, "opportunity");
    expect(issues.map((i) => i.key)).toEqual(["title", "problemStatement"]);
    expect(issues[0].message).toContain("Use case name");
  });

  it("requires at least one entry for required list fields", () => {
    const issues = validateStep({ dataTechnology: { dataSources: [] } }, "dataTechnology");
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("at least 1");
  });

  it("treats advanced fields as optional", () => {
    expect(isStepComplete(complete, "businessContext")).toBe(true);
  });

  it("reports progress and passes full validation when every step is answered", () => {
    expect(progressOf(complete)).toBe(100);
    expect(validateAll(complete)).toEqual([]);
  });

  it("reports partial progress without throwing on unknown steps", () => {
    expect(progressOf({ opportunity: complete.opportunity })).toBe(11);
    expect(validateStep(complete, "nope")).toEqual([]);
  });
});
