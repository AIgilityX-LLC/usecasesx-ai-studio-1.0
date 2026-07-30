import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const completeSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  purpose: z.string().trim().max(80).optional().nullable(),
  organizationName: z.string().trim().min(1).max(120),
  workspaceName: z.string().trim().min(1).max(120).optional().nullable(),
  role: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  functions: z.array(z.string().trim().max(120)).max(12).default([]),
  outcome: z.string().trim().max(120).optional().nullable(),
});

export type OnboardingInput = z.input<typeof completeSchema>;

/**
 * Read-only onboarding state for the signed-in user. Used to decide whether the
 * wizard should run at all, so returning users are never re-onboarded.
 */
export const getOnboardingStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, organization, role, country, industry, main_ai_interest, profile_completed",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    return {
      completed: Boolean(profile?.profile_completed),
      emailVerified: Boolean(user?.email_confirmed_at ?? user?.confirmed_at),
      profile: {
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? user?.email ?? "",
        organization: profile?.organization ?? "",
        role: profile?.role ?? "",
        country: profile?.country ?? "",
        industry: profile?.industry ?? "",
        outcome: profile?.main_ai_interest ?? "",
      },
    };
  });

/**
 * Idempotent activation step: provisions (or reuses) the caller's organization
 * and default workspace, names them, and stores the onboarding answers on the
 * profile. Safe to call repeatedly — nothing is duplicated and nothing is
 * destructively renamed once the user has customised a name.
 */
export const completeOnboardingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => completeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Persist profile answers under the caller's own RLS scope.
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        full_name: data.fullName,
        organization: data.organizationName,
        role: data.role || null,
        country: data.country || null,
        industry: data.industry || null,
        main_ai_interest: data.outcome || null,
        profile_completed: true,
      } as never,
      { onConflict: "user_id" },
    );
    if (profileError) throw new Error(profileError.message);

    // 2. Idempotent org + workspace provisioning (SECURITY DEFINER helper).
    const { data: workspaceId, error: provisionError } = await supabaseAdmin.rpc(
      "ensure_user_workspace" as never,
      { _user_id: userId } as never,
    );
    if (provisionError) throw provisionError;

    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, organization_id")
      .eq("id", workspaceId as unknown as string)
      .maybeSingle();
    if (!workspace) throw new Error("Workspace could not be resolved.");

    const organizationId = workspace.organization_id;

    // 3. Name the org/workspace — only when the caller owns/admins the org.
    const { data: membership } = await supabaseAdmin
      .from("organization_members" as never)
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    const orgRole = (membership as { role?: string } | null)?.role ?? null;
    const canRename = orgRole === "owner" || orgRole === "admin";

    if (canRename) {
      await supabaseAdmin
        .from("organizations")
        .update({ name: data.organizationName, industry: data.industry || null })
        .eq("id", organizationId);

      const desiredWorkspace = (data.workspaceName || "").trim();
      if (desiredWorkspace) {
        await supabaseAdmin
          .from("workspaces")
          .update({ name: desiredWorkspace })
          .eq("id", workspace.id);
      }
    }

    return {
      organizationId,
      workspaceId: workspace.id as string,
      workspaceName: (data.workspaceName || workspace.name) as string,
      renamed: canRename,
    };
  });
