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
};

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
 */
export function parseParticipantRoster(
  text: string,
  options: { maxRows?: number } = {},
): RosterParseResult {
  const maxRows = Math.max(1, options.maxRows ?? ROSTER_MAX_ROWS);
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/);
  const issues: RosterIssue[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const usable: RosterParticipant[] = [];

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
        if (!mapping.includes("email")) {
          issues.push({
            line: index + 1,
            value: line,
            reason: "Header row has no email column — add an `email` column.",
          });
          mapping = null;
        }
        return;
      }
      mapping = POSITIONAL;
    }

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
      issues.push({ line: index + 1, value: line, reason: "No email address in this row." });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      issues.push({ line: index + 1, value: email, reason: "Not a valid email address." });
      return;
    }
    if (seen.has(email)) {
      if (!duplicates.includes(email)) duplicates.push(email);
      issues.push({ line: index + 1, value: email, reason: "Duplicate address in this file." });
      return;
    }
    seen.add(email);
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
    });
  });

  return {
    participants,
    issues,
    duplicates,
    truncated: usable.length > maxRows,
    usableRows: usable.length,
  };
}
