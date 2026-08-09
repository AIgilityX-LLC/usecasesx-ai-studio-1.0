/**
 * Collaboration server functions — thin wrappers only (AGENTS.md §3).
 * Every function is authenticated; RLS scopes rows to the caller's workspace.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assignmentInputSchema,
  commentInputSchema,
  commentResolveSchema,
  entityRefSchema,
  inviteInputSchema,
  INVITE_ROLES,
  reviewStatusInputSchema,
} from "@/lib/collab";

const idSchema = z.object({ id: z.string().uuid() });

export const getCollaborationFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => entityRefSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { listComments, listAssignments, getReviewState, listActivity, teamOverview } =
      await import("@/lib/collab.server");
    const [comments, assignments, reviewState, activity, team] = await Promise.all([
      listComments(context.supabase, data.entityType, data.entityId),
      listAssignments(context.supabase, data.entityType, data.entityId),
      getReviewState(context.supabase, data.entityType, data.entityId),
      listActivity(context.supabase, data.entityType, data.entityId),
      teamOverview(context.supabase, context.userId),
    ]);
    return {
      comments,
      assignments,
      reviewState,
      activity,
      members: team.members,
      canManage: team.canManage,
      seats: team.seats,
      currentUserId: context.userId,
    };
  });

export const addCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => commentInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { addComment } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const result = await addComment(context.supabase, context.userId, data);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: result.workspaceId, organizationId: null } },
      {
        event: "collab.comment.added",
        entity: { type: data.entityType, id: data.entityId },
        next: { comment_id: result.id },
      },
    );
    return { id: result.id };
  });

export const resolveCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => commentResolveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { setCommentResolved } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const row = await setCommentResolved(context.supabase, context.userId, data.id, data.resolved);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: row.workspace_id, organizationId: null } },
      {
        event: data.resolved ? "collab.comment.resolved" : "collab.comment.reopened",
        entity: { type: row.entity_type, id: row.entity_id },
        next: { comment_id: data.id },
      },
    );
    return { ok: true };
  });

export const assignCollaboratorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assignmentInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assign } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { workspaceId } = await assign(context.supabase, context.userId, data);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId } },
      {
        event: "collab.assignment.added",
        entity: { type: data.entityType, id: data.entityId },
        next: { assignment_role: data.assignmentRole, user_id: data.userId },
      },
    );
    return { ok: true };
  });

export const unassignCollaboratorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { unassign } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const row = await unassign(context.supabase, data.id);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: row.workspace_id, organizationId: null } },
      {
        event: "collab.assignment.removed",
        entity: { type: row.entity_type, id: row.entity_id },
        previous: { assignment_role: row.assignment_role, user_id: row.user_id },
      },
    );
    return { ok: true };
  });

export const setReviewStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reviewStatusInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { setReviewState } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { workspaceId, previousStatus } = await setReviewState(
      context.supabase,
      context.userId,
      data,
    );
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId } },
      {
        event: "collab.review_status.changed",
        entity: { type: data.entityType, id: data.entityId },
        previous: previousStatus ? { status: previousStatus } : null,
        next: { status: data.status },
      },
    );
    return { ok: true };
  });

/* --------------------------------------------------------------- team */

export const getTeamFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamOverview } = await import("@/lib/collab.server");
    const overview = await teamOverview(context.supabase, context.userId);
    return { ...overview, currentUserId: context.userId };
  });

export const inviteMemberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inviteInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { createInvitation } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    const invite = await createInvitation(context.supabase, context.userId, {
      email: data.email ? data.email : undefined,
      role: data.role,
      message: data.message,
      expiresInDays: data.expiresInDays,
    });
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: invite.workspaceId, organizationId: null } },
      {
        event: AUDIT_EVENTS.memberInvited,
        entity: { type: "workspace", id: invite.workspaceId },
        next: { email: data.email || null, role: data.role },
      },
    );
    return { id: invite.id, token: invite.token };
  });

export const revokeInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { revokeInvitation } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const row = await revokeInvitation(context.supabase, data.id);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: row.workspace_id, organizationId: null } },
      {
        event: "membership.invitation_revoked",
        entity: { type: "workspace", id: row.workspace_id },
        previous: { email: row.email, role: row.role },
      },
    );
    return { ok: true };
  });

export const removeMemberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { removeMember } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    const result = await removeMember(context.supabase, context.userId, data.userId);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: result.workspaceId, organizationId: null } },
      {
        event: AUDIT_EVENTS.memberRemoved,
        entity: { type: "workspace", id: result.workspaceId },
        previous: { user_id: data.userId, role: result.role },
        severity: "notice",
      },
    );
    return { ok: true };
  });

export const changeMemberRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), role: z.enum(INVITE_ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { changeMemberRole } = await import("@/lib/collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    const result = await changeMemberRole(context.supabase, context.userId, data.userId, data.role);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant: { workspaceId: result.workspaceId, organizationId: null } },
      {
        event: AUDIT_EVENTS.roleChanged,
        entity: { type: "workspace", id: result.workspaceId },
        next: { user_id: data.userId, role: data.role },
      },
    );
    return { ok: true };
  });

export const acceptInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { acceptInvitation } = await import("@/lib/collab.server");
    return acceptInvitation(context.supabase, data.token);
  });
