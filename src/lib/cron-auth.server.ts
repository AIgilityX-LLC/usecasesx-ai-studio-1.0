/**
 * Shared secret verification for scheduled `/api/public/hooks/*` endpoints.
 *
 * These endpoints run privileged maintenance work, so they must never be
 * gated on the project publishable key — that value is public by design.
 */

import { timingSafeEqual } from "node:crypto";

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function isAuthorizedCron(request: Request): boolean {
  const expected = process.env["CRON_HOOK_SECRET"] ?? "";
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (request.headers.get("x-cron-secret") ?? "").trim();
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
