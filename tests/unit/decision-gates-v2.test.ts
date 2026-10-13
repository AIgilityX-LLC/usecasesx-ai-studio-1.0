import { describe, expect, test } from "bun:test";
import {
  AiMayNotCloseConditionError,
  AiMayNotDecideError,
  assertGateSod,
  assertHumanClose,
  assertHumanDecide,
  assertReadyToSubmit,
  computeSla,
  DEFAULT_GATES,
  GATE_KEYS,
  GateReadinessError,
  identifyMissingInputs,
  statusAfterAction,
} from "@/lib/gates/model";

describe("decision gate catalogue (FR-08)", () => {
  test("includes the six default gates", () => {
    expect(GATE_KEYS).toEqual([
      "intake",
      "discovery_complete",
      "investment_review",
      "pilot_authorization",
      "scale_authorization",
      "retirement_review",
    ]);
    expect(DEFAULT_GATES).toHaveLength(6);
    expect(DEFAULT_GATES.every((g) => g.slaHours > 0 && g.decisionAuthority.length > 0)).toBe(true);
  });

  test("actions map to review statuses", () => {
    expect(statusAfterAction("submit")).toBe("submitted");
    expect(statusAfterAction("request_changes")).toBe("changes_requested");
    expect(statusAfterAction("approve_with_conditions")).toBe("approved_with_conditions");
    expect(statusAfterAction("approve")).toBe("approved");
    expect(statusAfterAction("hold")).toBe("held");
    expect(statusAfterAction("reject")).toBe("rejected");
  });
});

describe("SLA indicator", () => {
  test("flags overdue after slaHours", () => {
    const submittedAt = new Date("2026-09-01T00:00:00Z").toISOString();
    const now = new Date("2026-09-04T00:00:00Z"); // 72h later
    const sla = computeSla(submittedAt, 48, now);
    expect(sla.overdue).toBe(true);
    expect(sla.label).toContain("Overdue");
  });

  test("shows remaining when within SLA", () => {
    const submittedAt = new Date("2026-09-01T00:00:00Z").toISOString();
    const now = new Date("2026-09-01T12:00:00Z");
    const sla = computeSla(submittedAt, 48, now);
    expect(sla.overdue).toBe(false);
    expect(sla.hoursRemaining).toBe(36);
  });
});

describe("missing inputs (AI may flag, cannot decide)", () => {
  const intake = DEFAULT_GATES[0]!;

  test("identifyMissingInputs lists empty required fields", () => {
    const missing = identifyMissingInputs(intake, { title: "X" });
    expect(missing.map((m) => m.field).sort()).toEqual(["desiredOutcome", "owner", "problem"]);
    expect(missing.every((m) => m.source === "rule")).toBe(true);
  });

  test("assertReadyToSubmit throws GateReadinessError", () => {
    expect(() => assertReadyToSubmit(intake, {})).toThrow(GateReadinessError);
  });

  test("AI cannot approve / close conditions", () => {
    expect(() => assertHumanDecide("ai", "approve")).toThrow(AiMayNotDecideError);
    expect(() => assertHumanDecide("ai", "reject")).toThrow(AiMayNotDecideError);
    expect(() => assertHumanDecide("human", "approve")).not.toThrow();
    expect(() => assertHumanClose("ai")).toThrow(AiMayNotCloseConditionError);
    expect(() => assertHumanClose("human")).not.toThrow();
  });
});

describe("segregation of duties", () => {
  test("blocks submitter from deciding when sodEnabled", () => {
    expect(() =>
      assertGateSod({
        sodEnabled: true,
        submittedBy: "user-a",
        actorUserId: "user-a",
      }),
    ).toThrow(/Segregation of duties.*gate you submitted/);
  });

  test("allows other reviewer when sodEnabled", () => {
    expect(() =>
      assertGateSod({
        sodEnabled: true,
        submittedBy: "user-a",
        actorUserId: "user-b",
      }),
    ).not.toThrow();
  });

  test("skips SoD when gate disables it", () => {
    expect(() =>
      assertGateSod({
        sodEnabled: false,
        submittedBy: "user-a",
        actorUserId: "user-a",
      }),
    ).not.toThrow();
  });
});
