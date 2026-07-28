// Launch / rollout configuration for the public Lite + Pro launch.
// Some Pro capabilities ship after launch — they are surfaced as
// "Coming <month>" and drive users to the early-access waitlist.

export const PRO_BETA_LABEL = "Free Beta";

/** Human label for the next post-launch release window. */
export const NEXT_RELEASE_LABEL = "Aug 2026";

/**
 * Pro/Enterprise capabilities that are not in the launch build yet.
 * Match on the exact feature label used in pricing so cards and the
 * comparison table stay in sync from one source of truth.
 */
export const COMING_SOON_FEATURES = new Set<string>([
  "AI ideation co-pilot",
  "Portfolio Roadmap",
  "Advanced exports (PDF, Word, CSV)",
  "Portfolio Roadmap & optimizer",
  "Decision Provenance Report™",
]);

export function isComingSoon(label: string): boolean {
  return COMING_SOON_FEATURES.has(label);
}
