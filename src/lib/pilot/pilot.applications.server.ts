/**
 * Self-serve pilot applications (server-only).
 *
 * Public submissions are written with the service client after validation:
 * the table grants no anon access, so the browser can never write directly.
 * Admin review reads and decisions run as the signed-in admin under RLS.
 */

import {
  isWorkEmail,
  type PilotApplication,
  type PilotApplicationInput,
  type PilotApplicationStatus,
} from "./pilot.applications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

/** Nothing beyond this in an hour: a cheap ceiling on scripted submissions. */
const HOURLY_SUBMISSION_CEILING = 120;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PilotApplication {
  return {
    id: row.id,
    cohort: row.cohort,
    fullName: row.full_name,
    email: row.email,
    organization: row.organization,
    roleTitle: row.role_title ?? null,
    sector: row.sector ?? null,
    country: row.country ?? null,
    goals: row.goals ?? null,
    status: row.status as PilotApplicationStatus,
    decisionReason: row.decision_reason ?? null,
    decidedAt: row.decided_at ?? null,
    invitationId: row.invitation_id ?? null,
    createdAt: row.created_at,
  };
}

export type SubmitApplicationResult = {
  status: "received" | "already_pending" | "already_enrolled";
  message: string;
};

export async function submitPilotApplication(
  supabase: Client,
  input: PilotApplicationInput & {
    cohort: string;
    userAgent?: string | null;
    referrer?: string | null;
  },
): Promise<SubmitApplicationResult> {
  if (!isWorkEmail(input.email)) {
    throw new Error("Please apply with your work email address, not a personal mailbox.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("pilot_applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_SUBMISSION_CEILING) {
    throw new Error("We are receiving a lot of applications right now. Please try again shortly.");
  }

  // Already holds a seat? Say so instead of creating a duplicate request.
  const { data: seat } = await supabaseAdmin
    .from("pilot_invitations")
    .select("id,status")
    .eq("cohort", input.cohort)
    .ilike("email", input.email)
    .neq("status", "revoked")
    .maybeSingle();
  if (seat) {
    return {
      status: "already_enrolled",
      message:
        "You already have a pilot seat for this cohort. Check your inbox for the claim link, or sign in and open your pilot portal.",
    };
  }

  const { error } = await supabaseAdmin.from("pilot_applications").insert({
    cohort: input.cohort,
    full_name: input.fullName,
    email: input.email,
    organization: input.organization,
    role_title: input.roleTitle?.trim() || null,
    sector: input.sector?.trim() || null,
    country: input.country?.trim() || null,
    goals: input.goals,
    source: "self_serve",
    status: "requested",
    user_agent: input.userAgent?.slice(0, 400) ?? null,
    referrer: input.referrer?.slice(0, 400) ?? null,
  } as never);

  if (error) {
    // Unique index on (cohort, lower(email)) where status = 'requested'.
    if (error.code === "23505") {
      return {
        status: "already_pending",
        message:
          "Your application is already with us and awaiting review. We will email you as soon as a seat opens.",
      };
    }
    throw new Error(error.message);
  }

  return {
    status: "received",
    message:
      "Application received. We review Founding Access applications in batches and will email your seat invitation.",
  };
}

export async function listPilotApplications(
  supabase: Client,
  cohort: string,
): Promise<PilotApplication[]> {
  const { data, error } = await supabase
    .from("pilot_applications")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export type DecisionResult = {
  application: PilotApplication;
  invitationId: string | null;
};

/**
 * Approving an application creates a real pilot seat through the normal
 * invitation path, so cohort maths, audit and dispatch all behave identically
 * to an admin-entered participant.
 */
export async function decidePilotApplication(
  supabase: Client,
  input: {
    id: string;
    decision: Extract<PilotApplicationStatus, "approved" | "declined" | "merged">;
    reason?: string | null;
    actorId: string;
  },
): Promise<DecisionResult> {
  const { data: existing, error: readError } = await supabase
    .from("pilot_applications")
    .select("*")
    .eq("id", input.id)
    .single();
  if (readError) throw new Error(readError.message);
  const application = mapRow(existing);
  if (application.status !== "requested") {
    throw new Error("This application has already been decided.");
  }

  let invitationId: string | null = null;

  if (input.decision === "approved") {
    const { getPilotSettings, createInvitation, listInvitations } = await import("./pilot.server");
    const settings = await getPilotSettings(supabase);
    if (settings.invitationsPaused) {
      throw new Error("New pilot invitations are paused, so this application cannot be approved.");
    }
    const seats = await listInvitations(supabase, settings.cohort);
    const active = seats.filter((s) => s.status !== "revoked");
    if (active.length >= settings.seatTarget) {
      throw new Error(
        `The cohort is full (${active.length}/${settings.seatTarget} seats). Raise the target or revoke a seat first.`,
      );
    }
    const invitation = await createInvitation(supabase, {
      cohort: settings.cohort,
      email: application.email,
      fullName: application.fullName,
      organization: application.organization,
      notes: [application.roleTitle, application.sector, application.country, application.goals]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 500),
      actorId: input.actorId,
    });
    invitationId = invitation.id;
  }

  const { data: updated, error: updateError } = await supabase
    .from("pilot_applications")
    .update({
      status: input.decision,
      decision_reason: input.reason?.trim() || null,
      decided_by: input.actorId,
      decided_at: new Date().toISOString(),
      invitation_id: invitationId,
    } as never)
    .eq("id", input.id)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  return { application: mapRow(updated), invitationId };
}
