/**
 * Guided demo story export — template-only content and lineage accuracy.
 * Pure functions only. Run with `bun run test:unit`.
 */
import { describe, expect, test } from "bun:test";

import { buildDemoStoryDocs, type LineageEntry } from "../../src/lib/demo/demo-story-export";
import {
  DEMO_SCENARIOS,
  DEMO_TEMPLATE_VERSION,
  scoreTotal,
} from "../../src/lib/demo/demo-scenarios";

const scenario = DEMO_SCENARIOS[0]!;
const other = DEMO_SCENARIOS[1]!;

const lineage: LineageEntry[] = [
  {
    scenario_key: scenario.key,
    scenario_label: `${scenario.label} (Sample)`,
    template_version: DEMO_TEMPLATE_VERSION,
    entity_counts: { useCases: 3, opportunities: 4 },
    created_at: "2026-08-01T10:00:00.000Z",
  },
  {
    scenario_key: other.key,
    scenario_label: `${other.label} (Sample)`,
    template_version: DEMO_TEMPLATE_VERSION,
    entity_counts: { useCases: 2 },
    created_at: "2026-08-02T10:00:00.000Z",
  },
];

function flatten(docs: ReturnType<typeof buildDemoStoryDocs>) {
  return docs
    .flatMap((doc) => [
      doc.title,
      doc.subtitle ?? "",
      ...doc.sections.flatMap((section) => {
        if (section.kind === "table") return section.rows.flat().concat(section.columns);
        return [section.heading, String((section as { body?: string }).body ?? "")];
      }),
    ])
    .join("\n");
}

describe("guided demo story export", () => {
  test("uses template data only — every use case, opportunity and benefit comes from the library", () => {
    const docs = buildDemoStoryDocs(scenario, lineage);
    const text = flatten(docs);

    for (const uc of scenario.useCases) {
      expect(text).toContain(uc.title);
      expect(text).toContain(String(scoreTotal(uc.score)));
      for (const benefit of uc.benefits) expect(text).toContain(benefit.name);
    }
    for (const opp of scenario.opportunities) expect(text).toContain(opp.title);
    expect(text).toContain(scenario.organization.name);
    expect(text).toContain(scenario.portfolio.name);
  });

  test("never leaks another scenario's records or tenant identifiers", () => {
    const text = flatten(buildDemoStoryDocs(scenario, lineage));
    for (const uc of other.useCases) expect(text).not.toContain(uc.title);
    expect(text).not.toContain(other.organization.name);
    // no database identifiers (uuids) may appear — the export reads no tenant rows
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  test("carries the demonstration disclaimer and template version", () => {
    const text = flatten(buildDemoStoryDocs(scenario, lineage));
    expect(text).toContain(DEMO_TEMPLATE_VERSION);
    expect(text.toLowerCase()).toContain("demonstration");
  });

  test("lineage summary lists only copies made from this template", () => {
    const docs = buildDemoStoryDocs(scenario, lineage);
    const lineageDoc = docs.at(-1)!;
    expect(lineageDoc.title).toBe("Template-to-copy lineage");

    const table = lineageDoc.sections.find((s) => s.kind === "table") as {
      rows: string[][];
    };
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]![1]).toBe(`${scenario.label} (Sample)`);
    expect(table.rows[0]![2]).toBe(DEMO_TEMPLATE_VERSION);
    expect(table.rows[0]![3]).toContain("3 useCases");
    expect(table.rows[0]![3]).toContain("4 opportunities");
  });

  test("lineage summary degrades gracefully with no copies", () => {
    const docs = buildDemoStoryDocs(scenario, []);
    const table = docs.at(-1)!.sections.find((s) => s.kind === "table") as { rows: string[][] };
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]![1]).toContain("No sample copies");
  });
});
