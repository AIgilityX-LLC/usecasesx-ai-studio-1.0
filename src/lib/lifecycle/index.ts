/**
 * Canonical V2 lifecycle — states, transitions, status mapping, audit payloads.
 * Decision gate workflow lives in `src/lib/gates` (V2-10) and reuses this foundation.
 */

export * from "./states";
export * from "./transitions";
export * from "./map";
export * from "./audit";
export * from "./apply";
export * from "./canvas-sections";