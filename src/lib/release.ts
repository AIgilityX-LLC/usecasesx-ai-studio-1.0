/**
 * Single source of truth for the release candidate identity.
 *
 * Pure data + pure helpers only — safe to import from client and server code.
 * The build ID is injected at build time where available (CI sets
 * VITE_BUILD_ID to the commit sha); locally it degrades to "local" rather than
 * inventing a value.
 */

/** Semantic version of the candidate under freeze. */
export const RELEASE_VERSION = "1.0.0-rc.1" as const;

/** Human release name used in docs, notes and the footer marker. */
export const RELEASE_NAME = "Lite + Pro Founding Access" as const;

/** Planned general-availability date for this candidate (ISO date). */
export const RELEASE_TARGET_DATE = "2026-08-14" as const;

/** Date scope was frozen; only P0 fixes and approved copy land after this. */
export const RELEASE_FREEZE_DATE = "2026-08-11" as const;

/** Release marker used for branch/tag naming and the candidate record. */
export const RELEASE_MARKER = "release/2026-08-14" as const;

/** Channel of the running build. */
export type ReleaseChannel = "rc" | "dev";

/**
 * Build identifier: commit sha when the pipeline provides it, otherwise
 * "local". Never fabricated.
 */
export function releaseBuildId(): string {
  const injected = import.meta.env?.["VITE_BUILD_ID"];
  return typeof injected === "string" && injected.trim().length > 0
    ? injected.trim().slice(0, 12)
    : "local";
}

export function releaseChannel(): ReleaseChannel {
  return import.meta.env?.["PROD"] ? "rc" : "dev";
}

/** Compact marker for UI surfaces, e.g. `v1.0.0-rc.1 · a1b2c3d4e5f6`. */
export function releaseLabel(): string {
  return `v${RELEASE_VERSION} · ${releaseBuildId()}`;
}
