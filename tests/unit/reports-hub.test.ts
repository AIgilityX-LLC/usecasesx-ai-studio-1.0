import { describe, expect, it } from "bun:test";
import {
  REPORTS_HUB_ITEMS,
  collectReportsHubTargets,
  getReportHubItem,
} from "@/lib/reports/reports-hub";

describe("reports hub catalogue", () => {
  it("exposes the required hub recipes", () => {
    const labels = REPORTS_HUB_ITEMS.map((i) => i.label);
    expect(labels).toEqual([
      "Executive Summary",
      "Board Pack",
      "Portfolio Report",
      "AI Investment Report",
      "ROI / Value Report",
      "Governance Summary",
      "Use Case Business Case",
      "Export Center",
    ]);
  });

  it("keeps planned reports without live formats or generator types", () => {
    const planned = REPORTS_HUB_ITEMS.filter((i) => i.status === "planned");
    expect(planned.map((i) => i.id).sort()).toEqual(["ai-investment", "governance-summary"]);
    for (const item of planned) {
      expect(item.liveFormats).toEqual([]);
      expect(item.generatorType).toBeUndefined();
      expect(item.missingImplementation.length).toBeGreaterThan(0);
    }
  });

  it("wires available recipes to existing generator types", () => {
    const available = REPORTS_HUB_ITEMS.filter(
      (i) => i.status === "available" && i.id !== "export-center",
    );
    for (const item of available) {
      expect(item.generatorType).toBeTruthy();
      expect(item.liveFormats.length).toBeGreaterThan(0);
    }
  });

  it("resolves slugs and collects unique hub paths", () => {
    expect(getReportHubItem("portfolio")?.label).toBe("Portfolio Report");
    expect(getReportHubItem("missing")).toBeUndefined();
    const targets = collectReportsHubTargets();
    expect(targets).toContain("/reports");
    expect(targets).toContain("/reports/export-center");
    expect(new Set(targets).size).toBe(targets.length);
  });
});
