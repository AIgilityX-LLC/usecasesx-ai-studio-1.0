/**
 * Pilot participant roster parsing (pure).
 *
 * Accepts either a CSV/TSV roster (with or without a header row) or a plain
 * list of email addresses, and returns the participants that can be enrolled
 * plus a per-line reason for everything that was rejected. Nothing is inferred
 * silently: a row without a usable email becomes an issue, never a seat.
 */

/** Seats a single provisioning action may create — matches the cohort cap. */
export const ROSTER_MAX_ROWS = 25;

const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]{2,}$/;

export type RosterParticipant = {
  email: string;
  fullName: string | null;
  organization: string | null;
  notes: string | null;
};

export type RosterIssue = {
  /** 1-based line number in the uploaded file. */
  line: number;
  value: string;
  reason: string;
  /** Errors block the row; warnings enrol it with a note. */
  severity: "error" | "warning";
  /** Column the problem was found in, when it is column-specific. */
  field: keyof RosterParticipant | "row";
  /** What the operator should change in the file. */
  fix: string;
};

export type RosterParseResult = {
  participants: RosterParticipant[];
  issues: RosterIssue[];
  /** Addresses that appeared more than once in the file. */
  duplicates: string[];
  /** True when the file held more usable rows than one action may enrol. */
  truncated: boolean;
  /** Usable rows found before the cap was applied. */
  usableRows: number;
  /** Total non-empty data lines read from the file. */
  totalRows: number;
  /** Delimiter the parser detected, reported back so surprises are visible. */
  delimiter: "," | ";" | "\t";
};

/** Column order the parser recognises without any header mapping guesswork. */
export const ROSTER_TEMPLATE_COLUMNS = ["email", "full name", "organisation", "notes"] as const;

/** Sample rows shipped in the template so the expected formatting is obvious. */
export const ROSTER_TEMPLATE_SAMPLE_ROWS: readonly RosterParticipant[] = [
  {
    email: "aisha.rahman@example.gov",
    fullName: "Aisha Rahman",
    organization: "Ministry of Digital Government",
    notes: "Director, service transformation — cohort lead",
  },
  {
    email: "tom.becker@example.gov",
    fullName: "Tom Becker",
    organization: "National Revenue Agency",
    notes: "Head of automation; needs a Friday session",
  },
  {
    email: "l.moreau@example.org",
    fullName: "Léa Moreau",
    organization: "City of Lyon",
    notes: "",
  },
];

const templateCell = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Downloadable CSV template for cohort provisioning: the header row the parser
 * maps by name, plus sample rows that survive a round-trip through
 * `parseParticipantRoster` unchanged.
 */
export function buildRosterTemplateCsv(
  rows: readonly RosterParticipant[] = ROSTER_TEMPLATE_SAMPLE_ROWS,
): string {
  const body = rows.map((row) => [
    row.email,
    row.fullName ?? "",
    row.organization ?? "",
    row.notes ?? "",
  ]);
  return [[...ROSTER_TEMPLATE_COLUMNS], ...body]
    .map((row) => row.map(templateCell).join(","))
    .join("\r\n");
}

/** Short guidance shown next to the template download. */
export const ROSTER_TEMPLATE_NOTES: readonly string[] = [
  `Keep the header row: email, full name, organisation, notes.`,
  `Only email is required — the other columns may be left blank.`,
  `One participant per line, up to ${ROSTER_MAX_ROWS} seats per upload.`,
  `Comma, semicolon and tab separated files are all accepted, as is a plain list of addresses.`,
  `Wrap any value containing a comma in double quotes.`,
];

/** Splits one delimited line, honouring double-quoted fields. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      cells.push(field);
      field = "";
      continue;
    }
    field += ch;
  }
  cells.push(field);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts: [string, number][] = [
    ["\t", (sample.match(/\t/g) ?? []).length],
    [";", (sample.match(/;/g) ?? []).length],
    [",", (sample.match(/,/g) ?? []).length],
  ];
  const best = counts.sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}

const HEADER_ALIASES: Record<string, keyof RosterParticipant> = {
  email: "email",
  "email address": "email",
  "work email": "email",
  mail: "email",
  name: "fullName",
  "full name": "fullName",
  fullname: "fullName",
  participant: "fullName",
  organisation: "organization",
  organization: "organization",
  company: "organization",
  employer: "organization",
  notes: "notes",
  note: "notes",
  comment: "notes",
};

/** Positional fallback when the file carries no recognisable header row. */
const POSITIONAL: (keyof RosterParticipant)[] = ["email", "fullName", "organization", "notes"];

function clean(value: string | undefined, max: number): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

/**
 * Parses an uploaded roster. `maxRows` defaults to the cohort cap so the caller
 * can never submit more seats than one provisioning action allows.
 *
 * Every rejected line is reported with the column at fault and the change that
 * would make it importable; warnings still enrol the seat.
 */
export function parseParticipantRoster(
  text: string,
  options: { maxRows?: number } = {},
): RosterParseResult {
  const maxRows = Math.max(1, options.maxRows ?? ROSTER_MAX_ROWS);
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/);
  const issues: RosterIssue[] = [];
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  const usable: RosterParticipant[] = [];
  let totalRows = 0;

  let mapping: (keyof RosterParticipant | null)[] | null = null;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const cells = splitLine(line, delimiter);

    // Header row: recognised on the first non-empty line only.
    if (mapping === null) {
      const lowered = cells.map((cell) => cell.toLowerCase());
      const looksLikeHeader =
        lowered.some((cell) => cell in HEADER_ALIASES) &&
        !lowered.some((cell) => EMAIL_RE.test(cell));
      if (looksLikeHeader) {
        mapping = lowered.map((cell) => HEADER_ALIASES[cell] ?? null);
        const unknown = lowered.filter((cell) => cell && !(cell in HEADER_ALIASES));
        if (!mapping.includes("email")) {
          issues.push({
            line: index + 1,
            value: line,
            reason: "Header row has no email column.",
            severity: "error",
            field: "email",
            fix: `Rename a column to one of: ${Object.keys(HEADER_ALIASES)
              .filter((key) => HEADER_ALIASES[key] === "email")
              .join(", ")}.`,
          });
          mapping = null;
          return;
        }
        if (unknown.length > 0) {
          issues.push({
            line: index + 1,
            value: unknown.join(", "),
            reason: "Unrecognised column heading(s) — those columns are ignored.",
            severity: "warning",
            field: "row",
            fix: `Use the template headings: ${ROSTER_TEMPLATE_COLUMNS.join(", ")}.`,
          });
        }
        return;
      }
      mapping = POSITIONAL;
    }

    totalRows += 1;

    const fields: Record<keyof RosterParticipant, string | undefined> = {
      email: undefined,
      fullName: undefined,
      organization: undefined,
      notes: undefined,
    };
    (mapping as (keyof RosterParticipant | null)[]).forEach((key, column) => {
      if (!key) return;
      if (fields[key] === undefined) fields[key] = cells[column];
    });

    const email = (fields.email ?? "").trim().toLowerCase();
    if (!email) {
      issues.push({
        line: index + 1,
        value: line,
        reason: "No email address in this row.",
        severity: "error",
        field: "email",
        fix: "Add the participant's work email address in the first column.",
      });
      return;
    }
    if (/\s/.test(email)) {
      issues.push({
        line: index + 1,
        value: email,
        reason: "The email address contains a space.",
        severity: "error",
        field: "email",
        fix: "Remove spaces, or quote the field if it contains a comma.",
      });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      issues.push({
        line: index + 1,
        value: email,
        reason: email.includes("@")
          ? "The domain part is not a valid address (missing dot or top-level domain)."
          : "Not an email address — no @ found.",
        severity: "error",
        field: "email",
        fix: "Use the form name@organisation.gov.",
      });
      return;
    }
    const firstSeen = seen.get(email);
    if (firstSeen !== undefined) {
      if (!duplicates.includes(email)) duplicates.push(email);
      issues.push({
        line: index + 1,
        value: email,
        reason: `Duplicate address — already listed on line ${firstSeen}.`,
        severity: "error",
        field: "email",
        fix: "Delete one of the two rows; one seat per address.",
      });
      return;
    }
    seen.set(email, index + 1);

    if (!fields.fullName?.trim()) {
      issues.push({
        line: index + 1,
        value: email,
        reason: "No participant name — the invitation will read as unnamed.",
        severity: "warning",
        field: "fullName",
        fix: "Add the participant's full name in the second column.",
      });
    }
    if ((fields.notes ?? "").trim().length > 500) {
      issues.push({
        line: index + 1,
        value: email,
        reason: "Notes longer than 500 characters were shortened.",
        severity: "warning",
        field: "notes",
        fix: "Trim the note to 500 characters or fewer.",
      });
    }
    if ((fields.organization ?? "").trim().length > 160) {
      issues.push({
        line: index + 1,
        value: email,
        reason: "Organisation longer than 160 characters was shortened.",
        severity: "warning",
        field: "organization",
        fix: "Use the short organisation name.",
      });
    }

    usable.push({
      email,
      fullName: clean(fields.fullName, 120),
      organization: clean(fields.organization, 160),
      notes: clean(fields.notes, 500),
    });
  });

  const participants = usable.slice(0, maxRows);
  usable.slice(maxRows).forEach((participant) => {
    issues.push({
      line: 0,
      value: participant.email,
      reason: `Over the ${maxRows}-seat limit for one upload.`,
      severity: "error",
      field: "row",
      fix: `Split the roster into files of ${maxRows} rows or fewer.`,
    });
  });

  return {
    participants,
    issues,
    duplicates,
    truncated: usable.length > maxRows,
    usableRows: usable.length,
    totalRows,
    delimiter: delimiter as "," | ";" | "\t",
  };
}

/** Blocking problems only — warnings never stop an import. */
export function rosterErrors(result: RosterParseResult): RosterIssue[] {
  return result.issues.filter((issue) => issue.severity === "error");
}

export function rosterWarnings(result: RosterParseResult): RosterIssue[] {
  return result.issues.filter((issue) => issue.severity === "warning");
}

/** One-line human summary of the parse, shown above the issue list. */
export function summarizeRosterParse(result: RosterParseResult): string {
  const errors = rosterErrors(result).length;
  const warnings = rosterWarnings(result).length;
  const parts = [
    `${result.totalRows} row(s) read`,
    `${result.participants.length} seat(s) ready`,
    `${errors} blocked`,
  ];
  if (warnings > 0) parts.push(`${warnings} warning(s)`);
  if (result.truncated)
    parts.push(`${result.usableRows - result.participants.length} over the cap`);
  return parts.join(" · ");
}

const FIELD_LABEL: Record<RosterIssue["field"], string> = {
  email: "email",
  fullName: "full name",
  organization: "organisation",
  notes: "notes",
  row: "whole row",
};

export const ROSTER_REPORT_COLUMNS = [
  "Line",
  "Severity",
  "Column",
  "Value",
  "Problem",
  "How to fix",
] as const;

/**
 * Downloadable validation report for an upload: every rejected and flagged row
 * with the column at fault, so a file can be corrected offline and re-uploaded.
 */
export function buildRosterIssueReportCsv(
  result: RosterParseResult,
  context: { fileName?: string; generatedAt?: string } = {},
): string {
  const rows = result.issues.map((issue) => [
    issue.line > 0 ? String(issue.line) : "—",
    issue.severity === "error" ? "Error" : "Warning",
    FIELD_LABEL[issue.field],
    issue.value,
    issue.reason,
    issue.fix,
  ]);
  const preamble = [
    [`Pilot roster validation report`],
    [`File`, context.fileName ?? "roster upload"],
    [`Generated`, context.generatedAt ?? new Date().toISOString()],
    [`Summary`, summarizeRosterParse(result)],
    [],
  ];
  return [...preamble, [...ROSTER_REPORT_COLUMNS], ...rows]
    .map((row) => row.map(templateCell).join(","))
    .join("\r\n");
}
