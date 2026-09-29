/**
 * Maps existing domain statuses onto canonical V2 lifecycle states.
 * Unmapped values are reported explicitly — never silently coerced.
 */

import type { CanonicalState } from "./states";
import { isCanonicalState } from "./states";

export type StatusDomain =
  | "opportunity"
  | "use_case"
  | "wizard"
  | "submission"
  | "collab_review"
  | "benefit"
  | "maturity_stage"
  | "content_status"
  | "portfolio"
  | "handoff_lifecycle";

export type StatusMappingResult =
  | { ok: true; canonical: CanonicalState; domain: StatusDomain; source: string }
  | { ok: false; canonical: null; domain: StatusDomain; source: string; reason: "unmapped" };

/** Known source → canonical mappings. Keys are lowercased for lookup. */
const MAPS: Record<StatusDomain, Record<string, CanonicalState>> = {
  opportunity: {
    signal: "idea",
    opportunity: "triage",
    qualified: "designing",
    converted: "designing",
    deferred: "on_hold",
    archived: "archived",
  },
  use_case: {
    draft: "designing",
    review: "under_review",
    submitted_for_review: "under_review",
    approved: "approved_pilot",
    published: "production",
    unpublished: "on_hold",
    archived: "archived",
  },
  wizard: {
    idea: "idea",
    in_design: "designing",
    defined: "review_ready",
    archived: "archived",
  },
  submission: {
    draft: "idea",
    submitted: "review_ready",
    in_review: "under_review",
    approved: "approved_pilot",
    rejected: "rejected",
  },
  collab_review: {
    draft: "designing",
    ready_for_review: "review_ready",
    reviewed: "under_review",
    approved_for_portfolio: "approved_pilot",
    deferred: "on_hold",
    archived: "archived",
  },
  benefit: {
    proposed: "idea",
    approved: "approved_pilot",
    delivered: "production",
    verified: "measuring",
    sustained: "measuring",
  },
  maturity_stage: {
    concept: "idea",
    prototype: "designing",
    pilot: "pilot",
    production: "production",
    scaled: "approved_scale",
  },
  content_status: {
    draft: "designing",
    submitted_for_review: "under_review",
    approved: "review_ready",
    published: "production",
    unpublished: "on_hold",
    deprecated: "retired",
    archived: "archived",
  },
  portfolio: {
    draft: "designing",
    active: "production",
    archived: "archived",
  },
  handoff_lifecycle: {
    concept: "idea",
    prototype: "designing",
    pilot: "pilot",
    production: "production",
    scaled: "approved_scale",
  },
};

/**
 * Values observed in code/schema that do **not** map to a canonical state.
 * Preserved for the status-map report; do not coerce these.
 */
export const UNMAPPED_STATUS_VALUES: ReadonlyArray<{
  domain: StatusDomain | "other";
  value: string;
  note: string;
}> = [
  {
    domain: "other",
    value: "boards.status=active",
    note: "Board operational flag, not a use-case lifecycle state.",
  },
  {
    domain: "other",
    value: "pilot_invitation.*",
    note: "Pilot enrollment lifecycle (invited/accepted/revoked) is a separate domain.",
  },
  {
    domain: "other",
    value: "pilot_milestone.changes_requested",
    note: "Milestone review outcome; maps conceptually to under_review but kept local until V2-10.",
  },
  {
    domain: "other",
    value: "lead.*",
    note: "CRM lead statuses are outside the Studio lifecycle.",
  },
  {
    domain: "other",
    value: "handoff.request status completed|declined",
    note: "Suite handoff request status ≠ canonical use-case lifecycle.",
  },
  {
    domain: "other",
    value: "feedback.resolved|declined",
    note: "Support/feedback ticket states.",
  },
  {
    domain: "portfolio",
    value: "Draft|Active|Archived (Title Case)",
    note: "Mapped via lowercased keys; raw Title Case strings normalize correctly.",
  },
];

export function mapStatus(domain: StatusDomain, raw: string | null | undefined): StatusMappingResult {
  const source = (raw ?? "").trim();
  if (!source) {
    return { ok: false, canonical: null, domain, source: "", reason: "unmapped" };
  }
  if (isCanonicalState(source)) {
    return { ok: true, canonical: source, domain, source };
  }
  const key = source.toLowerCase().replace(/\s+/g, "_");
  const canonical = MAPS[domain][key] ?? MAPS[domain][source.toLowerCase()];
  if (!canonical) {
    return { ok: false, canonical: null, domain, source, reason: "unmapped" };
  }
  return { ok: true, canonical, domain, source };
}

/** Map or throw — for server paths that refuse to proceed on unknown status. */
export function requireMappedStatus(
  domain: StatusDomain,
  raw: string | null | undefined,
): CanonicalState {
  const result = mapStatus(domain, raw);
  if (!result.ok || !result.canonical) {
    throw new Error(`Unmapped ${domain} status: ${JSON.stringify(raw)}`);
  }
  return result.canonical;
}

/** Snapshot of every known mapping for docs / migration backfill reports. */
export function allKnownMappings(): Array<{
  domain: StatusDomain;
  source: string;
  canonical: CanonicalState;
}> {
  const out: Array<{ domain: StatusDomain; source: string; canonical: CanonicalState }> = [];
  for (const domain of Object.keys(MAPS) as StatusDomain[]) {
    for (const [source, canonical] of Object.entries(MAPS[domain])) {
      out.push({ domain, source, canonical });
    }
  }
  return out;
}
