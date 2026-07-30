import { describe, expect, it } from "vitest";
import {
  EMPTY_JOURNEY_SUMMARY,
  isNewWorkspace,
  nextAction,
  stageProgress,
  type JourneySummary,
} from "@/lib/journey";

function summary(patch: Partial<JourneySummary> = {}): JourneySummary {
  return { ...EMPTY_JOURNEY_SUMMARY, ...patch };
}

describe("journey next action", () => {
  it("points an empty workspace at the repository", () => {
    const a = nextAction(summary());
    expect(a.stage).toBe("discover");
    expect(a.to).toBe("/repository");
    expect(isNewWorkspace(summary())).toBe(true);
  });

  it("asks for capture once something is shortlisted", () => {
    expect(nextAction(summary({ shortlisted: 3 })).stage).toBe("capture");
  });

  it("asks to design once an opportunity exists", () => {
    expect(nextAction(summary({ shortlisted: 1, opportunitiesOpen: 2 })).to).toBe("/opportunities");
  });

  it("asks to finish a draft before scoring", () => {
    const a = nextAction(summary({ drafts: 2 }));
    expect(a.to).toBe("/studio");
    expect(a.reason).toContain("2 drafts");
  });

  it("progresses score → portfolio → export", () => {
    expect(nextAction(summary({ shortlisted: 1, completed: 1 })).stage).toBe("score");
    expect(nextAction(summary({ shortlisted: 1, completed: 1, scored: 1 })).stage).toBe(
      "prioritize",
    );
    expect(nextAction(summary({ shortlisted: 1, completed: 1, scored: 1, portfolios: 1 })).to).toBe(
      "/reports",
    );
  });

  it("marks reached stages from real counts only", () => {
    const stages = stageProgress(summary({ shortlisted: 1, scored: 2 }));
    expect(stages.find((s) => s.stage === "discover")?.reached).toBe(true);
    expect(stages.find((s) => s.stage === "capture")?.reached).toBe(false);
    expect(stages.find((s) => s.stage === "score")?.reached).toBe(true);
  });
});
