/**
 * Server functions reject unauthenticated callers by throwing, and TanStack
 * serialises that rejection into a 200 response with an error envelope — so a
 * status-code check never sees it. Journey surfaces must inspect the message
 * instead, otherwise a signed-out visitor gets a raw "Unauthorized" toast (or
 * nothing at all) and believes their work was saved.
 */

const UNAUTHORIZED_HINTS = [
  "unauthorized",
  "no authorization header",
  "jwt expired",
  "invalid claim",
  "not authenticated",
];

export function isUnauthorizedError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lowered = message.toLowerCase();
  return UNAUTHORIZED_HINTS.some((hint) => lowered.includes(hint));
}

/** Sign-in link that returns the visitor to where they were. */
export function signInHref(redirectTo?: string): string {
  const target =
    redirectTo ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");
  const safe = target.startsWith("/") && !target.startsWith("//") ? target : "/";
  return `/auth?redirect=${encodeURIComponent(safe)}`;
}

/** Message shown when work could not be saved because the session is missing. */
export const SIGN_IN_TO_SAVE =
  "Sign in to save. Your draft is kept on this device until you do.";
