import { describe, expect, it } from "vitest";
import {
  hasBlockingIssues,
  isDuplicateSlug,
  nextAvailableSlug,
  slugify,
  validateUseCaseDraft,
} from "@/lib/admin/content-validation";
import { buildImportPlan, parseCsv, summarizeOutcomes } from "@/lib/admin/csv-import";

describe("content validation", () => {
  it("slugifies titles safely", () => {
    expect(slugify("Prédictive Demand — Forecasting!")).toBe("predictive-demand-forecasting");
  });

  it("accepts a minimal draft but blocks publishing", () => {
    const draft = {
      title: "Predictive demand forecasting",
      slug: "predictive-demand-forecasting",
      summary: "Forecast SKU-level demand to cut stockouts and markdowns across the network.",
    };
    expect(hasBlockingIssues(validateUseCaseDraft(draft, "draft"))).toBe(false);
    expect(hasBlockingIssues(validateUseCaseDraft(draft, "review"))).toBe(true);
    expect(hasBlockingIssues(validateUseCaseDraft(draft, "published"))).toBe(true);
  });

  it("rejects malformed slugs", () => {
    const issues = validateUseCaseDraft({ title: "Valid title", slug: "Bad Slug", summary: "x" });
    expect(issues.some((i) => i.field === "slug" && i.severity === "error")).toBe(true);
  });

  it("detects duplicate slugs owned by another record", () => {
    const existing = { foo: "id-1" };
    expect(isDuplicateSlug("foo", existing, "id-1")).toBe(false);
    expect(isDuplicateSlug("foo", existing, "id-2")).toBe(true);
    expect(nextAvailableSlug("foo", existing)).toBe("foo-2");
  });
});

describe("csv import planning", () => {
  const header =
    "title,slug,summary,industry\n" +
    '"Predictive demand forecasting","predictive-demand-forecasting","Forecast SKU demand to cut stockouts across the network.","retail"\n';

  it("reports missing required columns", () => {
    const parsed = parseCsv("title,slug\nfoo,bar\n");
    expect(parsed.fileErrors.some((e) => e.includes("summary"))).toBe(true);
  });

  it("plans a create for a new slug", () => {
    const plan = buildImportPlan(parseCsv(header), {
      existingBySlug: {},
      strategy: "skip",
      knownIndustries: ["retail"],
    });
    expect(plan.summary).toMatchObject({ total: 1, create: 1, error: 0 });
  });

  it("honours the duplicate strategy", () => {
    const existing = { "predictive-demand-forecasting": "id-1" };
    const parsed = parseCsv(header);
    expect(
      buildImportPlan(parsed, { existingBySlug: existing, strategy: "skip" }).summary.skip,
    ).toBe(1);
    expect(
      buildImportPlan(parsed, { existingBySlug: existing, strategy: "update" }).summary.update,
    ).toBe(1);
    const created = buildImportPlan(parsed, { existingBySlug: existing, strategy: "create_new" });
    expect(created.rows[0].values.slug).toBe("predictive-demand-forecasting-2");
  });

  it("errors on unknown taxonomy references", () => {
    const plan = buildImportPlan(parseCsv(header), {
      existingBySlug: {},
      strategy: "skip",
      knownIndustries: ["mining"],
    });
    expect(plan.summary.error).toBe(1);
  });

  it("errors on duplicate slugs inside the same file", () => {
    const plan = buildImportPlan(parseCsv(header + header.split("\n")[1] + "\n"), {
      existingBySlug: {},
      strategy: "skip",
    });
    expect(plan.summary.error).toBe(1);
  });

  it("summarizes row outcomes", () => {
    expect(
      summarizeOutcomes([
        { lineNumber: 2, slug: "a", status: "created" },
        { lineNumber: 3, slug: "b", status: "failed" },
      ]),
    ).toEqual({ created: 1, updated: 0, skipped: 0, failed: 1 });
  });
});
