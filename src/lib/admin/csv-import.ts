/**
 * Validated CSV import for the global use case catalogue.
 *
 * Pure planning layer: parse → validate → plan. Nothing is written until the
 * platform admin confirms the plan, and every row carries its own outcome so
 * a partial failure never rolls the whole file back into an unknown state.
 */

import {
  hasBlockingIssues,
  slugify,
  validateUseCaseDraft,
  type ValidationIssue,
} from "./content-validation";

export type DuplicateStrategy = "skip" | "update" | "create_new";

export const IMPORT_COLUMNS = [
  "title",
  "slug",
  "summary",
  "business_problem",
  "ai_solution",
  "industry",
  "business_function",
  "ai_capability",
  "value_potential",
  "complexity",
  "risk_level",
  "source_status",
  "quality_status",
  "provenance",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_COLUMNS: ImportColumn[] = ["title", "summary"];

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  /** File-level problems (missing required column, empty file, …). */
  fileErrors: string[];
}

/** Minimal RFC4180-ish parser: quoted fields, escaped quotes, CRLF tolerant. */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) {
    return { headers: [], rows: [], fileErrors: ["The file is empty."] };
  }

  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const fileErrors: string[] = [];
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) fileErrors.push(`Missing required column "${required}".`);
  }

  const dataRows = nonEmpty.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? "").trim();
    });
    return record;
  });

  if (dataRows.length === 0) fileErrors.push("The file has a header but no data rows.");

  return { headers, rows: dataRows, fileErrors };
}

export type RowAction = "create" | "update" | "skip" | "error";

export interface PlannedRow {
  /** 1-based row number as seen in the spreadsheet (header is row 1). */
  lineNumber: number;
  action: RowAction;
  reason?: string;
  issues: ValidationIssue[];
  /** Existing record this row matched, when duplicate. */
  existingId?: string;
  values: {
    title: string;
    slug: string;
    summary: string;
    businessProblem: string;
    aiSolution: string;
    industry: string;
    businessFunction: string;
    aiType: string;
    valuePotential: string;
    complexity: string;
    riskLevel: string;
    sourceStatus: string;
    qualityStatus: string;
    provenance: string;
  };
}

export interface ImportPlan {
  rows: PlannedRow[];
  fileErrors: string[];
  summary: { total: number; create: number; update: number; skip: number; error: number };
}

export interface PlanOptions {
  /** slug → existing use case id. */
  existingBySlug: Record<string, string>;
  strategy: DuplicateStrategy;
  /** Known taxonomy slugs; unknown values become row errors so references stay intact. */
  knownIndustries?: string[];
  knownFunctions?: string[];
  knownCapabilities?: string[];
}

export function buildImportPlan(parsed: ParsedCsv, options: PlanOptions): ImportPlan {
  const seenSlugs = new Map<string, number>();
  const known = {
    industry: new Set(options.knownIndustries ?? []),
    businessFunction: new Set(options.knownFunctions ?? []),
    aiType: new Set(options.knownCapabilities ?? []),
  };

  const rows: PlannedRow[] = parsed.rows.map((raw, index) => {
    const lineNumber = index + 2;
    const title = raw.title ?? "";
    const providedSlug = (raw.slug ?? "").trim().toLowerCase();
    const slug = providedSlug || slugify(title);
    const values = {
      title,
      slug,
      summary: raw.summary ?? "",
      businessProblem: raw.business_problem ?? "",
      aiSolution: raw.ai_solution ?? "",
      industry: (raw.industry ?? "").trim().toLowerCase(),
      businessFunction: (raw.business_function ?? "").trim().toLowerCase(),
      aiType: (raw.ai_capability ?? "").trim().toLowerCase(),
      valuePotential: raw.value_potential ?? "",
      complexity: raw.complexity ?? "",
      riskLevel: raw.risk_level ?? "",
      sourceStatus: (raw.source_status ?? "imported").trim().toLowerCase(),
      qualityStatus: (raw.quality_status ?? "unverified").trim().toLowerCase(),
      provenance: raw.provenance ?? "",
    };

    // Imports always land as drafts, so validate against the draft gate.
    const issues = validateUseCaseDraft(values, "draft");

    for (const [field, set] of [
      ["industry", known.industry],
      ["businessFunction", known.businessFunction],
      ["aiType", known.aiType],
    ] as const) {
      const value = values[field];
      if (value && set.size > 0 && !set.has(value)) {
        issues.push({
          field,
          message: `Unknown taxonomy value "${value}" — create it in Taxonomy admin first.`,
          severity: "error",
        });
      }
    }

    const duplicateInFile = seenSlugs.get(slug);
    if (duplicateInFile) {
      issues.push({
        field: "slug",
        message: `Duplicate slug inside this file (also on row ${duplicateInFile}).`,
        severity: "error",
      });
    } else if (slug) {
      seenSlugs.set(slug, lineNumber);
    }

    if (hasBlockingIssues(issues)) {
      return { lineNumber, action: "error", issues, values, reason: "Row failed validation." };
    }

    const existingId = options.existingBySlug[slug];
    if (existingId) {
      if (options.strategy === "skip") {
        return {
          lineNumber,
          action: "skip",
          issues,
          values,
          existingId,
          reason: "Slug already exists — skipped.",
        };
      }
      if (options.strategy === "update") {
        return {
          lineNumber,
          action: "update",
          issues,
          values,
          existingId,
          reason: "Existing record will be updated.",
        };
      }
      const unique = uniqueSlug(slug, options.existingBySlug, seenSlugs);
      seenSlugs.set(unique, lineNumber);
      return {
        lineNumber,
        action: "create",
        issues,
        values: { ...values, slug: unique },
        reason: `Duplicate slug — will be created as "${unique}".`,
      };
    }

    return { lineNumber, action: "create", issues, values };
  });

  const summary = {
    total: rows.length,
    create: rows.filter((r) => r.action === "create").length,
    update: rows.filter((r) => r.action === "update").length,
    skip: rows.filter((r) => r.action === "skip").length,
    error: rows.filter((r) => r.action === "error").length,
  };

  return { rows, fileErrors: parsed.fileErrors, summary };
}

function uniqueSlug(
  base: string,
  existingBySlug: Record<string, string>,
  seen: Map<string, number>,
): string {
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${base}-${n}`;
    if (!existingBySlug[candidate] && !seen.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export interface RowOutcome {
  lineNumber: number;
  slug: string;
  status: "created" | "updated" | "skipped" | "failed";
  message?: string;
}

export function summarizeOutcomes(outcomes: RowOutcome[]) {
  return {
    created: outcomes.filter((o) => o.status === "created").length,
    updated: outcomes.filter((o) => o.status === "updated").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
  };
}
