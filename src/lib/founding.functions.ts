import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClaimResult =
  | { status: "granted"; expiresAt: string; email: string }
  | { status: "already"; expiresAt: string; email: string }
  | { status: "unverified"; email: string }
  | { status: "ineligible"; email: string }
  /** Self-serve Pro grant removed — requests must go through admin review. */
  | { status: "review_required"; email: string };

/**
 * LEGACY surface — previously auto-granted Pro Founding Access to any
 * authenticated user with an "eligible" work email (no admin review).
 * That path is a security gap and is permanently disabled.
 *
 * Callers must use the Founding Access request modal + admin approve/invite
 * flow instead (`submitFoundingAccessRequestFn` / admin queue).
 */
export const claimFoundingAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClaimResult> => {
    const { data: userData } = await context.supabase.auth.getUser();
    const email = userData?.user?.email ?? "";
    return { status: "review_required", email };
  });
