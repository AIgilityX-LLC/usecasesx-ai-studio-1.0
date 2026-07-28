/**
 * Shared AI boundary types. Client-safe — no provider details, no secrets.
 *
 * Every AI call returns an `AiResult` envelope. Callers branch on `ok`; the
 * UI never sees a raw provider error string.
 */

import type { AiTask } from "./prompts";
import type { ProviderAlias } from "./models";

export type AiErrorKind =
  | "not_configured"
  | "unauthenticated"
  | "forbidden"
  | "rate_limited"
  | "fair_use_exceeded"
  | "credits_exhausted"
  | "timeout"
  | "invalid_output"
  | "upstream"
  | "network";

/** User-safe copy for every failure mode. Provider text is never surfaced. */
export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  not_configured: "AI assistance is not configured for this environment.",
  unauthenticated: "Please sign in to use AI assistance.",
  forbidden: "Your plan does not include AI assistance for this action.",
  rate_limited: "AI assistance is busy right now. Please try again in a moment.",
  fair_use_exceeded:
    "You have reached the Founding Access fair-use limit for AI assistance today. It resets tomorrow.",
  credits_exhausted: "AI assistance is temporarily unavailable. Please try again later.",
  timeout: "AI assistance took too long to respond. Please try again.",
  invalid_output: "AI assistance returned an unusable response. Please try again.",
  upstream: "AI assistance is temporarily unavailable. Please try again later.",
  network: "We could not reach AI assistance. Please check your connection and try again.",
};

/**
 * Provenance stamped on every generated artefact. Stored alongside the output
 * so an AI-produced field is always distinguishable from human-authored text.
 */
export type AiProvenance = {
  task: AiTask;
  /** Provider-neutral alias the caller requested, if any. */
  providerAlias: ProviderAlias | null;
  /** Resolved gateway model id — recorded for attribution, not for display. */
  model: string;
  promptVersion: string;
  generatedAt: string;
  durationMs: number;
  /** Always true. Present so consumers can assert before overwriting text. */
  aiGenerated: true;
};

export type AiFairUse = {
  /** Requests already made in the current window. */
  used: number;
  /** Requests allowed in the window. */
  limit: number;
  /** ISO timestamp when the window resets. */
  resetsAt: string;
};

export type AiSuccess<T> = {
  ok: true;
  data: T;
  provenance: AiProvenance;
  fairUse: AiFairUse | null;
  error: null;
};

export type AiFailure = {
  ok: false;
  data: null;
  provenance: null;
  fairUse: AiFairUse | null;
  errorKind: AiErrorKind;
  /** User-safe message. Safe to render directly. */
  error: string;
};

export type AiResult<T> = AiSuccess<T> | AiFailure;

export function aiFailure(kind: AiErrorKind, fairUse: AiFairUse | null = null): AiFailure {
  return {
    ok: false,
    data: null,
    provenance: null,
    fairUse,
    errorKind: kind,
    error: AI_ERROR_MESSAGES[kind],
  };
}
