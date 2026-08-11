/**
 * Keyword relevance ranking for repository search.
 *
 * The database filter (ILIKE across the searchable columns) decides *which*
 * rows match; this module decides *what order* they come back in. Ranking is
 * deliberately field-weighted: a term in the title matters far more than the
 * same term buried in a solution description.
 */

/** Max rows pulled into memory for ranking before the page slice is taken. */
export const RANK_POOL_SIZE = 300;

/** Split a raw query into distinct, meaningful lowercase terms. */
export function searchTerms(raw: string): string[] {
  const terms = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  return Array.from(new Set(terms)).slice(0, 8);
}

/** Field weights — title first, then summary, then long-form body copy. */
const FIELD_WEIGHTS: Array<[string, number]> = [
  ["title", 12],
  ["summary", 5],
  ["organization", 3],
  ["business_problem", 2],
  ["ai_solution_concept", 2],
];

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/**
 * Score one row against the query terms. Higher is more relevant.
 * Bonuses: whole-word hits, title prefix, and covering every term.
 */
export function relevanceScore(row: Record<string, unknown>, terms: string[], raw: string): number {
  if (terms.length === 0) return 0;
  const title = String(row["title"] ?? "").toLowerCase();
  const phrase = raw.trim().toLowerCase();
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    let termScore = 0;
    for (const [field, weight] of FIELD_WEIGHTS) {
      const value = String(row[field] ?? "").toLowerCase();
      if (!value) continue;
      const hits = occurrences(value, term);
      if (hits === 0) continue;
      // Diminishing returns on repeats so keyword stuffing cannot dominate.
      termScore += weight * (1 + Math.min(hits - 1, 3) * 0.25);
      if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u").test(value)) {
        termScore += weight * 0.5;
      }
    }
    if (termScore > 0) matchedTerms += 1;
    score += termScore;
  }

  // Reward rows that satisfy the whole query, not just one term.
  if (matchedTerms === terms.length) score *= 1 + 0.15 * terms.length;
  // Exact phrase and title-prefix hits are the strongest intent signals.
  if (phrase.length > 2 && title.includes(phrase)) score += 20;
  if (phrase.length > 2 && title.startsWith(phrase)) score += 10;
  // Gentle nudge from editorial impact so equally relevant rows order sensibly.
  const impact = Number(row["impact_score"] ?? 0);
  if (Number.isFinite(impact)) score += Math.min(impact, 100) * 0.02;
  return score;
}

/** Rank matched rows by relevance, keeping a deterministic tiebreak. */
export function rankByRelevance<T extends Record<string, unknown>>(
  rows: T[],
  raw: string,
  terms: string[],
): T[] {
  return rows
    .map((row, index) => ({ row, index, score: relevanceScore(row, terms, raw) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.row);
}
