/**
 * Authorized retrieval for AI grounding (server-only).
 * Returns only rows the caller's RLS-scoped client can already see.
 * Never elevates privileges; never returns secrets or full document bodies.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type GroundedSource = {
  id: string;
  kind: "use_case" | "opportunity" | "evidence" | "repository";
  title: string;
  excerpt: string;
};

export type AuthorizedRetrieval = {
  sources: GroundedSource[];
  /** Redacted prompt block listing sources for the model. */
  promptBlock: string;
};

function excerpt(text: string | null | undefined, max = 240): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * Load a small, purpose-bound context pack. All reads use the caller's client
 * so RLS remains the security boundary.
 */
export async function retrieveAuthorizedContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: {
    useCaseIds?: string[];
    opportunityIds?: string[];
    evidenceSubjectId?: string;
    maxItems?: number;
  },
): Promise<AuthorizedRetrieval> {
  const max = Math.min(input.maxItems ?? 12, 20);
  const sources: GroundedSource[] = [];

  if (input.useCaseIds?.length) {
    const { data } = await supabase
      .from("ai_use_cases")
      .select("id, title, problem_statement, future_state")
      .in("id", input.useCaseIds.slice(0, max));
    for (const row of data ?? []) {
      sources.push({
        id: row.id as string,
        kind: "use_case",
        title: (row.title as string) || "Use case",
        excerpt: excerpt(
          [row.problem_statement, row.future_state].filter(Boolean).join(" · ") as string,
        ),
      });
    }
  }

  if (input.opportunityIds?.length && sources.length < max) {
    const { data } = await supabase
      .from("opportunities")
      .select("id, title, pain_point, desired_outcome")
      .in("id", input.opportunityIds.slice(0, max - sources.length));
    for (const row of data ?? []) {
      sources.push({
        id: row.id as string,
        kind: "opportunity",
        title: (row.title as string) || "Opportunity",
        excerpt: excerpt(
          [row.pain_point, row.desired_outcome].filter(Boolean).join(" · ") as string,
        ),
      });
    }
  }

  if (input.evidenceSubjectId && sources.length < max) {
    const { data } = await supabase
      .from("evidence_items")
      .select("id, title, kind, note, url")
      .eq("subject_id", input.evidenceSubjectId)
      .is("deleted_at", null)
      .limit(max - sources.length);
    for (const row of data ?? []) {
      sources.push({
        id: row.id as string,
        kind: "evidence",
        title: (row.title as string) || (row.kind as string) || "Evidence",
        excerpt: excerpt((row.note as string) || (row.url as string) || ""),
      });
    }
  }

  const promptBlock = sources.length
    ? [
        "Authorized grounded sources (cite by id; do not invent sources):",
        ...sources.map(
          (s) => `- [${s.id}] (${s.kind}) ${s.title}${s.excerpt ? `: ${s.excerpt}` : ""}`,
        ),
      ].join("\n")
    : "No authorized grounded sources were supplied.";

  return { sources, promptBlock };
}
