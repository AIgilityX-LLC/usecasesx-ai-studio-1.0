import { describe, expect, it } from "vitest";
import {
  buildConsent,
  buildSourceVersion,
  canTransition,
  deliveryStatement,
  isTargetConnected,
  makeSourceRef,
  nextStatuses,
  requiresConsent,
  sourceFingerprint,
  sourceHasDrifted,
  statusNoteRequired,
  summarizeQueue,
  validateDraft,
  type HandoffDraft,
  type HandoffRequest,
} from "@/lib/handoffs/handoff.model";

const refs = [
  makeSourceRef({ type: "use_case", id: "uc-1", label: "Claims triage", version: "v3" }),
];

function draft(overrides: Partial<HandoffDraft> = {}): HandoffDraft {
  return {
    target: "sarpi",
    requestType: "readiness_assessment",
    title: "Readiness for claims triage",
    summary: "",
    payload: {
      organizationName: "Acme",
      assessmentType: "Data readiness",
      readinessAssumptions: "",
      valueAssumptions: "",
    },
    consentConfirmed: false,
    sourceRefs: refs,
    ...overrides,
  };
}

describe("handoff targets", () => {
  it("never claims a live integration that does not exist", () => {
    expect(isTargetConnected("sarpi")).toBe(false);
    expect(deliveryStatement("sarpi")).toContain("not connected to an automatic integration");
  });

  it("requires consent for confidential and restricted targets only", () => {
    expect(requiresConsent("sarpi")).toBe(false);
    expect(requiresConsent("sarn_c3g")).toBe(true);
    expect(requiresConsent("human_advisory")).toBe(true);
  });
});

describe("validation", () => {
  it("accepts a complete SARPI draft", () => {
    expect(validateDraft(draft()).ok).toBe(true);
  });

  it("rejects a draft with no referenced records", () => {
    const result = validateDraft(draft({ sourceRefs: [] }));
    expect(result.ok).toBe(false);
    expect(result.errors["sourceRefs"]).toBeTruthy();
  });

  it("rejects a sensitive request without consent", () => {
    const result = validateDraft(
      draft({
        target: "sarn_c3g",
        requestType: "risk_review",
        payload: {
          caseReference: "UC-1",
          lifecycleStage: "Pilot",
          riskIndicators: ["Personal data processed"],
          governanceConcerns: "",
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors["consent"]).toBeTruthy();
  });

  it("surfaces per-field payload errors", () => {
    const result = validateDraft(draft({ payload: { organizationName: "", assessmentType: "" } }));
    expect(result.errors["payload.organizationName"]).toBeTruthy();
    expect(result.errors["payload.assessmentType"]).toBeTruthy();
  });

  it("rejects a request type that belongs to another target", () => {
    const result = validateDraft(draft({ requestType: "workshop" }));
    expect(result.errors["requestType"]).toBeTruthy();
  });
});

describe("consent record", () => {
  it("records the statement and the shared context", () => {
    const consent = buildConsent(
      draft({ target: "sarn_c3g", requestType: "risk_review", consentConfirmed: true }),
    );
    expect(consent.confirmed).toBe(true);
    expect(consent.confirmedAt).not.toBeNull();
    expect(consent.sharedContext).toEqual(["use_case: Claims triage"]);
  });

  it("treats non-sensitive targets as consented without a tick", () => {
    expect(buildConsent(draft()).confirmed).toBe(true);
  });
});

describe("source version", () => {
  it("is order independent and stable", () => {
    const a = makeSourceRef({ type: "use_case", id: "1", label: "A", version: "v1" });
    const b = makeSourceRef({ type: "portfolio", id: "2", label: "B", version: "v2" });
    expect(sourceFingerprint([a, b])).toBe(sourceFingerprint([b, a]));
  });

  it("detects drift when a referenced record changes version", () => {
    const version = buildSourceVersion(refs);
    expect(sourceHasDrifted(version, refs)).toBe(false);
    const moved = [makeSourceRef({ type: "use_case", id: "uc-1", label: "Claims", version: "v4" })];
    expect(sourceHasDrifted(version, moved)).toBe(true);
  });
});

describe("status machine", () => {
  it("only allows defined transitions", () => {
    expect(canTransition("queued", "in_review")).toBe(true);
    expect(canTransition("queued", "completed")).toBe(false);
    expect(nextStatuses("completed")).toEqual([]);
  });

  it("requires a reason when declining", () => {
    expect(statusNoteRequired("declined")).toBe(true);
    expect(statusNoteRequired("accepted")).toBe(false);
  });
});

describe("queue summary", () => {
  it("counts open versus terminal requests", () => {
    const base = {
      workspaceId: "w",
      organizationId: null,
      requestType: "readiness_assessment",
      deliveryMode: "internal_queue" as const,
      title: "t",
      summary: null,
      requestedBy: "u",
      ownerUserId: null,
      sourceRefs: [],
      sourceVersion: null,
      payload: {},
      consent: null,
      sensitivity: "internal" as const,
      statusNote: null,
      dispatchedAt: null,
      completedAt: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const rows: HandoffRequest[] = [
      { ...base, id: "1", target: "sarpi", status: "queued" },
      { ...base, id: "2", target: "sarpi", status: "completed" },
      { ...base, id: "3", target: "advisorx", status: "in_review" },
    ];
    const summary = summarizeQueue(rows);
    expect(summary.total).toBe(3);
    expect(summary.open).toBe(2);
    expect(summary.byTarget.sarpi).toBe(2);
    expect(summary.byStatus.completed).toBe(1);
  });
});
