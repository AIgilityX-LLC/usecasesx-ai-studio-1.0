/**
 * Client analytics session.
 *
 * A random, non-identifying id kept for the browser session so funnel steps
 * can be stitched together without storing anything about the person.
 */
const SESSION_KEY = "usecasex_session_id";

export function ensureAnalyticsSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return null;
  }
}
