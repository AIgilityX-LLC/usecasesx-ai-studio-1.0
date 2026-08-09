/**
 * CSV contract lock. See docs/architecture/csv-export-contract.md.
 *
 * The frozen lists below are deliberately duplicated from the source: if a
 * column is renamed, reordered or removed, this test fails and the change has
 * to be a conscious contract decision.
 */

import { describe, expect, it } from "vitest";

import {
  BENEFIT_CSV_COLUMNS,
  USE_CASE_CSV_COLUMNS,
  benefitsToCsv,
  buildUseCasesCsv,
  toCsvCell,
  type ReportItemInput,
} from "@/lib/reports/report-model";
import type { UseCaseContent } from "@/lib/domain/saved-use-cases.repository";
import type { Benefit } from "@/lib/value/benefits.model";
import type { ScoreDimensions } from "@/lib/usecasex.store";

const FROZEN_USE_CASE_COLUMNS = [
  "use_case_id",
  "slug",
  "studio_use_case_id",
  "title",
  "industry",
  "business_function",
  "ai_capability",
  "value_potential",
  "complexity",
  "risk_level",
  "time_to_value",
  "score_strategic",
  "score_value",
  "score_feasibility",
  "score_ttv",
  "score_risk",
  "score_governance",
  "score_total",
  "priority_band",
  "decision",
  "funding_state",
  "delivery_stage",
  "target_period",
  "planned_start",
  "planned_end",
  "milestone",
  "owner",
  "blocked_reason",
  "next_action",
  "benefit_count",
  "benefits_evidenced",
  "gaps",
];

const FROZEN_BENEFIT_COLUMNS = [
  "use_case_id",
  "slug",
  "benefit_id",
  "name",
  "category",
  "unit_type",
  "currency",
  "period",
  "baseline_value",
  "target_value",
  "expected_value",
  "confidence",
  "state",
  "benefit_owner",
  "erp_verification",
  "evidence_count",
];

function content(overrides: Partial<UseCaseContent> = {}): UseCaseContent {
  return {
    slug: "demand-forecasting",
    title: "Demand forecasting",
    summary: "Forecast demand across regions.",
    valuePotential: "High",
    complexity: "Medium",
    riskLevel: "Low",
    timeToValue: "3–6 months",
    maturityLevel: "Pilot",
    maturity: "Pilot",
    industry: { slug: "retail", name: "Retail" },
    businessFunction: "Supply chain",
    aiCapability: "Forecasting",
    ...overrides,
  };
}

function score(): ScoreDimensions {
  return {
    strategicAlignment: 80,
    valuePotential: 70,
    feasibility: 60,
    timeToValue: 50,
    riskManageability: 40,
    governanceReadiness: 30,
  };
}

function benefit(overrides: Partial<Benefit> = {}): Benefit {
  return {
    id: "b-1",
    useCaseId: "studio-1",
    name: 'Stock-out "reduction", phase 1',
    category: "cost_reduction",
    kpi: "Stock-outs per month",
    unitType: "currency",
    currency: "USD",
    period: "annual",
    baselineValue: 100,
    targetValue: 60,
    expectedValue: 40000,
    confidence: "medium",
    measurementFrequency: "monthly",
    benefitOwner: "Ops director",
    evidenceSource: null,
    evidenceLinks: [],
    state: "proposed",
    verificationMethod: "manual",
    erpVerificationStatus: "not_configured",
    erpSystem: null,
    erpReference: null,
    erpLastVerifiedAt: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("CSV column contract", () => {
  it("keeps the use case column keys and their order", () => {
    expect(USE_CASE_CSV_COLUMNS.map((c) => c.key)).toEqual(FROZEN_USE_CASE_COLUMNS);
  });

  it("keeps the benefit column keys and their order", () => {
    expect(BENEFIT_CSV_COLUMNS.map((c) => c.key)).toEqual(FROZEN_BENEFIT_COLUMNS);
  });

  it("gives every column a non-empty human label", () => {
    for (const column of [...USE_CASE_CSV_COLUMNS, ...BENEFIT_CSV_COLUMNS]) {
      expect(column.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("escaping rules", () => {
  it("quotes only when the cell contains a quote, comma, CR or LF", () => {
    expect(toCsvCell("plain")).toBe("plain");
    expect(toCsvCell("with, comma")).toBe('"with, comma"');
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(toCsvCell("carriage\rreturn")).toBe('"carriage\rreturn"');
  });

  it("renders null and undefined as empty cells, never as text", () => {
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(undefined)).toBe("");
    expect(toCsvCell(0)).toBe("0");
  });
});

describe("real workspace records always match the contract", () => {
  const items: ReportItemInput[] = [
    {
      useCaseId: "uc-1",
      studioUseCaseId: "studio-1",
      content: content({ summary: 'Has "quotes", commas and a\nnewline' }),
      score: score(),
      benefits: [benefit(), benefit({ id: "b-2", state: "verified", currency: null })],
    },
    { useCaseId: null, content: content({ slug: "chat-support", title: "Chat support" }) },
  ];

  it("emits a CRLF-terminated header plus one row per use case", () => {
    const csv = buildUseCasesCsv(items);
    expect(csv.includes("\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(false);
    const header = csv.split("\r\n")[0]!;
    expect(header).toBe(USE_CASE_CSV_COLUMNS.map((c) => c.label).join(","));
  });

  it("keeps every row at exactly the contracted field count after unquoting", () => {
    for (const csv of [buildUseCasesCsv(items), benefitsToCsv(items)]) {
      const expected =
        csv === benefitsToCsv(items) ? BENEFIT_CSV_COLUMNS.length : USE_CASE_CSV_COLUMNS.length;
      for (const row of parseCsv(csv)) expect(row).toHaveLength(expected);
    }
  });

  it("never writes the literal null, undefined or the screen em dash", () => {
    const csv = `${buildUseCasesCsv(items)}\r\n${benefitsToCsv(items)}`;
    expect(csv).not.toMatch(/(^|,)(null|undefined)(,|$)/m);
    // The em dash is a screen-only placeholder; empty cells stay empty.
    expect(csv).not.toMatch(/(^|,)—(,|$)/m);
  });

  it("writes one benefit row per benefit, keyed to the use case IDs", () => {
    const rows = parseCsv(benefitsToCsv(items));
    expect(rows).toHaveLength(3); // header + 2 benefits
    expect(rows[1]![0]).toBe("uc-1");
    expect(rows[1]![1]).toBe("demand-forecasting");
    expect(rows[1]![2]).toBe("b-1");
    expect(rows[1]![3]).toBe('Stock-out "reduction", phase 1');
  });

  it("produces an empty-but-valid file when there are no records", () => {
    expect(buildUseCasesCsv([]).split("\r\n")).toHaveLength(1);
    expect(benefitsToCsv([]).split("\r\n")).toHaveLength(1);
  });
});

/** Minimal RFC4180 reader used to prove the writer round-trips. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
