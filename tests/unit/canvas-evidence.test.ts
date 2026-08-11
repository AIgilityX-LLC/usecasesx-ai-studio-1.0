import { describe, expect, it } from "vitest";
import {
  buildRosterIssueReportCsv,
  parseParticipantRoster,
  rosterErrors,
  rosterWarnings,
  summarizeRosterParse,
} from "@/lib/pilot/pilot.roster";
import {
  canvasDocumentsToCsv,
  diffCanvasVersions,
  documentsBySection,
  normalizeCanvasVersion,
  type CanvasDocument,
  type CanvasVersion,
} from "@/lib/workshops.canvas-evidence";
import {
  localizedCanvasToCsv,
  localizedCanvasToMarkdown,
} from "@/lib/workshops.public-value.export";
import { emptyCanvasSections } from "@/lib/workshops.public-value";
import { buildPilotTimeline, localizedTimelineToCsv } from "@/lib/pilot/pilot.timeline";

const doc = (over: Partial<CanvasDocument> = {}): CanvasDocument => ({
  id: "d1",
  workshopId: "11111111-1111-1111-1111-111111111111",
  section: "mandate",
  label: "Mandate.pdf",
  storagePath: "11111111-1111-1111-1111-111111111111/mandate/mandate.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  note: null,
  uploadedBy: "u1",
  createdAt: "2026-08-12T10:00:00.000Z",
  ...over,
});

const version = (n: number, text: string): CanvasVersion =>
  normalizeCanvasVersion({
    id: `v${n}`,
    workshop_id: "11111111-1111-1111-1111-111111111111",
    version: n,
    sections: { ...emptyCanvasSections(), mandate: { text, confidence: "evidenced" } },
    created_at: `2026-08-1${n}T10:00:00.000Z`,
  });

describe("roster validation detail", () => {
  const file = [
    "email,full name,organisation,notes",
    "a@example.gov,Ann,Agency,",
    "not-an-email,Bob,Agency,",
    "a@example.gov,Ann,Agency,",
    "c@example.gov,,Agency,",
  ].join("\n");

  it("reports per-row errors with a column and a fix", () => {
    const result = parseParticipantRoster(file);
    const errors = rosterErrors(result);
    expect(result.participants.map((p) => p.email)).toEqual(["a@example.gov", "c@example.gov"]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ line: 3, field: "email", severity: "error" });
    expect(errors[0].fix.length).toBeGreaterThan(5);
    expect(errors[1].reason).toContain("line 2");
    expect(rosterWarnings(result).some((w) => w.field === "fullName")).toBe(true);
    expect(result.totalRows).toBe(4);
  });

  it("summarizes and exports a downloadable report", () => {
    const result = parseParticipantRoster(file);
    expect(summarizeRosterParse(result)).toContain("2 seat(s) ready");
    const csv = buildRosterIssueReportCsv(result, { fileName: "roster.csv" });
    expect(csv).toContain("Pilot roster validation report");
    expect(csv).toContain("How to fix");
    expect(csv.split("\r\n").length).toBeGreaterThan(6);
  });

  it("caps a roster at the seat limit with a blocking issue", () => {
    const many = Array.from({ length: 4 }, (_, i) => `p${i}@example.gov`).join("\n");
    const result = parseParticipantRoster(many, { maxRows: 2 });
    expect(result.participants).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(rosterErrors(result)).toHaveLength(2);
  });
});

describe("canvas documents and versions", () => {
  it("groups documents by section and exports them", () => {
    const grouped = documentsBySection([doc(), doc({ id: "d2", section: "beneficiaries" })]);
    expect(grouped.mandate).toHaveLength(1);
    expect(grouped.beneficiaries).toHaveLength(1);
    expect(canvasDocumentsToCsv([doc()], "fr")).toContain("Mandate.pdf");
  });

  it("diffs consecutive versions", () => {
    const first = diffCanvasVersions(null, version(1, "Statutory duty under the 2024 Act."));
    expect(first.changedSections).toContain("mandate");
    const second = diffCanvasVersions(
      version(1, "Statutory duty under the 2024 Act."),
      version(2, "Statutory duty under the 2024 Act, amended 2026."),
    );
    expect(second.changes.find((c) => c.section === "mandate")?.change).toBe("edited");
    expect(second.changedSections).toEqual(["mandate"]);
  });

  it("localises canvas exports and appends the document register", () => {
    const input = {
      workshopTitle: "Revenue service",
      generatedAt: "2026-08-12T10:00:00.000Z",
      sections: version(1, "Statutory duty.").sections,
      language: "fr" as const,
      documents: [doc()],
      version: 1,
    };
    const md = localizedCanvasToMarkdown(input);
    expect(md).toContain("Français");
    expect(md).toContain("Mandate.pdf");
    expect(localizedCanvasToCsv(input)).toContain("Mandate.pdf");
  });
});

describe("timeline evidence linking", () => {
  it("adds canvas documents as timeline events and localises the CSV", () => {
    const events = buildPilotTimeline({
      cohort: "pilot-1",
      rows: [],
      checkpoints: [],
      audit: [],
      emailByUserId: { u1: "ann@example.gov" },
      canvasDocuments: [doc()],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ category: "document", actor: "ann@example.gov" });
    expect(events[0].title).toContain("Mandate.pdf");
    const csv = localizedTimelineToCsv(events, "de");
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
