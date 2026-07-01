import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FOUNDING_UNTIL_ISO, isEligibleEmail } from "./entitlements";

export type ClaimResult =
  | { status: "granted"; expiresAt: string; email: string }
  | { status: "already"; expiresAt: string; email: string }
  | { status: "unverified"; email: string }
  | { status: "ineligible"; email: string };

/**
 * Signup grant flow. Called after a user signs in with a verified email.
 * Eligible founding members (verified work-email accounts) are granted Pro
 * entitlement gratis until 31 Dec 2026. Non-eligible users are told to join
 * the Free Pro waitlist instead. The write is performed with the service role
 * so entitlement is authoritative rather than client-controlled.
 */
export const claimFoundingAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClaimResult> => {
    const { supabase, userId } = context;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const email = user?.email ?? "";
    const verified = !!user?.email_confirmed_at || !!user?.confirmed_at;

    if (!verified) return { status: "unverified", email };
    if (!isEligibleEmail(email)) return { status: "ineligible", email };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("founding_member, entitlement_tier, entitlement_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.founding_member && existing.entitlement_tier === "pro") {
      return {
        status: "already",
        expiresAt: existing.entitlement_expires_at ?? FOUNDING_UNTIL_ISO,
        email,
      };
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        entitlement_tier: "pro",
        entitlement_expires_at: FOUNDING_UNTIL_ISO,
        founding_member: true,
        plan_type: "pro_free",
      })
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return { status: "granted", expiresAt: FOUNDING_UNTIL_ISO, email };
  });
