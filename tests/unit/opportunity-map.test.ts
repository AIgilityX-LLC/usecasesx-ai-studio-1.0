import { describe, expect, it } from "vitest";
import {
  applyMapFilters,
  assessReadiness,
  buildMatrix,
  cellId,
  emptyMapFilters,
  intensityBand,
  recordWeight,
  UNASSIGNED,
  type MapRecord,
} from "@/lib/opportunity-map";

const record = (overrides: Partial<MapRecord>): MapRecord => ({
  id: crypto.randomUUID(),
  title: "Test",
  status: "opportunity",
  urgency: "next",
  ownerName: "Ada",
  orgUnitId: "unit-1",
  orgUnitName: "Operations",
  businessFunction: "Finance",
  strategicThemeId: "theme-1",
  strategicThemeName: "Cost efficiency",
  convertedUseCaseId: null,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("opportunity map model", () => {
  it("weights lifecycle and urgency", () => {
    expect(recordWeight(record({ status: "qualified", urgency: "now" }))).toBe(4.5);
    expect(recordWeight(record({ status: "archived", urgency: "now" }))).toBe(0);
  });

  it("bands intensity relative to the strongest cell", () => {
    expect(intensityBand(0)).toBe("none");
    expect(intensityBand(0.2)).toBe("low");
    expect(intensityBand(1)).toBe("highest");
  });

  it("builds a grid keyed by organizational row and value theme", () => {
    const matrix = buildMatrix(
      [
        record({ status: "converted", urgency: "now", convertedUseCaseId: "uc-1" }),
        record({ status: "signal", urgency: "later" }),
        record({
          orgUnitId: null,
          orgUnitName: null,
          strategicThemeId: null,
          strategicThemeName: null,
        }),
      ],
      "orgUnit",
    );
    expect(matrix.rows.map((r) => r.key)).toEqual(["unit-1", UNASSIGNED]);
    const cell = matrix.cells.get(cellId("unit-1", "theme-1"))!;
    expect(cell.count).toBe(2);
    expect(cell.convertedCount).toBe(1);
    expect(cell.value).toBe(6.5);
    expect(cell.band).toBe("highest");
    expect(matrix.totalRecords).toBe(3);
  });

  it("filters records without mutating the source", () => {
    const records = [record({ ownerName: "Ada" }), record({ ownerName: "Grace" })];
    const result = applyMapFilters(records, { ...emptyMapFilters(), owners: ["Grace"] });
    expect(result).toHaveLength(1);
    expect(records).toHaveLength(2);
  });

  it("reports readiness honestly", () => {
    expect(assessReadiness([], "orgUnit").ready).toBe(false);
    expect(
      assessReadiness([record({ strategicThemeId: null, strategicThemeName: null })], "orgUnit")
        .ready,
    ).toBe(false);
    expect(assessReadiness([record({})], "orgUnit").ready).toBe(true);
  });
});
