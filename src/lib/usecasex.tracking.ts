// Lightweight client-side CTA tracking placeholder.
// Replace with a real analytics sink (PostHog, Segment, server fn) later.

export type CtaEvent =
  | "view_use_case"
  | "filter_used"
  | "search_used"
  | "custom_use_case_requested";

export function track(event: CtaEvent, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.debug("[usecasex:track]", event, payload ?? {});
}
