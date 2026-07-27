/**
 * Centralized, user-safe error normalization for UseCasesX™ domain services.
 *
 * Every repository/service in `src/lib/domain` throws a `DomainError`. UI code
 * renders `error.userMessage` — never a raw Postgres/PostgREST string, which can
 * leak table names, policy names or column layouts.
 */

export type DomainErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "network"
  | "unknown";

const USER_MESSAGES: Record<DomainErrorKind, string> = {
  unauthenticated: "Please sign in to continue.",
  forbidden: "You do not have access to this item.",
  not_found: "We could not find that item.",
  conflict: "That item already exists.",
  validation: "Please check the highlighted fields and try again.",
  network: "We could not reach the service. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

export class DomainError extends Error {
  readonly kind: DomainErrorKind;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(kind: DomainErrorKind, userMessage?: string, cause?: unknown) {
    super(userMessage ?? USER_MESSAGES[kind]);
    this.name = "DomainError";
    this.kind = kind;
    this.userMessage = userMessage ?? USER_MESSAGES[kind];
    this.cause = cause;
  }
}

type SupabaseLikeError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
};

/** Maps Postgres / PostgREST codes onto domain error kinds. */
export function classifyDatabaseError(error: SupabaseLikeError | null | undefined): DomainErrorKind {
  if (!error) return "unknown";
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
    return "forbidden";
  }
  if (code === "23505" || message.includes("duplicate key")) return "conflict";
  if (code === "23503" || code === "23502" || code === "22P02" || code === "23514") return "validation";
  if (code === "PGRST116" || error.status === 404) return "not_found";
  if (error.status === 401) return "unauthenticated";
  if (error.status === 403) return "forbidden";
  if (message.includes("failed to fetch") || message.includes("network")) return "network";
  return "unknown";
}

/** Converts any thrown value into a `DomainError`. Never throws itself. */
export function normalizeError(error: unknown, fallbackMessage?: string): DomainError {
  if (error instanceof DomainError) return error;

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    if ("code" in candidate || "details" in candidate || "hint" in candidate) {
      const kind = classifyDatabaseError(candidate);
      return new DomainError(kind, kind === "unknown" ? fallbackMessage : undefined, error);
    }
  }
  if (error instanceof Error) {
    const kind = classifyDatabaseError({ message: error.message });
    return new DomainError(kind, kind === "unknown" ? (fallbackMessage ?? error.message) : undefined, error);
  }
  return new DomainError("unknown", fallbackMessage, error);
}

/** Single helper UI components use to render an error toast/state. */
export function toUserMessage(error: unknown, fallbackMessage?: string): string {
  return normalizeError(error, fallbackMessage).userMessage;
}

/** Unwraps a Supabase `{ data, error }` result into data or a `DomainError`. */
export function unwrapResult<T>(
  result: { data: T | null; error: SupabaseLikeError | null },
  options: { notFoundMessage?: string; allowNull?: boolean } = {},
): T {
  if (result.error) throw normalizeError(result.error);
  if (result.data === null || result.data === undefined) {
    if (options.allowNull) return result.data as T;
    throw new DomainError("not_found", options.notFoundMessage);
  }
  return result.data;
}
