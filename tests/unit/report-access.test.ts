import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";

const serverVerdict = { allowed: true as boolean, reason: "Access denied." };

mock.module("@/lib/reports/report-export.functions", () => ({
  authorizeReportExportFn: async () =>
    serverVerdict.allowed ? { allowed: true } : { allowed: false, reason: serverVerdict.reason },
}));

import {
  canExportReport,
  assertCanExportReport,
  ReportExportDeniedError,
  EXPORT_FORMATS,
  EXPORT_ROLES,
  type ExportFormat,
} from "@/lib/reports/report-access";
import { downloadBenefitsCsv, downloadUseCaseCsv, printReport } from "@/lib/reports/report-export";
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
      timeToValue: "3-6 months",
      maturityLevel: "Pilot",
      maturity: "Pilot",
      industry: { slug: "retail", name: "Retail" },
      businessFunction: "Supply chain",
      aiCapability: "Forecasting",
    },
  },
];

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
  const saved: Record<string, unknown> = {};
  const stub = (key: string, value: unknown) => {
    if (!(key in saved)) saved[key] = (globalThis as Record<string, unknown>)[key];
    (globalThis as Record<string, unknown>)[key] = value;
  };

  beforeEach(() => {
    clicks.length = 0;
    printed.length = 0;
    const anchor = {
      href: "",
      download: "",
      click() {
        clicks.push(this.download);
      },
      remove() {},
    };
    stub("document", {
      createElement: () => anchor,
      body: { appendChild: () => undefined },
    });
    stub(
      "Blob",
      class {
        constructor(readonly parts: unknown[]) {}
      },
    );
    stub("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: () => undefined,
    });
    stub("window", { print: () => printed.push(1) });
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  });

  it("produces files for a permitted role", async () => {
    serverVerdict.allowed = true;
    expect(await downloadUseCaseCsv(ITEMS, "AI Use Case Summary Report", "owner")).toMatch(
      /\.csv$/,
    );
    expect(await downloadBenefitsCsv(ITEMS, "AI Use Case Summary Report", "admin")).toMatch(
      /benefits-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(clicks).toHaveLength(2);
    await printReport("viewer");
    expect(printed).toHaveLength(1);
  });

  it("refuses CSV for a viewer and writes no file", async () => {
    await expect(downloadUseCaseCsv(ITEMS, "report", "viewer")).rejects.toBeInstanceOf(
      ReportExportDeniedError,
    );
    await expect(downloadBenefitsCsv(ITEMS, "report", "viewer")).rejects.toBeInstanceOf(
      ReportExportDeniedError,
    );
    expect(clicks).toHaveLength(0);
  });

  it("refuses every export for a non-member and never opens the print dialog", async () => {
    await expect(downloadUseCaseCsv(ITEMS, "report", null)).rejects.toThrow(/Access denied/);
    await expect(printReport(null)).rejects.toThrow(/Access denied/);
    expect(clicks).toHaveLength(0);
    expect(printed).toHaveLength(0);
  });

  it("refuses an export the server denies even when the local role allows it", async () => {
    serverVerdict.allowed = false;
    serverVerdict.reason = "Access denied. Your plan does not include report exports.";
    await expect(downloadUseCaseCsv(ITEMS, "report", "owner")).rejects.toThrow(/Access denied/);
    expect(clicks).toHaveLength(0);
    serverVerdict.allowed = true;
  });
});
