import { describe, expect, test } from "bun:test";
import {
  assertPilotAuthorizationReady,
  buildAgentCardPreview,
  emptySolutionDesign,
  isAgenticSolutionType,
  markField,
  OWASP_GENAI_PROMPTS,
  OWASP_PROMPT_PACK_VERSION,
  PilotAuthorizationBlockedError,
  pilotAuthorizationReadiness,
  SOLUTION_TYPES,
} from "@/lib/solution-design/model";
import { prepareLifecycleTransition } from "@/lib/lifecycle/apply";

const reviewer = {
  workspaceRole: "admin" as const,
};

describe("solution type catalogue", () => {
  test("covers FR-04 solution types including agentic", () => {
    expect(SOLUTION_TYPES).toContain("agentic_workflow");
    expect(SOLUTION_TYPES).toContain("generative_ai");
    expect(isAgenticSolutionType("agentic_workflow")).toBe(true);
    expect(isAgenticSolutionType("analytics")).toBe(false);
  });

  test("OWASP pack is versioned and non-empty with disclaimers", () => {
    expect(OWASP_PROMPT_PACK_VERSION.length).toBeGreaterThan(0);
    expect(OWASP_GENAI_PROMPTS.length).toBeGreaterThanOrEqual(8);
    expect(OWASP_GENAI_PROMPTS.every((p) => p.disclaimer.includes("not a compliance"))).toBe(true);
  });
});

describe("Pilot Authorization readiness (agentic)", () => {
  test("non-agentic designs are ready without control fields", () => {
    const r = pilotAuthorizationReadiness(emptySolutionDesign({ solutionType: "analytics" }));
    expect(r.ready).toBe(true);
    expect(r.isAgentic).toBe(false);
  });

  test("agentic without controls is blocked", () => {
    const r = pilotAuthorizationReadiness(
      emptySolutionDesign({ solutionType: "agentic_workflow" }),
    );
    expect(r.ready).toBe(false);
    expect(r.blockers.map((b) => b.field).sort()).toEqual([
      "actionLimits",
      "humanCheckpoints",
      "killSwitch",
    ]);
  });

  test("agentic with confirmed controls is ready", () => {
    const draft = emptySolutionDesign({
      solutionType: "agentic_workflow",
      actionLimits: "No outbound email",
      humanCheckpoints: "Approve before execute",
      killSwitch: "Ops can disable via runbook",
      fieldMeta: {
        actionLimits: { status: "confirmed" },
        humanCheckpoints: { status: "confirmed" },
        killSwitch: { status: "confirmed" },
      },
    });
    expect(pilotAuthorizationReadiness(draft).ready).toBe(true);
    expect(() => assertPilotAuthorizationReady(draft)).not.toThrow();
  });

  test("AI-draft controls block Pilot Authorization", () => {
    const draft = emptySolutionDesign({
      solutionType: "agentic_workflow",
      actionLimits: "Suggested limit",
      humanCheckpoints: "Suggested checkpoint",
      killSwitch: "Suggested kill",
      fieldMeta: {
        actionLimits: { status: "ai_draft", source: "assistant" },
        humanCheckpoints: { status: "confirmed" },
        killSwitch: { status: "confirmed" },
      },
    });
    expect(pilotAuthorizationReadiness(draft).ready).toBe(false);
    expect(() => assertPilotAuthorizationReady(draft)).toThrow(PilotAuthorizationBlockedError);
  });

  test("prepareLifecycleTransition enforces agentic pilot controls", () => {
    expect(() =>
      prepareLifecycleTransition({
        from: "under_review",
        to: "approved_pilot",
        subject: reviewer,
        subjectUserId: "owner-1",
        actorUserId: "reviewer-1",
        entityType: "use_case",
        entityId: "uc-1",
        workspaceId: "ws-1",
        actorWorkspaceId: "ws-1",
        solutionDesign: emptySolutionDesign({ solutionType: "agentic_workflow" }),
      }),
    ).toThrow(PilotAuthorizationBlockedError);

    expect(() =>
      prepareLifecycleTransition({
        from: "under_review",
        to: "approved_pilot",
        subject: reviewer,
        subjectUserId: "owner-1",
        actorUserId: "reviewer-1",
        entityType: "use_case",
        entityId: "uc-1",
        workspaceId: "ws-1",
        actorWorkspaceId: "ws-1",
        solutionDesign: emptySolutionDesign({
          solutionType: "agentic_workflow",
          actionLimits: "caps",
          humanCheckpoints: "HITL",
          killSwitch: "disable",
        }),
      }),
    ).not.toThrow();
  });
});

describe("Agent / AI System Card preview", () => {
  test("marks missing and AI-draft fields without inventing content", () => {
    const card = buildAgentCardPreview(
      emptySolutionDesign({
        solutionType: "agentic_workflow",
        humanRole: "Claims lead approves",
        killSwitch: "Suggested kill",
        fieldMeta: {
          humanRole: { status: "confirmed" },
          killSwitch: { status: "ai_draft", source: "assistant" },
        },
      }),
      { title: "Claims agent" },
    );
    expect(card.title).toBe("Claims agent");
    expect(card.disclaimer.toLowerCase()).toContain("not a safety");
    const human = card.fields.find((f) => f.key === "humanRole");
    const kill = card.fields.find((f) => f.key === "killSwitch");
    const action = card.fields.find((f) => f.key === "actionLimits");
    expect(human?.status).toBe("confirmed");
    expect(kill?.status).toBe("ai_draft");
    expect(action?.status).toBe("missing");
    expect(action?.value).toBeNull();
  });

  test("markField updates confirmation metadata", () => {
    const meta = markField({}, "actionLimits", "ai_draft", { source: "assistant" });
    expect(meta.actionLimits?.status).toBe("ai_draft");
    expect(meta.actionLimits?.source).toBe("assistant");
  });
});
