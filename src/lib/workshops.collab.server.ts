/**
 * Workshop collaboration — server-only data access.
 *
 * Invitations, per-stage audit trail and outcome publication (portfolio +
 * generated report). Reached only from `workshops.functions.ts` handlers with
 * the caller's RLS-scoped client; guards here produce readable errors and are
 * never the security boundary.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

import { STAGE_META, type WorkshopStage } from "@/lib/workshops";
import type {
  WorkshopAuditAction,
  WorkshopAuditEntry,
  WorkshopInvitation,
  WorkshopInvitationRole,
} from "@/lib/workshops.collab";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const INVITE_SELECT =
  "id, workshop_id, email, display_name, role, token, expires_at, max_uses, use_count, accepted_at, revoked_at, created_at";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toInvitation(row: any): WorkshopInvitation {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    role: row.role as WorkshopInvitationRole,
    token: row.token,
    expiresAt: row.expires_at,
    maxUses: row.max_uses ?? 1,
    useCount: row.use_count ?? 0,
    acceptedAt: row.accepted_at ?? null,
    revokedAt: row.revoked_at ?? null,
    createdAt: row.created_at,
  };
}

export async function listInvitations(
  supabase: Db,
  workshopId: string,
): Promise<WorkshopInvitation[]> {
  const { data, error } = await supabase
    .from("workshop_invitations")
    .select(INVITE_SELECT)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(100);
  fail(error);
  return (data ?? []).map(toInvitation);
}

export async function createInvitation(
  supabase: Db,
  input: {
    workshopId: string;
    userId: string;
    email: string | null;
    displayName: string | null;
    role: WorkshopInvitationRole;
    expiresInDays: number;
    maxUses: number;
  },
): Promise<WorkshopInvitation> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("workshop_invitations")
    .insert({
      workshop_id: input.workshopId,
      email: input.email,
      display_name: input.displayName,
      role: input.role,
      token,
      expires_at: expiresAt,
      max_uses: input.maxUses,
      created_by: input.userId,
    })
    .select(INVITE_SELECT)
    .single();
  fail(error);
  return toInvitation(data);
}

export async function revokeInvitation(supabase: Db, id: string): Promise<void> {
  const { error } = await supabase
    .from("workshop_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  fail(error);
}

/** Token exchange runs in a SECURITY DEFINER function that enforces workspace scope. */
export async function acceptInvitation(supabase: Db, token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_workshop_invitation", { _token: token });
  fail(error);
  if (!data) throw new Error("This invitation could not be accepted.");
  return data as string;
}

/* -------------------------------------------------------------- audit trail */

const KIND_STAGE_MAP: Record<string, WorkshopStage> = {
  context: "context",
  pain_point: "pain_points",
  opportunity: "capture",
  use_case: "generation",
};

/**
 * Traceability is reconstructed from the recorded rows themselves plus the
 * append-only audit stream: nothing is inferred or invented.
 */
export async function buildAuditTrail(
  supabase: Db,
  workshopId: string,
): Promise<WorkshopAuditEntry[]> {
  const [items, votes, participants, events] = await Promise.all([
    supabase
      .from("workshop_items")
      .select(
        "id, kind, title, status, submitted_by_name, created_at, updated_at, converted_at, opportunity_id, use_case_id, merged_into_id",
      )
      .eq("workshop_id", workshopId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("workshop_votes")
      .select("id, item_id, voter_id, criterion, score, updated_at")
      .eq("workshop_id", workshopId)
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("workshop_participants")
      .select("id, user_id, display_name, role, created_at")
      .eq("workshop_id", workshopId),
    supabase
      .from("audit_events")
      .select("id, actor_id, entity_type, entity_id, event_type, new_value, created_at")
      .eq("entity_id", workshopId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participantRows = (participants.data ?? []) as any[];
  const nameByUser = new Map<string, string>(
    participantRows
      .filter((p) => p.user_id)
      .map((p) => [p.user_id as string, (p.display_name as string) || "Participant"]),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemRows = (items.data ?? []) as any[];
  const itemTitle = new Map<string, string>(itemRows.map((i) => [i.id as string, i.title as string]));
  const itemStage = new Map<string, WorkshopStage>(
    itemRows.map((i) => [i.id as string, KIND_STAGE_MAP[i.kind as string] ?? "capture"]),
  );

  const entries: WorkshopAuditEntry[] = [];
  const push = (
    id: string,
    stage: WorkshopStage,
    action: WorkshopAuditAction,
    actorName: string,
    summary: string,
    at: string,
  ) => entries.push({ id, stage, action, actorName, summary, at });

  for (const p of participantRows) {
    push(
      `participant:${p.id}`,
      "context",
      "participant.added",
      (p.display_name as string) || "Participant",
      `Added to the session as ${p.role}`,
      p.created_at as string,
    );
  }

  for (const i of itemRows) {
    const stage = KIND_STAGE_MAP[i.kind as string] ?? "capture";
    push(
      `item:${i.id}`,
      stage,
      "item.submitted",
      (i.submitted_by_name as string) || "Participant",
      `Submitted “${i.title}”`,
      i.created_at as string,
    );
    if (i.updated_at && i.updated_at !== i.created_at) {
      push(
        `item-status:${i.id}`,
        i.status === "shortlisted" ? "shortlist" : stage,
        "item.curated",
        "Facilitator",
        i.merged_into_id
          ? `Merged “${i.title}” into “${itemTitle.get(i.merged_into_id as string) ?? "another item"}”`
          : `“${i.title}” marked ${i.status}`,
        i.updated_at as string,
      );
    }
    if (i.converted_at) {
      const targets = [
        i.opportunity_id ? "opportunity record" : null,
        i.use_case_id ? "Studio draft" : null,
      ].filter(Boolean);
      push(
        `conversion:${i.id}`,
        "portfolio",
        "item.converted",
        "Facilitator",
        `“${i.title}” converted to ${targets.join(" and ") || "a downstream record"}`,
        i.converted_at as string,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of (votes.data ?? []) as any[]) {
    push(
      `vote:${v.id}`,
      "scoring",
      "vote.cast",
      nameByUser.get(v.voter_id as string) ?? "Participant",
      `Scored “${itemTitle.get(v.item_id as string) ?? "an item"}” ${v.criterion} = ${v.score}`,
      v.updated_at as string,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of (events.data ?? []) as any[]) {
    const type = e.event_type as string;
    if (type === "workshop.participant_joined") {
      push(
        `event:${e.id}`,
        "context",
        "participant.joined",
        nameByUser.get(e.actor_id as string) ?? "Invitee",
        `Joined via invitation (${(e.new_value?.via as string) ?? "link"})`,
        e.created_at as string,
      );
    } else if (type.includes("report")) {
      push(
        `event:${e.id}`,
        "outcomes",
        "outcome.generated",
        nameByUser.get(e.actor_id as string) ?? "Facilitator",
        "Outcome summary generated",
        e.created_at as string,
      );
    } else if (e.entity_type === "workshop") {
      push(
        `event:${e.id}`,
        (e.new_value?.stage as WorkshopStage) in STAGE_META
          ? (e.new_value.stage as WorkshopStage)
          : "context",
        "workshop.updated",
        nameByUser.get(e.actor_id as string) ?? "Facilitator",
        `Session updated${e.new_value?.stage ? ` — stage ${STAGE_META[e.new_value.stage as WorkshopStage]?.label ?? e.new_value.stage}` : ""}`,
        e.created_at as string,
      );
    }
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

/* --------------------------------------------------------- outcome publication */

export type PublishedOutcome = {
  portfolioId: string;
  reportId: string;
  opportunityIds: string[];
};

/**
 * Attaches the generated outcome summary to the workshop's portfolio and to
 * the opportunity records already created by conversion. Existing links are
 * reused so republishing never forks the record.
 */
export async function publishOutcome(
  supabase: Db,
  workshopId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any,
): Promise<PublishedOutcome> {
  const { data: workshopRow, error: workshopError } = await supabase
    .from("workshops")
    .select("id, title, objective, organization_id, workspace_id, portfolio_id, outcome_report_id")
    .eq("id", workshopId)
    .maybeSingle();
  fail(workshopError);
  if (!workshopRow) throw new Error("Workshop not found.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workshop = workshopRow as any;

  let portfolioId: string | null = workshop.portfolio_id ?? null;
  if (portfolioId) {
    const { data: existing } = await supabase
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId)
      .maybeSingle();
    if (!existing) portfolioId = null;
  }
  if (!portfolioId) {
    const { data: created, error: portfolioError } = await supabase
      .from("portfolios")
      .insert({
        user_id: userId,
        name: `Workshop — ${workshop.title}`,
        portfolio_type: "Workshop outcome",
        status: "Draft",
        objective: workshop.objective ?? null,
        visibility: "workspace",
        organization_id: workshop.organization_id,
        workspace_id: workshop.workspace_id,
      })
      .select("id")
      .single();
    fail(portfolioError);
    portfolioId = (created as { id: string }).id;
  }

  const { data: converted } = await supabase
    .from("workshop_items")
    .select("opportunity_id")
    .eq("workshop_id", workshopId)
    .not("opportunity_id", "is", null);
  const opportunityIds = ((converted ?? []) as Array<{ opportunity_id: string | null }>)
    .map((r) => r.opportunity_id)
    .filter((v): v is string => Boolean(v));

  const { data: report, error: reportError } = await supabase
    .from("generated_reports")
    .insert({
      user_id: userId,
      title: `${workshop.title} — Outcome summary`,
      kind: "workshop_outcome",
      use_case_count: summary?.counts?.useCases ?? 0,
      payload: {
        workshopId,
        portfolioId,
        opportunityIds,
        summary,
      },
      organization_id: workshop.organization_id,
      workspace_id: workshop.workspace_id,
    })
    .select("id")
    .single();
  fail(reportError);
  const reportId = (report as { id: string }).id;

  const { error: linkError } = await supabase
    .from("workshops")
    .update({ portfolio_id: portfolioId, outcome_report_id: reportId })
    .eq("id", workshopId);
  fail(linkError);

  return { portfolioId, reportId, opportunityIds };
}
