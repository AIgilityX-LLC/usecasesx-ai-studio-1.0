import { describe, expect, test } from "bun:test";
import {
  completionOf,
  emptyDraft,
  formatSimilarityReason,
  isConvertible,
  keywordsOf,
  missingInformationPrompts,
  opportunityDraftSchema,
  QUICK_MODE_KEYS,
  similarityScore,
} from "@/lib/opportunities";

describe("opportunity intake V2 draft shape", () => {
  test("emptyDraft includes FR-02 fields", () => {
    const d = emptyDraft();
    expect(d.affectedUsers).toBe("");
    expect(d.sponsorName).toBe("");
    expect(d.geography).toBe("");
    expect(d.constraints).toBe("");
  });

  test("schema accepts guided fields and defaults missing ones", () => {
    const parsed = opportunityDraftSchema.parse({
      title: "Claims backlog",
      sponsorName: "COO",
      geography: "UAE",
      constraints: "No PII off-shore",
      affectedUsers: "Claims handlers",
    });
    expect(parsed.sponsorName).toBe("COO");
    expect(parsed.painPoint).toBe("");
  });

  test("quick mode keys stay a small essentials set", () => {
    expect(QUICK_MODE_KEYS).toContain("title");
    expect(QUICK_MODE_KEYS).toContain("painPoint");
    expect(QUICK_MODE_KEYS).not.toContain("geography");
  });
});

describe("missing-information prompts", () => {
  test("surfaces ordered prompts for empty guided fields", () => {
    const prompts = missingInformationPrompts(emptyDraft({ title: "X" }));
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.some((p) => p.key === "painPoint")).toBe(true);
    expect(prompts.every((p) => p.prompt.length > 10)).toBe(true);
  });

  test("omits filled fields", () => {
    const prompts = missingInformationPrompts(
      emptyDraft({
        title: "Claims backlog",
        painPoint: "Too slow",
        desiredOutcome: "Same day",
        baseline: "5 days",
        affectedUsers: "Handlers",
        urgency: "now",
        ownerName: "A",
        sponsorName: "B",
        process: "FNOL",
        businessFunction: "Ops",
        strategicObjective: "CX",
        geography: "UAE",
        constraints: "None",
        stakeholders: ["Legal"],
        evidence: [{ label: "KPI pack", url: null, note: null }],
      }),
    );
    expect(prompts).toEqual([]);
  });
});

describe("similarity scoring", () => {
  test("keywords drop stop words", () => {
    expect(keywordsOf("the claims and triage for our team")).toContain("claims");
    expect(keywordsOf("the claims and triage for our team")).not.toContain("the");
  });

  test("scores overlapping titles and explains the match", () => {
    const { score, matched } = similarityScore(
      "Claims triage backlog",
      "Claims triage automation",
    );
    expect(score).toBeGreaterThan(0.4);
    expect(matched).toContain("claims");
    expect(formatSimilarityReason(matched)).toMatch(/claims/i);
  });

  test("returns zero when there is no overlap", () => {
    expect(similarityScore("payroll forecasting", "fleet telematics").score).toBe(0);
  });
});

describe("completion and convertibility", () => {
  test("isConvertible requires pain and outcome", () => {
    expect(isConvertible(emptyDraft({ title: "Abc" }))).toBe(false);
    expect(
      isConvertible(
        emptyDraft({ title: "Abc", painPoint: "pain", desiredOutcome: "good" }),
      ),
    ).toBe(true);
  });

  test("completion percent rises as FR-02 fields fill", () => {
    const empty = completionOf(emptyDraft({ title: "Abc" }));
    const fuller = completionOf(
      emptyDraft({
        title: "Abc",
        painPoint: "p",
        desiredOutcome: "o",
        baseline: "b",
        sponsorName: "s",
      }),
    );
    expect(fuller.percent).toBeGreaterThan(empty.percent);
  });
});
