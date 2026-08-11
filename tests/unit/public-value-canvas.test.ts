import { describe, expect, it } from "vitest";

import {
  CANVAS_SECTIONS,
  assessCanvas,
  canvasCompleteness,
  canvasToCsv,
  canvasToMarkdown,
  emptyCanvasSections,
  normalizeCanvasSections,
} from "@/lib/workshops.public-value";
import {
  ROSTER_MAX_ROWS,
  ROSTER_TEMPLATE_COLUMNS,
  buildRosterTemplateCsv,
  parseParticipantRoster,
} from "@/lib/pilot/pilot.roster";
import {
  TIMELINE_CATEGORY_LABEL,
  buildPilotTimeline,
  buildTimelinePdfRows,
  buildTimelineSummaryLines,
} from "@/lib/pilot/pilot.timeline";
import { describeRun, runVerdict, toRunRecord } from "@/lib/qa/launch-runs";

const answer = (text: string) => text.padEnd(60, ".");

function fullSections(confidence: "assumed" | "evidenced" = "evidenced") {
  const sections = emptyCanvasSections();
  for (const key of CANVAS_SECTIONS) {
    sections[key] = { text: answer(`Answer for ${key}`), confidence };
  }
  return sections;
}

describe("Sovereign Public Value Canvas", () => {
  it("starts empty and incomplete", () => {
    const sections = emptyCanvasSections();
    expect(canvasCompleteness(sections)).toBe(0);
    const readiness = assessCanvas(sections);
    expect(readiness.reviewReady).toBe(false);
    expect(readiness.missing).toHaveLength(CANVAS_SECTIONS.length);
  });

  it("ignores answers that are too thin to review", () => {
    const sections = emptyCanvasSections();
    sections.mandate = { text: "Short", confidence: "evidenced" };
    expect(canvasCompleteness(sections)).toBe(0);
  });

  it("is review-ready only when every section is answered and evidenced", () => {
    expect(assessCanvas(fullSections("evidenced")).reviewReady).toBe(true);
    const assumed = assessCanvas(fullSections("assumed"));
    expect(assumed.reviewReady).toBe(true);
    expect(assumed.assumptions).toHaveLength(CANVAS_SECTIONS.length);

    const unknown = fullSections("evidenced");
    unknown.sovereignty = { text: answer("Hosting to confirm"), confidence: "unknown" };
    const readiness = assessCanvas(unknown);
    expect(readiness.reviewReady).toBe(false);
    expect(readiness.unknowns).toEqual(["sovereignty"]);
  });

  it("normalises stored values defensively", () => {
    const sections = normalizeCanvasSections({
      mandate: { text: "ok", confidence: "nonsense" },
      bogus: { text: "ignored" },
    });
    expect(Object.keys(sections).sort()).toEqual([...CANVAS_SECTIONS].sort());
    expect(sections.mandate.confidence).toBe("unknown");
    expect(sections.beneficiaries.text).toBe("");
  });

  it("exports every section to CSV and Markdown", () => {
    const sections = fullSections();
    const csv = canvasToCsv(sections);
    expect(csv.split("\r\n")).toHaveLength(CANVAS_SECTIONS.length + 1);
    const markdown = canvasToMarkdown({
      workshopTitle: "Permits service",
      generatedAt: "2026-08-11T00:00:00.000Z",
      sections,
    });
    expect(markdown).toContain("Sovereign Public Value Canvas — Permits service");
    for (const key of CANVAS_SECTIONS) expect(markdown).toContain(`Answer for ${key}`);
  });
});

describe("roster CSV template", () => {
  it("round-trips through the parser unchanged", () => {
    const csv = buildRosterTemplateCsv();
    expect(csv.split("\r\n")[0]).toBe(ROSTER_TEMPLATE_COLUMNS.join(","));
    const parsed = parseParticipantRoster(csv, { maxRows: ROSTER_MAX_ROWS });
    expect(parsed.issues).toEqual([]);
    expect(parsed.participants).toHaveLength(3);
    expect(parsed.participants[0]!.email).toBe("aisha.rahman@example.gov");
    expect(parsed.participants[0]!.organization).toBe("Ministry of Digital Government");
    expect(parsed.participants[2]!.notes).toBeNull();
  });
});

describe("launch check runs in the timeline", () => {
  const run = {
    id: "run-1",
    cohort: "pilot",
    trigger: "waiver_granted",
    triggerDetail: "Waiver approved by CIO",
    actorId: "user-1",
    actorEmail: "admin@example.gov",
    total: 10,
    passed: 9,
    failed: 1,
    skipped: 0,
    errored: 0,
    p0Failures: 0,
    results: [],
    createdAt: "2026-08-11T10:00:00.000Z",
  };

  it("grades runs conservatively", () => {
    expect(runVerdict({ failed: 0, errored: 0, p0Failures: 0 })).toBe("pass");
    expect(runVerdict({ failed: 1, errored: 0, p0Failures: 0 })).toBe("attention");
    expect(runVerdict({ failed: 1, errored: 0, p0Failures: 1 })).toBe("fail");
    expect(describeRun(run)).toContain("Waiver approved");
  });

  it("maps a run to the ledger row shape", () => {
    const record = toRunRecord({
      cohort: "pilot",
      trigger: "manual",
      actorId: "user-1",
      actorEmail: null,
      results: [],
      summary: {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        errored: 0,
        p0Failures: 0,
        p1Failures: 0,
        verdict: "pass",
      },
    });
    expect(record).toMatchObject({ actor_id: "user-1", p0_failures: 0, trigger: "manual" });
  });

  it("adds recorded runs to the evidence trail", () => {
    const events = buildPilotTimeline({
      cohort: "pilot",
      rows: [],
      checkpoints: [],
      audit: [],
      launchCheckRuns: [run],
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.category).toBe("launch_check");
    expect(buildTimelinePdfRows(events)[0]).toEqual([
      "2026-08-11 10:00:00",
      TIMELINE_CATEGORY_LABEL.launch_check,
      "Signed-in launch checks re-run",
      "—",
    ]);
    expect(buildTimelineSummaryLines({ cohort: "pilot", events })).toContain("Launch check: 1");
  });
});