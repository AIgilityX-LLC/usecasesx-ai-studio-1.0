/**
 * Founding Access request → review → invite (server-only).
 * Never import from client components.
 */

import { FOUNDING_UNTIL_ISO } from "@/lib/entitlements";

export type FoundingAccessStatus = "pending" | "approved" | "rejected";

export type FoundingAccessRequestRow = {
  id: string;
  full_name: string;
  work_email: string;
  organization: string;
  role_title: string | null;
  status: FoundingAccessStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  invite_user_id: string | null;
};

const TABLE = "founding_access_requests";
const INFO_FROM = "UseCasesX <info@aigilityx.com>";
const APP_URL = "https://usecasesx.aigilityx.com";

type AdminClient = {
  from: (table: string) => any;
  auth: {
    admin: {
      createUser: (attrs: Record<string, unknown>) => PromiseLike<{
        data: { user: { id: string } | null };
        error: { message: string; status?: number } | null;
      }>;
      generateLink: (attrs: {
        type: "invite" | "magiclink";
        email: string;
        options?: { redirectTo?: string; data?: Record<string, unknown> };
      }) => PromiseLike<{
        data: {
          properties: { action_link?: string } | null;
          user: { id: string } | null;
        };
        error: { message: string } | null;
      }>;
      listUsers: (opts: { page: number; perPage: number }) => PromiseLike<{
        data: { users: Array<{ id: string; email?: string }> };
        error: { message: string } | null;
      }>;
    };
  };
};

export type SubmitFoundingAccessInput = {
  fullName: string;
  workEmail: string;
  organization: string;
  roleTitle?: string | null;
};

/**
 * Insert or refresh a pending request for this email, then notify info@.
 * Duplicate pending emails update the existing row (no second pending row).
 */
export async function submitFoundingAccessRequest(
  admin: AdminClient,
  input: SubmitFoundingAccessInput,
): Promise<{ id: string; updatedExisting: boolean }> {
  const fullName = input.fullName.trim();
  const workEmail = input.workEmail.trim().toLowerCase();
  const organization = input.organization.trim();
  const roleTitle = input.roleTitle?.trim() || null;
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await admin
    .from(TABLE)
    .select("id")
    .eq("status", "pending")
    .ilike("work_email", workEmail)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  let id: string;
  let updatedExisting = false;

  if (existing?.id) {
    const { error } = await admin
      .from(TABLE)
      .update({
        full_name: fullName,
        work_email: workEmail,
        organization,
        role_title: roleTitle,
        requested_at: now,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    id = existing.id;
    updatedExisting = true;
  } else {
    const { data, error } = await admin
      .from(TABLE)
      .insert({
        full_name: fullName,
        work_email: workEmail,
        organization,
        role_title: roleTitle,
        status: "pending",
        requested_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id as string;
  }

  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  try {
    await sendTemplateEmail("founding-access-request-notify", "info@aigilityx.com", {
      from: INFO_FROM,
      replyTo: workEmail,
      idempotencyKey: `founding-request-notify-${id}-${now.slice(0, 13)}`,
      templateData: {
        fullName,
        workEmail,
        organization,
        roleTitle,
        requestedAt: new Date(now).toUTCString(),
        adminUrl: `${APP_URL}/administration/founding-access`,
      },
    });
  } catch (error) {
    console.warn("[founding-access] admin notify email failed", error);
  }

  return { id, updatedExisting };
}

export async function listFoundingAccessRequests(
  admin: AdminClient,
  status: FoundingAccessStatus | "all" = "pending",
): Promise<FoundingAccessRequestRow[]> {
  let q = admin
    .from(TABLE)
    .select(
      "id, full_name, work_email, organization, role_title, status, requested_at, reviewed_at, reviewed_by, notes, invite_user_id",
    )
    .order("requested_at", { ascending: false })
    .limit(500);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FoundingAccessRequestRow[];
}

async function findAuthUserIdByEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  // Paginate lightly — founding queue volume is low.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Approve: create auth user (no password) → generateLink → email invite → mark approved + grant Pro.
 */
export async function approveFoundingAccessRequest(
  admin: AdminClient,
  input: { requestId: string; actorId: string; notes?: string | null },
): Promise<{ requestId: string; userId: string; emailed: boolean }> {
  const { data: row, error: loadError } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "pending") throw new Error(`Request is already ${row.status}.`);

  const email = String(row.work_email).trim().toLowerCase();
  const fullName = String(row.full_name);
  const organization = String(row.organization);

  let userId = await findAuthUserIdByEmail(admin, email);
  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        organization,
        role_title: row.role_title ?? null,
      },
    });
    if (createError) {
      // Race: user appeared between list and create — resolve by email again.
      const raced = await findAuthUserIdByEmail(admin, email);
      if (!raced) throw new Error(`Could not create account: ${createError.message}`);
      userId = raced;
    } else {
      userId = created.user!.id;
    }
  }

  const redirectTo = `${APP_URL}/auth`;
  let actionLink: string | undefined;
  let linkUserId = userId;

  const inviteAttempt = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: { full_name: fullName, organization },
    },
  });
  if (!inviteAttempt.error && inviteAttempt.data.properties?.action_link) {
    actionLink = inviteAttempt.data.properties.action_link;
    if (inviteAttempt.data.user?.id) linkUserId = inviteAttempt.data.user.id;
  } else {
    const magicAttempt = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (magicAttempt.error || !magicAttempt.data.properties?.action_link) {
      throw new Error(
        `Could not generate invite link: ${
          inviteAttempt.error?.message ?? magicAttempt.error?.message ?? "unknown"
        }`,
      );
    }
    actionLink = magicAttempt.data.properties.action_link;
    if (magicAttempt.data.user?.id) linkUserId = magicAttempt.data.user.id;
  }

  userId = linkUserId;

  // Never return actionLink to the client — email only.
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  let emailed = false;
  try {
    const result = await sendTemplateEmail("founding-access-invite", email, {
      from: INFO_FROM,
      replyTo: "info@aigilityx.com",
      idempotencyKey: `founding-invite-${input.requestId}`,
      templateData: {
        name: fullName,
        organization,
        inviteUrl: actionLink,
        appUrl: APP_URL,
      },
    });
    emailed = result.sent;
  } catch (error) {
    console.error("[founding-access] invite email failed", error);
    throw new Error("Account prepared but the invitation email failed to send. Try again.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      entitlement_tier: "pro",
      entitlement_expires_at: FOUNDING_UNTIL_ISO,
      founding_member: true,
      plan_type: "pro_free",
    })
    .eq("user_id", userId);
  if (profileError) {
    console.warn("[founding-access] profile entitlement update deferred", profileError.message);
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from(TABLE)
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewed_by: input.actorId,
      notes: input.notes?.trim() || row.notes,
      invite_user_id: userId,
    })
    .eq("id", input.requestId)
    .eq("status", "pending");
  if (updateError) throw new Error(updateError.message);

  return { requestId: input.requestId, userId, emailed };
}

export async function rejectFoundingAccessRequest(
  admin: AdminClient,
  input: { requestId: string; actorId: string; notes?: string | null },
): Promise<{ requestId: string }> {
  const { data: row, error: loadError } = await admin
    .from(TABLE)
    .select("id, status, notes")
    .eq("id", input.requestId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "pending") throw new Error(`Request is already ${row.status}.`);

  const { error } = await admin
    .from(TABLE)
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.actorId,
      notes: input.notes?.trim() || row.notes,
    })
    .eq("id", input.requestId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return { requestId: input.requestId };
}
