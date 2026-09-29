/**
 * Unit tests — V2-14 roadmap brief + export envelope, V2-15 workshop clusters.
 */

import { describe, expect, test } from "bun:test";
import {
  buildExportEnvelope,
  envelopeHeaderLines,
} from "@/lib/roadmap/export-envelope";
import {
  briefCompleteness,
  emptyBriefDraft,
  briefDraftSchema,
} from "@/lib/roadmap/implementation-brief";
import { roadmapToCsv, roadmapToXlsx } from "@/lib/roadmap-export";
import { buildRoadmapItems } from "@/lib/roadmap";
import type { PortfolioEntry } from "@/lib/portfolio-model";
import {
  proposeClusters,
  displaySubmitterName,
  tallyDots,
  buildDecisionLog,
  executiveSummarySentence,
} from "@/lib/workshops/workshop-v2";
import { buildOutcomeSummary } from "@/lib/workshops";

describe("V2-14 implementation brief", () => {
  test("empty draft reports all sections missing", () => {
    const c = briefCompleteness(emptyBriefDraft());
    expect(c.filled).toBe(0);
    expect(c.total).toBe(8);
    expect(c.missing).toContain("outcomes");
  });

  test("schema accepts a filled brief", () => {
    const draft = {
      ...emptyBriefDraft("Pilot brief"),
      outcomes: "Reduce triage time by 30%",
      scope: "Claims intake desk",
      assumptions: "OCR available",
      architecture: "Human-in-the-loop classifier",
      dataNeeds: "Historical claims labels",
      humanControls: "Supervisor override",
      measures: "Median handle time",
      acceptanceCriteria: "Pilot SLA met for 4 weeks",
      handoffLinks: [{ label: "Jira epic", url: "https://example.com/epic/1" }],
    };
    expect(briefDraftSchema.parse(draft).title).toBe("Pilot brief");
  });
});

describe("V2-14 export envelope", () => {
  test("CSV includes confidentiality and generated-at preamble", () => {
    const entry: PortfolioEntry = {
      useCaseId: "00000000-0000-4000-8000-000000000001",
      useCaseTitle: "Claims triage",
      rank: 1,
      decision: "approved",
      fundingState: "funded",
      deliveryStage: "now",
      dependsOn: [],
      roadmapStatus: "in_progress",
      gateKey: "pilot_authorization",
      deliveryOwner: "Alex",
      milestone: "Pilot go-live",
      addedAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    const items = buildRoadmapItems([entry]);
    const csv = roadmapToCsv(items, undefined, {
      tenantName: "Acme Corp",
      portfolioName: "Q1 portfolio",
      period: "2026-Q1",
      confidentiality: "Confidential",
      recordVersions: ["uc-v3"],
      scoringVersions: ["5pillar-v1"],
      exportedAt: "2026-09-24T10:00:00.000Z",
    });
    expect(csv).toContain("Confidentiality: Confidential");
    expect(csv).toContain("Tenant: Acme Corp");
    expect(csv).toContain("Generated at: 2026-09-24T10:00:00.000Z");
    expect(csv).toContain("Claims triage");
    expect(csv).toContain("pilot_authorization");

    const xlsx = roadmapToXlsx(items, undefined, {
      tenantName: "Acme Corp",
      confidentiality: "Internal",
    });
    expect(xlsx).toContain("Workbook");
    expect(xlsx).toContain("Claims triage");
  });

  test("envelope header lines are stable", () => {
    const env = buildExportEnvelope({
      tenantName: "T",
      itemCount: 2,
      filters: { period: "Q1" },
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    const lines = envelopeHeaderLines(env);
    expect(lines[0]).toContain("Confidentiality");
    expect(lines.some((l) => l.includes("Filters: period=Q1"))).toBe(true);
  });
});

describe("V2-15 workshop clusters and anonymity", () => {
  test("proposeClusters groups similar titles and never auto-merges", () => {
    const proposals = proposeClusters([
      { id: "1", title: "Automate invoice matching", status: "submitted", kind: "opportunity" },
      { id: "2", title: "Automate invoice match process", status: "submitted", kind: "opportunity" },
      { id: "3", title: "Citizen chat assistant", status: "submitted", kind: "use_case" },
    ]);
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals[0]!.itemIds.length).toBeGreaterThanOrEqual(2);
    expect(proposals[0]!.reason).toContain("similarity");
  });

  test("anonymous display redacts for non-facilitators", () => {
    expect(displaySubmitterName(true, "Jordan", false)).toBe("Anonymous");
    expect(displaySubmitterName(true, "Jordan", true)).toBe("Jordan");
    expect(displaySubmitterName(false, "Jordan", false)).toBe("Jordan");
  });

  test("tallyDots counts unique voters", () => {
    const map = tallyDots([
      { itemId: "a", criterion: "dots", voterId: "u1" },
      { itemId: "a", criterion: "dots", voterId: "u2" },
      { itemId: "a", criterion: "value", voterId: "u3" },
      { itemId: "b", criterion: "dots", voterId: "u1" },
    ]);
    expect(map.get("a")).toBe(2);
    expect(map.get("b")).toBe(1);
  });

  test("outcome includes executive summary and decision log", () => {
    const summary = buildOutcomeSummary({
      workshop: { title: "Discovery", clientName: "City", objective: "Find AI pilots" },
      participants: [{ id: "p1" }],
      items: [
        {
          id: "i1",
          workshopId: "w1",
          kind: "opportunity",
          title: "Invoice automation",
          detail: "",
          businessFunction: "Finance",
          submittedBy: null,
          submittedByName: "A",
          status: "shortlisted",
          mergedIntoId: null,
          sourceItemId: null,
          opportunityId: "opp-1",
          useCaseId: null,
          convertedAt: "2026-09-24T09:00:00.000Z",
          createdAt: "2026-09-24T08:00:00.000Z",
          updatedAt: "2026-09-24T08:30:00.000Z",
        },
      ],
      votes: [],
      now: new Date("2026-09-24T10:00:00.000Z"),
    });
    expect(summary.executiveSummary).toContain("Discovery");
    expect(summary.executiveSummary).toContain("shortlisted");
    expect(summary.decisionLog.some((e) => e.action === "converted")).toBe(true);
    expect(summary.decisionLog.some((e) => e.action === "shortlisted")).toBe(true);
  });

  test("decision log and exec sentence helpers", () => {
    expect(
      executiveSummarySentence({
        title: "W",
        participantCount: 3,
        shortlistCount: 2,
        convertedCount: 1,
        objective: "cut cost",
      }),
    ).toContain("cut cost");
    expect(
      buildDecisionLog([
        {
          title: "X",
          status: "rejected",
          convertedAt: null,
          opportunityId: null,
          useCaseId: null,
          updatedAt: "2026-01-01",
        },
      ])[0]?.action,
    ).toBe("parked");
  });
});
