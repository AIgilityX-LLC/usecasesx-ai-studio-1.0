import { describe, expect, it } from "vitest";
import {
  portfolioFileName,
  portfolioRows,
  portfolioToCsv,
  portfolioToJson,
  toCsvCell,
} from "@/lib/portfolio-export";
import type { Portfolio } from "@/lib/usecasex.store";

const portfolio: Portfolio = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Q1 Quick Wins",
  type: "Custom Portfolio",
  status: "Draft",
  objective: "Deliver value in 90 days",
  visibility: "workspace",
  reviewCadence: "quarterly",
  useCaseSlugs: ["invoice-triage"],
  entries: [
    {
      useCaseId: "22222222-2222-4222-8222-222222222222",
      useCaseSlug: "invoice-triage",
      useCaseTitle: 'Invoice "triage", automated',
      rank: 1,
      decision: "shortlisted",
      targetPeriod: "Q1 2027",
      fundingState: "requested",
      nextAction: "Confirm data owner",
      notes: undefined,
      addedAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ],
  createdAt: "2026-08-01T09:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

describe("portfolio export", () => {
  it("escapes csv cells that contain quotes or commas", () => {
    expect(toCsvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(3)).toBe("3");
  });

  it("emits one row per entry with human labels", () => {
    const [row] = portfolioRows(portfolio);
    expect(row?.[0]).toBe("1");
    expect(row?.[3]).toBe("Shortlisted");
    expect(row?.[5]).toBe("Funding requested");
  });

  it("writes a header row and quotes the escaped title", () => {
    const csv = portfolioToCsv(portfolio);
    expect(csv.split("\r\n")[0]).toContain("Rank,Use case,Slug,Decision");
    expect(csv).toContain('"Invoice ""triage"", automated"');
  });

  it("exports decisions without touching source use case fields", () => {
    const json = JSON.parse(portfolioToJson(portfolio));
    expect(json.portfolio.id).toBe(portfolio.id);
    expect(json.entries[0].decision).toBe("shortlisted");
    expect(json.entries[0]).not.toHaveProperty("score");
  });

  it("builds a dated slug file name", () => {
    expect(portfolioFileName(portfolio, "csv")).toMatch(/^q1-quick-wins-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
