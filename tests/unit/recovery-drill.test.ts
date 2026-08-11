import { describe, expect, it } from "bun:test";
import {
  DRILL_MAX_AGE_DAYS,
  RECOVERY_DRILL,
  drillAgeDays,
  drillProbeStatus,
  drillSummary,
} from "@/lib/ops/recovery-drill";

describe("recovery drill record", () => {
  it("names an owner for the drill and for a real restore", () => {
    expect(RECOVERY_DRILL.owner).toMatch(/@/);
    expect(RECOVERY_DRILL.restoreExecutedBy).toMatch(/platform support/i);
  });

  it("captures a measured restore time", () => {
    expect(RECOVERY_DRILL.restoreSeconds).toBeGreaterThan(0);
    expect(RECOVERY_DRILL.steps.length).toBeGreaterThan(3);
  });

  it("reports attention while the rebuild path has baseline gaps", () => {
    expect(RECOVERY_DRILL.status).toBe("partial");
    expect(drillProbeStatus(RECOVERY_DRILL, new Date(RECOVERY_DRILL.performedAt))).toBe(
      "attention",
    );
  });

  it("stops counting as evidence once it is stale", () => {
    const stale = new Date(
      new Date(RECOVERY_DRILL.performedAt).getTime() +
        (DRILL_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000,
    );
    expect(drillAgeDays(RECOVERY_DRILL, stale)).toBe(DRILL_MAX_AGE_DAYS + 1);
    expect(drillProbeStatus(RECOVERY_DRILL, stale)).toBe("unknown");
  });

  it("states plainly what could not be rebuilt", () => {
    expect(drillSummary(RECOVERY_DRILL)).toContain("could not be rebuilt from migrations alone");
  });
});
