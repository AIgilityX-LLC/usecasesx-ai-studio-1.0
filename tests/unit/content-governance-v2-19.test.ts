/**
 * V2-19 content governance + pattern template tests.
 */

import { describe, expect, it } from "bun:test";

import {
  assertContentTransition,
  canTransitionContent,
  EVIDENCE_CLASS_DISCLAIMER,
  looksLikeInventedOutcomeClaim,
  publishBlockingIssues,
  templateCoverageGaps,
  PATTERN_TEMPLATE_SEEDS,
} from "@/lib/content-governance";
import {
  validateUseCaseDraft,
  hasBlockingIssues,
} from "@/lib/admin/content-validation";

describe("V2-19 content workflow", () => {
  it("allows draft → review → approved → published → deprecated", () => {
    expect(canTransitionContent("draft", "submitted_for_review")).toBe(true);
    expect(canTransitionContent("submitted_for_review", "approved")).toBe(true);
    expect(canTransitionContent("approved", "published")).toBe(true);
    expect(canTransitionContent("published", "deprecated")).toBe(true);
    expect(canTransitionContent("draft", "published")).toBe(false);
    expect(() => assertContentTransition("archived", "published")).toThrow(/cannot move/);
  });

  it("blocks publish without owner / review / license", () => {
    const issues = publishBlockingIssues({
      evidenceClass: "example",
      contentOwnerName: null,
      lastReviewedAt: null,
      licenseUsageNote: null,
    });
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it("requires provenance URL for verified case studies", () => {
    const issues = publishBlockingIssues({
      evidenceClass: "verified_case_study",
      provenanceUrl: null,
      contentOwnerName: "Editor",
      lastReviewedAt: "2026-09-24T00:00:00.000Z",
      licenseUsageNote: "Internal use",
      qualityStatus: "reviewed",
    });
    expect(issues.some((i) => /provenance URL/i.test(i))).toBe(true);
  });
});

describe("V2-19 honesty guards", () => {
  it("flags invented ROI / client claims", () => {
    expect(looksLikeInventedOutcomeClaim("Reduced cost by 37% ROI")).toBe(true);
    expect(looksLikeInventedOutcomeClaim("Saved $2M for client Acme")).toBe(true);
    expect(looksLikeInventedOutcomeClaim("Metric categories: cycle time")).toBe(false);
  });

  it("covers every modality × sector template exactly once", () => {
    expect(templateCoverageGaps()).toEqual([]);
    expect(PATTERN_TEMPLATE_SEEDS).toHaveLength(30);
    for (const t of PATTERN_TEMPLATE_SEEDS) {
      expect(looksLikeInventedOutcomeClaim(t.summary)).toBe(false);
      expect(looksLikeInventedOutcomeClaim(t.businessProblem)).toBe(false);
      expect(t.kpiCategories.length).toBeGreaterThan(0);
    }
  });

  it("exposes disclaimers for each evidence class", () => {
    expect(EVIDENCE_CLASS_DISCLAIMER.example.toLowerCase()).toContain("illustrative");
    expect(EVIDENCE_CLASS_DISCLAIMER.verified_case_study.toLowerCase()).toContain("attributable");
    expect(EVIDENCE_CLASS_DISCLAIMER.pattern_template.toLowerCase()).toContain("no client");
  });
});

describe("V2-19 publish validation", () => {
  it("requires governance fields for published target", () => {
    const issues = validateUseCaseDraft(
      {
        title: "Valid title here",
        slug: "valid-title-here",
        summary: "A summary that is long enough to pass the soft warning threshold easily.",
        businessProblem: "Problem",
        aiSolution: "Solution",
        industry: "Public",
        businessFunction: "Ops",
        aiType: "GenAI",
        valuePotential: "Medium",
        complexity: "Medium",
        riskLevel: "Medium",
        provenance: "aigilityx_editorial",
        qualityStatus: "reviewed",
        evidenceClass: "example",
      },
      "published",
    );
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => i.field === "licenseUsageNote")).toBe(true);
  });
});
