/**
 * Pilot onboarding persistence (server-only).
 *
 * Reads and writes go through the caller's RLS-scoped client, so a participant
 * only ever touches their own intake row. Activating the seat is the one write
 * the participant cannot make themselves (the invitation table is admin-owned),
 * so it goes through the service client after the intake has been accepted.
 */

import type { PilotOnboardingInput, PilotOnboardingProfile } from "./pilot.onboarding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(row: any): PilotOnboardingProfile {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    invitationId: row.invitation_id ?? null,
    fullName: String(row.full_name),
    roleTitle: String(row.role_title),
    organization: String(row.organization),
    sector: row.sector,
    country: row.country ?? null,
    teamSize: row.team_size ?? null,
    aiExperience: String(row.ai_experience),
    primaryGoal: String(row.primary_goal),
    expectedUseCases: row.expected_use_cases ?? null,
    availability: row.availability ?? null,
    contactConsent: Boolean(row.contact_consent),
    completedAt: String(row.completed_at ?? row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export async function getMyOnboarding(
  supabase: Client,
  userId: string,
  cohort: string,
): Promise<PilotOnboardingProfile | null> {
  const { data, error } = await supabase
    .from("pilot_onboarding_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort", cohort)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? map(data) : null;
}

export async function listCohortOnboarding(
  supabase: Client,
  cohort: string,
): Promise<(PilotOnboardingProfile & { userId: string })[]> {
  const { data, error } = await supabase
    .from("pilot_onboarding_profiles")
    .select("*")
    .eq("cohort", cohort)
    .order("completed_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({ ...map(row), userId: String(row.user_id) }));
}

/**
 * Saves the intake and activates the seat.
 *
 * Idempotent: re-submitting updates the same row (one per user per cohort) and
 * leaves an already-activated or completed seat where it is.
 */
export async function saveOnboarding(
  supabase: Client,
  input: {
    userId: string;
    cohort: string;
    invitationId: string | null;
    values: PilotOnboardingInput;
  },
): Promise<{ profile: PilotOnboardingProfile; activated: boolean }> {
  const v = input.values;
  const { data, error } = await supabase
    .from("pilot_onboarding_profiles")
    .upsert(
      {
        user_id: input.userId,
        cohort: input.cohort,
        invitation_id: input.invitationId,
        full_name: v.fullName,
        role_title: v.roleTitle,
        organization: v.organization,
        sector: v.sector,
        country: v.country ?? null,
        team_size: v.teamSize ?? null,
        ai_experience: v.aiExperience,
        primary_goal: v.primaryGoal,
        expected_use_cases: v.expectedUseCases ?? null,
        availability: v.availability ?? null,
        contact_consent: v.contactConsent,
      } as never,
      { onConflict: "user_id,cohort" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const profile = map(data);

  let activated = false;
  if (input.invitationId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: seat } = await supabaseAdmin
      .from("pilot_invitations")
      .select("id, status, cohort, email")
      .eq("id", input.invitationId)
      .maybeSingle();
    const current = (seat as { status?: string } | null)?.status ?? null;
    if (current === "invited" || current === "registered") {
      const { error: updateError } = await supabaseAdmin
        .from("pilot_invitations")
        .update({ status: "activated", activated_at: new Date().toISOString() } as never)
        .eq("id", input.invitationId);
      if (updateError) throw new Error(updateError.message);
      activated = true;
      const { writePilotAudit } = await import("./pilot.audit.server");
      await writePilotAudit({
        cohort: input.cohort,
        invitationId: input.invitationId,
        subjectEmail: (seat as { email?: string } | null)?.email ?? null,
        subjectUserId: input.userId,
        action: "invitation.status_changed",
        fromStatus: current,
        toStatus: "activated",
        reason: "Participant completed pilot onboarding",
        actorId: input.userId,
      });
    }
  }

  return { profile, activated };
}
