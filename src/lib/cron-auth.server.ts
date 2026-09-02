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

function presented(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (request.headers.get("x-cron-secret") ?? "").trim();
}

function sameSecret(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAuthorizedCron(request: Request): boolean {
  return sameSecret(presented(request), process.env["CRON_HOOK_SECRET"] ?? "");
}

/**
 * Scheduler-friendly variant.
 *
 * The database scheduler cannot read platform secrets, so each scheduled hook
 * also has a token row in `public.cron_hook_tokens` that only the service role
 * can read. Either the platform secret or that token authorises the call.
 */
export async function isAuthorizedCronHook(request: Request, hook: string): Promise<boolean> {
  if (isAuthorizedCron(request)) return true;
  const provided = presented(request);
  if (!provided) return false;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cron_hook_tokens")
      .select("token")
      .eq("name", hook)
      .maybeSingle();
    return sameSecret(provided, (data as { token?: string } | null)?.token ?? "");
  } catch {
    return false;
  }
}

