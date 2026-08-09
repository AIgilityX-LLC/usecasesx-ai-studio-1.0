import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  canExportReport,
  assertCanExportReport,
  ReportExportDeniedError,
  EXPORT_FORMATS,
  EXPORT_ROLES,
  type ExportFormat,
} from "@/lib/reports/report-access";
import {
  downloadBenefitsCsv,
  downloadUseCaseCsv,
  printReport,
} from "@/lib/reports/report-export";
import type { ReportItemInput } from "@/lib/reports/report-model";

const ITEMS: ReportItemInput[] = [
  {
    useCaseId: "uc-1",
    content: {
      slug: "demand-forecasting",
      title: "Demand forecasting",
      summary: "Forecast demand.",
      valuePotential: "High",
      complexity: "Medium",
      riskLevel: "Low",
      timeToValue: "3–6 months",
      maturityLevel: "Pilot",
      maturity: "Pilot",
      industry: { slug: "retail", name: "Retail" },
      businessFunction: "Supply chain",
      aiCapability: "Forecasting",
    },
  },
];

/** The locked permission matrix. Changing a cell is a governance decision. */
const EXPECTED: Record<string, Record<ExportFormat, boolean>> = {
  owner: { pdf: true, csv: true, csv_benefits: true },
  admin: { pdf: true, csv: true, csv_benefits: true },
  contributor: { pdf: true, csv: true, csv_benefits: true },
  facilitator: { pdf: true, csv: true, csv_benefits: true },
  viewer: { pdf: true, csv: false, csv_benefits: false },
};

describe("report export permissions", () => {
  it("matches the locked role/format matrix", () => {
    for (const role of EXPORT_ROLES) {
      for (const format of EXPORT_FORMATS) {
        expect(`${role}:${format}:${canExportReport(role, format).allowed}`).toBe(
          `${role}:${format}:${EXPECTED[role]![format]}`,
        );
      }
    }
  });

  it("denies every format to a non-member and to unknown roles", () => {
    for (const format of EXPORT_FORMATS) {
      for (const role of [null, undefined, "", "guest", "superuser"]) {
        const decision = canExportReport(role, format);
        expect(decision.allowed).toBe(false);
        expect((decision as { reason: string }).reason).toMatch(/Access denied/);
      }
    }
  });

  it("explains why a permitted member without the right role is refused", () => {
    const decision = canExportReport("viewer", "csv");
    expect(decision.allowed).toBe(false);
    expect((decision as { reason: string }).reason).toContain("viewer");
    expect((decision as { reason: string }).reason).toContain("Use case CSV");
  });

  it("throws a typed error carrying the format and role", () => {
    try {
      assertCanExportReport("viewer", "csv_benefits");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ReportExportDeniedError);
      const denied = error as ReportExportDeniedError;
      expect(denied.code).toBe("export_access_denied");
      expect(denied.format).toBe("csv_benefits");
      expect(denied.role).toBe("viewer");
    }
  });
});

describe("export helpers enforce access, not just the UI", () => {
  const clicks: string[] = [];
  const printed: number[] = [];

  beforeEach(() => {
    clicks.length = 0;
    printed.length = 0;
    // No DOM in this runner: stub the minimum surface the helpers touch so the
    // assertion is "did a file get produced?", not "does jsdom work?".
    const anchor = {
      href: "",
      download: "",
      click() {
        clicks.push(this.download);
      },
      remove() {},
    };
    vi.stubGlobal("document", {
      createElement: () => anchor,
      body: { appendChild: () => undefined },
    });
    vi.stubGlobal("Blob", class {
      constructor(readonly parts: unknown[]) {}
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: () => undefined,
    });
    vi.stubGlobal("window", { print: () => printed.push(1) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("produces files for a permitted role", () => {
    expect(downloadUseCaseCsv(ITEMS, "AI Use Case Summary Report", "owner")).toMatch(/\.csv$/);
    expect(downloadBenefitsCsv(ITEMS, "AI Use Case Summary Report", "admin")).toMatch(
      /benefits-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(clicks).toHaveLength(2);
    printReport("viewer");
    expect(printed).toHaveLength(1);
  });

  it("refuses CSV for a viewer and writes no file", () => {
    expect(() => downloadUseCaseCsv(ITEMS, "report", "viewer")).toThrow(ReportExportDeniedError);
    expect(() => downloadBenefitsCsv(ITEMS, "report", "viewer")).toThrow(ReportExportDeniedError);
    expect(clicks).toHaveLength(0);
  });

  it("refuses every export for a non-member and never opens the print dialog", () => {
    expect(() => downloadUseCaseCsv(ITEMS, "report", null)).toThrow(/Access denied/);
    expect(() => printReport(null)).toThrow(/Access denied/);
    expect(clicks).toHaveLength(0);
    expect(printed).toHaveLength(0);
  });
});
