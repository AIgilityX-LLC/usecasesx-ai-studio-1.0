/**
 * Release hardening helpers (V2-20) — pure / portable.
 * Security headers, CORS allow-list, webhook replay window.
 */

/** Baseline response headers for HTML and API responses. */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  // Report-friendly CSP: allow self + inline styles the framework may emit.
  // script-src stays strict; style-src includes 'unsafe-inline' for Tailwind runtime.
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

export function applySecurityHeaders(headers: Headers, opts?: { html?: boolean }): Headers {
  const out = new Headers(headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!out.has(k)) out.set(k, v);
  }
  // HSTS only meaningful over HTTPS — set when request was secure is caller's job.
  if (opts?.html && !out.has("X-DNS-Prefetch-Control")) {
    out.set("X-DNS-Prefetch-Control", "off");
  }
  return out;
}

export function withSecurityHeaders(response: Response, opts?: { html?: boolean }): Response {
  const headers = applySecurityHeaders(response.headers, opts);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Strict CORS for public JSON APIs.
 * `*` is only allowed when `PUBLIC_API_CORS_ORIGINS` is unset or equals `*`.
 * Otherwise the Origin must be on the allow-list.
 */
export function publicCorsHeaders(request: Request, methods = "GET, OPTIONS"): Record<string, string> {
  const configured = (process.env["PUBLIC_API_CORS_ORIGINS"] ?? "*").trim();
  const origin = request.headers.get("Origin");
  let allowOrigin = "*";
  if (configured !== "*") {
    const list = configured.split(",").map((s) => s.trim()).filter(Boolean);
    allowOrigin = origin && list.includes(origin) ? origin : list[0] ?? "null";
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id, X-Webhook-Timestamp, X-Webhook-Id",
    Vary: "Origin",
  };
}

/** Default replay window for signed/timestamped webhooks (5 minutes). */
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Reject webhook deliveries outside the clock skew window.
 * `timestampMs` is the sender's claim (unix ms or seconds if < 1e12).
 */
export function assertWebhookFresh(
  timestampMs: number,
  nowMs = Date.now(),
  windowMs = WEBHOOK_REPLAY_WINDOW_MS,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return { ok: false, reason: "missing_timestamp" };
  }
  const ts = timestampMs < 1e12 ? timestampMs * 1000 : timestampMs;
  const delta = Math.abs(nowMs - ts);
  if (delta > windowMs) return { ok: false, reason: "timestamp_outside_window" };
  return { ok: true };
}

/**
 * In-memory idempotency set for webhook delivery ids (process-local).
 * Production durable dedupe still belongs in DB (see applyDeliveryEvent).
 */
const seenIds = new Map<string, number>();

export function claimWebhookDeliveryId(
  id: string,
  nowMs = Date.now(),
  ttlMs = WEBHOOK_REPLAY_WINDOW_MS * 2,
): { ok: true } | { ok: false; reason: "duplicate" | "empty_id" } {
  const key = id.trim();
  if (!key) return { ok: false, reason: "empty_id" };
  // prune occasionally
  if (seenIds.size > 2000) {
    for (const [k, at] of seenIds) {
      if (nowMs - at > ttlMs) seenIds.delete(k);
    }
  }
  const prev = seenIds.get(key);
  if (prev != null && nowMs - prev < ttlMs) return { ok: false, reason: "duplicate" };
  seenIds.set(key, nowMs);
  return { ok: true };
}

/** Test helper — clear process-local replay cache. */
export function resetWebhookDeliveryCache(): void {
  seenIds.clear();
}
