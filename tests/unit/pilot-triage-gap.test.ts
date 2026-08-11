/**
 * Evidence-gap watchdog and shareable triage report artifact.
 *
 * These guard the "the pilot is silent" alarm: a cohort that sits open without
 * invitations, registrations or checkpoint answers must escalate after the
 * window, and the exported report must carry the verdict plus evidence links.
 */
import { describe, expect, it } from "bun:test";

import {
  EVIDENCE_GAP_WINDOW_DAYS,
  evaluateEvidenceGap,
  recommendFreeze,
  triagePilotEvidence,
  type PilotEvidence,
} from "@/lib/pilot/pilot.triage";
import { buildTriageReportMarkdown, triageFindingsToCsv } from "@/lib/pilot/pilot.export";

const emptyEvidence = (): PilotEvidence => ({
  cohort: {
    seatTarget: 25,
    invited: 0,
    registered: 0,
    activated: 0,
    completed: 0,
    revoked: 0,
    checkpointResponses: 0,
    blockersReported: 0,
    advisoryInterest: 0,
  },
  checkpoints: [],
  feedback: [],
  aiUsage: [],
  noResultSearches: [],
  securityAlerts: [],
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe("evidence gap watchdog", () => {
  it("does not fire while the cohort is inside the window", () => {
    const alert = evaluateEvidenceGap(emptyEvidence(), {
      cohortStartedAt: null,
      cohortOpenedAt: daysAgo(1),
    });
    expect(alert.state).toBe("no_invitations");
    expect(alert.triggered).toBe(false);
  });

  it("fires when no invitation exists after the window", () => {
    const alert = evaluateEvidenceGap(emptyEvidence(), {
      cohortStartedAt: null,
      cohortOpenedAt: daysAgo(EVIDENCE_GAP_WINDOW_DAYS + 2),
    });
    expect(alert.state).toBe("no_invitations");
    expect(alert.triggered).toBe(true);
    expect(alert.action.length).toBeGreaterThan(0);
  });

  it("distinguishes invited-but-silent from never-invited", () => {
    const evidence = emptyEvidence();
    evidence.cohort.invited = 20;
    const alert = evaluateEvidenceGap(evidence, {
      cohortStartedAt: daysAgo(EVIDENCE_GAP_WINDOW_DAYS + 1),
    });
    expect(alert.state).toBe("no_registrations");
    expect(alert.triggered).toBe(true);
  });

  it("flags registered participants who never answered a checkpoint", () => {
    const evidence = emptyEvidence();
    evidence.cohort.invited = 20;
    evidence.cohort.registered = 12;
    const alert = evaluateEvidenceGap(evidence, {
      cohortStartedAt: daysAgo(EVIDENCE_GAP_WINDOW_DAYS + 1),
    });
    expect(alert.state).toBe("no_answers");
  });

  it("clears once evidence exists", () => {
    const evidence = emptyEvidence();
    evidence.cohort.invited = 20;
    evidence.cohort.registered = 12;
    evidence.cohort.checkpointResponses = 5;
    const alert = evaluateEvidenceGap(evidence, {
      cohortStartedAt: daysAgo(30),
    });
    expect(alert.state).toBe("none");
    expect(alert.triggered).toBe(false);
  });
});

describe("triage report artifact", () => {
  const evidence = emptyEvidence();
  const findings = triagePilotEvidence(evidence);
  const report = {
    cohort: "pilot-2026-08",
    windowDays: 30,
    generatedAt: "2026-08-11T10:00:00.000Z",
    evidence,
    findings,
    freeze: recommendFreeze(evidence, findings),
    evidenceGap: evaluateEvidenceGap(evidence, {
      cohortStartedAt: null,
      cohortOpenedAt: daysAgo(EVIDENCE_GAP_WINDOW_DAYS + 3),
    }),
  };

  it("includes verdict, gap state and evidence counts", () => {
    const md = buildTriageReportMarkdown(report);
    expect(md).toContain("# Pilot triage report — cohort pilot-2026-08");
    expect(md).toContain(report.freeze.headline);
    expect(md).toContain("Evidence gap watchdog");
    expect(md).toContain("Seats invited: 0 of 25");
  });

  it("emits a findings CSV with a header row", () => {
    const csv = triageFindingsToCsv(findings);
    expect(csv.split("\r\n")[0]).toBe(
      "Triage,Source,Title,Observations,Detail,Action,Evidence route",
    );
  });
});
