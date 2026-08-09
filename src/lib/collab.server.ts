/**
 * Server-only data access for lightweight Pro collaboration.
 * Never imported from client code (filename is `.server.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  seatUsage,
  summariseAuditEvent,
  type ActivityEntry,
  type AssignmentRole,
  type CollabAssignment,
  type CollabComment,
  type CollabEntityType,
  type CollabReviewState,
  type InviteRole,
  type ReviewStatus,
  type SeatUsage,
  type WorkspaceInviteRow,
  type WorkspaceMemberRow,
} from "@/lib/collab";
import { resolveSubject } from "@/lib/authz.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

/* ------------------------------------------------------------- utilities */

const ENTITY_TABLES: Record<CollabEntityType, string> = {
  opportunity: "opportunities",
  use_case: "ai_use_cases",
  portfolio: "portfolios",
};

/** The workspace that owns a collaboration target; also acts as an access probe. */
export async function entityWorkspaceId(
  supabase: Db,
  entityType: CollabEntityType,
  entityId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("collab_entity_workspace", {
    _entity_type: entityType,
    _entity_id: entityId,
  });
  if (error) throw new Error(error.message);
  if (data) return data as string;

  // Older rows predate workspace tagging. Fall back to the caller's own
  // workspace, but only when RLS already lets them see the row.
  const visible = await supabase
    .from(ENTITY_TABLES[entityType])
    .select("id")
    .eq("id", entityId)
    .maybeSingle();
  if (visible.error || !visible.data) {
    throw new Error("This item is not available in your workspace.");
  }
  const { resolveWorkspaceId } = await import("@/lib/opportunities.server");
  return resolveWorkspaceId(supabase);
}

async function displayNames(
  supabase: Db,
  workspaceId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc("workspace_display_names", {
    _workspace_id: workspaceId,
    _user_ids: unique,
  });
  if (error) return new Map();
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { user_id: string; full_name: string }[]) {
    map.set(row.user_id, row.full_name);
  }
  return map;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------- comments */

export async function listComments(
  supabase: Db,
  entityType: CollabEntityType,
  entityId: string,
): Promise<CollabComment[]> {
  const workspaceId = await entityWorkspaceId(supabase, entityType, entityId);
  const { data, error } = await supabase
    .from("collab_comments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const names = await displayNames(
    supabase,
    workspaceId,
    rows.map((r) => r.author_id),
  );
  return rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    body: r.body,
    authorId: r.author_id,
    authorName: names.get(r.author_id) ?? "Teammate",
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function addComment(
  supabase: Db,
  userId: string,
  input: { entityType: CollabEntityType; entityId: string; body: string },
) {
  const workspaceId = await entityWorkspaceId(supabase, input.entityType, input.entityId);
  const { data, error } = await supabase
    .from("collab_comments")
    .insert({
      workspace_id: workspaceId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      body: input.body,
      author_id: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(friendlyWriteError(error.message));
  return { id: (data as any).id as string, workspaceId };
}

export async function setCommentResolved(
  supabase: Db,
  userId: string,
  id: string,
  resolved: boolean,
) {
  const { data, error } = await supabase
    .from("collab_comments")
    .update({
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? userId : null,
    })
    .eq("id", id)
    .select("id, workspace_id, entity_type, entity_id")
    .single();
  if (error) throw new Error(friendlyWriteError(error.message));
  return data as any;
}

/* ----------------------------------------------------------- assignments */

export async function listAssignments(
  supabase: Db,
  entityType: CollabEntityType,
  entityId: string,
): Promise<CollabAssignment[]> {
  const workspaceId = await entityWorkspaceId(supabase, entityType, entityId);
  const { data, error } = await supabase
    .from("collab_assignments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const names = await displayNames(
    supabase,
    workspaceId,
    rows.map((r) => r.user_id),
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: names.get(r.user_id) ?? "Teammate",
    assignmentRole: r.assignment_role as AssignmentRole,
    assignedBy: r.assigned_by,
    createdAt: r.created_at,
  }));
}

export async function assign(
  supabase: Db,
  userId: string,
  input: {
    entityType: CollabEntityType;
    entityId: string;
    userId: string;
    assignmentRole: AssignmentRole;
  },
) {
  const workspaceId = await entityWorkspaceId(supabase, input.entityType, input.entityId);
  const isMember = await supabase.rpc("user_in_workspace", {
    _user_id: input.userId,
    _workspace_id: workspaceId,
  });
  if (isMember.error || isMember.data !== true) {
    throw new Error("That person is not a member of this workspace yet.");
  }
  if (input.assignmentRole === "owner") {
    // A single accountable owner keeps the Pro workflow simple.
    await supabase
      .from("collab_assignments")
      .delete()
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .eq("assignment_role", "owner");
  }
  const { error } = await supabase.from("collab_assignments").insert({
    workspace_id: workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    user_id: input.userId,
    assignment_role: input.assignmentRole,
    assigned_by: userId,
  });
  if (error && !error.message.includes("duplicate key")) {
    throw new Error(friendlyWriteError(error.message));
  }
  return { workspaceId };
}

export async function unassign(supabase: Db, id: string) {
  const { data, error } = await supabase
    .from("collab_assignments")
    .delete()
    .eq("id", id)
    .select("workspace_id, entity_type, entity_id, user_id, assignment_role")
    .maybeSingle();
  if (error) throw new Error(friendlyWriteError(error.message));
  if (!data) throw new Error("You do not have permission to change assignments here.");
  return data as any;
}

/* --------------------------------------------------------- review status */

export async function getReviewState(
  supabase: Db,
  entityType: CollabEntityType,
  entityId: string,
): Promise<CollabReviewState | null> {
  const workspaceId = await entityWorkspaceId(supabase, entityType, entityId);
  const { data, error } = await supabase
    .from("collab_review_states")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as any;
  const names = await displayNames(supabase, workspaceId, [row.updated_by]);
  return {
    status: row.status as ReviewStatus,
    note: row.note,
    updatedBy: row.updated_by,
    updatedByName: names.get(row.updated_by) ?? "Teammate",
    updatedAt: row.updated_at,
  };
}

export async function setReviewState(
  supabase: Db,
  userId: string,
  input: {
    entityType: CollabEntityType;
    entityId: string;
    status: ReviewStatus;
    note?: string | undefined;
  },
) {
  const workspaceId = await entityWorkspaceId(supabase, input.entityType, input.entityId);
  const previous = await getReviewState(supabase, input.entityType, input.entityId);
  const { error } = await supabase.from("collab_review_states").upsert(
    {
      workspace_id: workspaceId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      status: input.status,
      note: input.note ?? null,
      updated_by: userId,
    },
    { onConflict: "entity_type,entity_id" },
  );
  if (error) throw new Error(friendlyWriteError(error.message));
  return { workspaceId, previousStatus: previous?.status ?? null };
}

/* ------------------------------------------------------------- activity */

export async function listActivity(
  supabase: Db,
  entityType: CollabEntityType,
  entityId: string,
): Promise<ActivityEntry[]> {
  const workspaceId = await entityWorkspaceId(supabase, entityType, entityId);
  const { data, error } = await supabase
    .from("audit_events")
    .select("id, event_type, actor_id, created_at, new_value")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const names = await displayNames(
    supabase,
    workspaceId,
    rows.map((r) => r.actor_id).filter(Boolean),
  );
  return rows.map((r) => ({
    id: r.id,
    event: r.event_type,
    actorId: r.actor_id,
    actorName: r.actor_id ? (names.get(r.actor_id) ?? "Teammate") : "System",
    at: r.created_at,
    summary: summariseAuditEvent(r.event_type, r.new_value ?? null),
  }));
}

/* ------------------------------------------------------------ team/seats */

export type TeamOverview = {
  workspaceId: string;
  canManage: boolean;
  members: WorkspaceMemberRow[];
  invitations: WorkspaceInviteRow[];
  seats: SeatUsage;
};

export async function teamOverview(supabase: Db, userId: string): Promise<TeamOverview> {
  const { resolveWorkspaceId } = await import("@/lib/opportunities.server");
  const workspaceId = await resolveWorkspaceId(supabase);
  const subject = await resolveSubject(supabase, userId, workspaceId);

  const canManageResult = await supabase.rpc("workspace_can_manage", {
    _user_id: userId,
    _workspace_id: workspaceId,
  });
  const canManage = canManageResult.data === true;

  const [directory, invites] = await Promise.all([
    supabase.rpc("workspace_member_directory", { _workspace_id: workspaceId }),
    canManage
      ? supabase
          .from("workspace_invitations")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const members: WorkspaceMemberRow[] = ((directory.data ?? []) as any[]).map((r) => ({
    userId: r.user_id,
    displayName: r.full_name ?? "Teammate",
    email: r.email ?? null,
    role: r.role ?? "contributor",
    joinedAt: r.joined_at ?? null,
    isSelf: r.user_id === userId,
  }));

  const invitations: WorkspaceInviteRow[] = ((invites.data ?? []) as any[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as InviteRole,
    token: r.token,
    expiresAt: r.expires_at,
    useCount: r.use_count,
    maxUses: r.max_uses,
    revokedAt: r.revoked_at,
    acceptedAt: r.accepted_at,
    createdAt: r.created_at,
  }));

  const pending = invitations.filter(
    (i) => !i.revokedAt && i.useCount < i.maxUses && new Date(i.expiresAt) > new Date(),
  ).length;

  return {
    workspaceId,
    canManage,
    members,
    invitations,
    seats: seatUsage(subject.edition, members.length, pending),
  };
}

export async function createInvitation(
  supabase: Db,
  userId: string,
  input: {
    email?: string | undefined;
    role: InviteRole;
    message?: string | undefined;
    expiresInDays: number;
  },
) {
  const overview = await teamOverview(supabase, userId);
  if (!overview.canManage) {
    throw new Error("Only workspace owners and admins can invite teammates.");
  }
  if (overview.seats.atLimit) {
    throw new Error(
      `Your plan includes ${overview.seats.limit} team members. Remove a member or talk to us about Enterprise to add more.`,
    );
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86400000).toISOString();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("organization_id")
    .eq("id", overview.workspaceId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: overview.workspaceId,
      organization_id: (workspace as any)?.organization_id ?? null,
      email: input.email ? input.email.toLowerCase() : null,
      role: input.role,
      message: input.message ?? null,
      token,
      expires_at: expiresAt,
      invited_by: userId,
    })
    .select("id, token")
    .single();
  if (error) throw new Error(friendlyWriteError(error.message));
  return {
    id: (data as any).id as string,
    token: (data as any).token as string,
    workspaceId: overview.workspaceId,
  };
}

export async function revokeInvitation(supabase: Db, id: string) {
  const { data, error } = await supabase
    .from("workspace_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id, workspace_id, email, role")
    .maybeSingle();
  if (error) throw new Error(friendlyWriteError(error.message));
  if (!data) throw new Error("That invitation is already revoked or not yours to manage.");
  return data as any;
}

export async function removeMember(supabase: Db, userId: string, memberUserId: string) {
  const overview = await teamOverview(supabase, userId);
  if (!overview.canManage) {
    throw new Error("Only workspace owners and admins can remove members.");
  }
  if (memberUserId === userId) {
    throw new Error("You cannot remove yourself from your own workspace.");
  }
  const { data, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", overview.workspaceId)
    .eq("user_id", memberUserId)
    .select("user_id, role")
    .maybeSingle();
  if (error) throw new Error(friendlyWriteError(error.message));
  if (!data) throw new Error("That member is no longer in this workspace.");

  // Access ends immediately: drop their assignments so nothing stays owned by
  // a person who can no longer open the item.
  await supabase
    .from("collab_assignments")
    .delete()
    .eq("workspace_id", overview.workspaceId)
    .eq("user_id", memberUserId);

  return { workspaceId: overview.workspaceId, role: (data as any).role as string };
}

export async function changeMemberRole(
  supabase: Db,
  userId: string,
  memberUserId: string,
  role: InviteRole,
) {
  const overview = await teamOverview(supabase, userId);
  if (!overview.canManage) {
    throw new Error("Only workspace owners and admins can change roles.");
  }
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", overview.workspaceId)
    .eq("user_id", memberUserId)
    .select("user_id, role")
    .maybeSingle();
  if (error) throw new Error(friendlyWriteError(error.message));
  if (!data) throw new Error("That member is no longer in this workspace.");
  return { workspaceId: overview.workspaceId, role };
}

export async function acceptInvitation(supabase: Db, token: string) {
  const { data, error } = await supabase.rpc("accept_workspace_invitation", { _token: token });
  if (error) throw new Error(error.message);
  return { workspaceId: data as string };
}

function friendlyWriteError(message: string) {
  if (message.includes("row-level security")) {
    return "You do not have permission to do that in this workspace.";
  }
  return message;
}
