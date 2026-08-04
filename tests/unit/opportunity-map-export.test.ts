import { describe, expect, it } from "vitest";
import {
  mapExportFileName,
  mapMatrixToCsv,
  mapRecordsToCsv,
  mapToJson,
  toCsvCell,
} from "@/lib/opportunity-map-export";
import { buildTaxonomyChecklist, checklistProgress } from "@/lib/taxonomy-setup";
import type { MapRecord } from "@/lib/opportunity-map";

const record = (over: Partial<MapRecord> = {}): MapRecord => ({
  id: "1",
  title: "Invoice triage",
  status: "qualified",
  urgency: "now",
  ownerName: "Ada",
  orgUnitId: "u1",
  orgUnitName: "Finance",
  businessFunction: "Finance ops",
  strategicThemeId: "t1",
  strategicThemeName: "Cost, efficiency",
  convertedUseCaseId: null,
  updatedAt: "2026-08-01T10:00:00.000Z",
  ...over,
});

describe("opportunity map export", () => {
  it("escapes csv cells containing commas or quotes", () => {
    expect(toCsvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(toCsvCell(null)).toBe("");
  });

  it("writes a grid with per-column value and record columns plus totals", () => {
    const csv = mapMatrixToCsv([record(), record({ id: "2" })], "orgUnit");
    const [header, firstRow, totals] = csv.split("\r\n");
    expect(header).toContain("Organization unit");
    expect(header).toContain('"Cost, efficiency — records"');
    expect(firstRow).toContain("Finance");
    expect(totals?.startsWith("All rows")).toBe(true);
  });

  it("writes one record row per opportunity in view", () => {
    const csv = mapRecordsToCsv([record(), record({ id: "2", title: "Claims triage" })]);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).toContain("Claims triage");
  });

  it("exports json with cells, records and methodology", () => {
    const json = JSON.parse(mapToJson([record()], "businessFunction"));
    expect(json.axis).toBe("businessFunction");
    expect(json.methodology).toBeTruthy();
    expect(json.cells[0].records).toBe(1);
    expect(json.records).toHaveLength(1);
  });

  it("builds dated file names per format", () => {
    expect(mapExportFileName("records-csv", new Date("2026-08-14T00:00:00Z"))).toBe(
      "opportunity-map-records-2026-08-14.csv",
    );
    expect(mapExportFileName("json", new Date("2026-08-14T00:00:00Z"))).toMatch(/\.json$/);
  });
});

describe("taxonomy setup checklist", () => {
  const counts = {
    orgUnits: 0,
    strategicThemes: 0,
    valueThemes: 0,
    processes: 0,
    opportunities: 0,
    classifiedOpportunities: 0,
  };

  it("marks everything outstanding for a new workspace", () => {
    const progress = checklistProgress(buildTaxonomyChecklist(counts));
    expect(progress.requiredDone).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.complete).toBe(false);
  });

  it("keeps processes optional", () => {
    const steps = buildTaxonomyChecklist(counts);
    expect(steps.find((step) => step.key === "processes")?.optional).toBe(true);
  });

  it("completes only when records are captured and classified", () => {
    const almost = buildTaxonomyChecklist({
      ...counts,
      orgUnits: 2,
      strategicThemes: 2,
      valueThemes: 1,
      opportunities: 3,
    });
    expect(checklistProgress(almost).complete).toBe(false);

    const done = buildTaxonomyChecklist({
      orgUnits: 2,
      strategicThemes: 2,
      valueThemes: 1,
      processes: 1,
      opportunities: 3,
      classifiedOpportunities: 2,
    });
    expect(checklistProgress(done).complete).toBe(true);
    expect(done.find((step) => step.key === "classified")?.detail).toBe("2 of 3 classified");
  });
});
