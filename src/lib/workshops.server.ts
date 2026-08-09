/**
 * Discovery & Value Design Workshop — server-only data access.
 *
 * Never imported from client code; reached only through
 * `src/lib/workshops.functions.ts` handlers, which run with the caller's
 * RLS-scoped Supabase client. RLS remains the security boundary: every guard
 * here is a friendlier error, not the enforcement point.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOutcomeSummary,
  type VoteRecord,
  type Workshop,
  type WorkshopBoard,
  type WorkshopItem,
  type WorkshopParticipant,
} from "@/lib/workshops";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const WORKSHOP_SELECT =
  "id, organization_id, workspace_id, created_by, title, client_name, objective, business_functions, starts_on, ends_on, stage, status, created_at, updated_at";
const ITEM_SELECT =
  "id, workshop_id, kind, title, detail, business_function, submitted_by, submitted_by_name, status, merged_into_id, source_item_id, opportunity_id, use_case_id, converted_at, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWorkshop(row: any): Workshop {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    title: row.title ?? "",
    clientName: row.client_name ?? "",
    objective: row.objective ?? "",
    businessFunctions: Array.isArray(row.business_functions) ? row.business_functions : [],
    startsOn: row.starts_on ?? null,
    endsOn: row.ends_on ?? null,
    stage: row.stage,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toItem(row: any): WorkshopItem {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    kind: row.kind,
    title: row.title ?? "",
    detail: row.detail ?? "",
    businessFunction: row.business_function ?? "",
    submittedBy: row.submitted_by ?? null,
    submittedByName: row.submitted_by_name ?? "Participant",
    status: row.status,
    mergedIntoId: row.merged_into_id ?? null,
    sourceItemId: row.source_item_id ?? null,
    opportunityId: row.opportunity_id ?? null,
    useCaseId: row.use_case_id ?? null,
    convertedAt: row.converted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toParticipant(row: any): WorkshopParticipant {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    userId: row.user_id ?? null,
    displayName: row.display_name ?? "Participant",
    email: row.email ?? null,
    role: row.role,
    createdAt: row.created_at,
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function listWorkshops(supabase: Db): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from("workshops")
    .select(WORKSHOP_SELECT)
    .order("updated_at", { ascending: false })
    .limit(100);
  fail(error);
  return (data ?? []).map(toWorkshop);
}

/** Everything a facilitator screen-shares from one round trip. */
export async function getBoard(
  supabase: Db,
  workshopId: string,
  userId: string,
): Promise<WorkshopBoard | null> {
  const { data: workshopRow, error } = await supabase
    .from("workshops")
    .select(WORKSHOP_SELECT)
    .eq("id", workshopId)
    .maybeSingle();
  fail(error);
  if (!workshopRow) return null;
  const workshop = toWorkshop(workshopRow);

  const [participants, items, votes, outcome] = await Promise.all([
    supabase
      .from("workshop_participants")
      .select("id, workshop_id, user_id, display_name, email, role, created_at")
      .eq("workshop_id", workshopId)
      .order("created_at", { ascending: true }),
    supabase
      .from("workshop_items")
      .select(ITEM_SELECT)
      .eq("workshop_id", workshopId)
      .order("created_at", { ascending: true }),
    supabase
      .from("workshop_votes")
      .select("item_id, voter_id, criterion, score")
      .eq("workshop_id", workshopId),
    supabase
      .from("workshop_outcomes")
      .select("summary, updated_at")
      .eq("workshop_id", workshopId)
      .maybeSingle(),
  ]);

  const participantRows = (participants.data ?? []).map(toParticipant);
  const me = participantRows.find((p) => p.userId === userId) ?? null;
  const isFacilitator =
    workshop.createdBy === userId || me?.role === "facilitator" || (await isOrgManager(supabase, workshop));

  return {
    workshop,
    participants: participantRows,
    items: (items.data ?? []).map(toItem),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    votes: (votes.data ?? []).map((v: any) => ({
      itemId: v.item_id,
      voterId: v.voter_id,
      criterion: v.criterion,
      score: v.score,
    })) as VoteRecord[],
    outcome: outcome.data
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { summary: (outcome.data as any).summary, generatedAt: (outcome.data as any).updated_at }
      : null,
    viewer: {
      userId,
      isFacilitator,
      canSubmit: isFacilitator || (me != null && me.role !== "observer"),
      canVote: isFacilitator || (me != null && me.role !== "observer"),
    },
  };
}

async function isOrgManager(supabase: Db, workshop: Workshop): Promise<boolean> {
  if (!workshop.organizationId) return false;
  const { data } = await supabase.rpc("org_role", {
    _user_id: workshop.createdBy,
    _org_id: workshop.organizationId,
  });
  return data === "owner" || data === "admin";
}

/** RLS already blocks writes; this yields a readable message instead of a 403. */
export async function assertFacilitator(
  supabase: Db,
  workshopId: string,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("workshop_is_facilitator", {
    _workshop_id: workshopId,
    _user_id: userId,
  });
  fail(error);
  if (!data) throw new Error("Only the workshop facilitator can do that.");
}

export async function displayNameFor(supabase: Db, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return (row?.full_name as string) || (row?.email as string) || "Facilitator";
}

/* ---------------------------------------------------------------- mutations */

export async function insertItem(
  supabase: Db,
  input: {
    workshopId: string;
    kind: string;
    title: string;
    detail: string;
    businessFunction: string;
    userId: string;
    userName: string;
    sourceItemId?: string | null;
  },
): Promise<WorkshopItem> {
  const { data, error } = await supabase
    .from("workshop_items")
    .insert({
      workshop_id: input.workshopId,
      kind: input.kind,
      title: input.title,
      detail: input.detail || null,
      business_function: input.businessFunction || null,
      submitted_by: input.userId,
      submitted_by_name: input.userName,
      source_item_id: input.sourceItemId ?? null,
    })
    .select(ITEM_SELECT)
    .single();
  fail(error);
  return toItem(data);
}

/** Board that receives use cases generated in a workshop. */
export async function ensureWorkshopBoard(
  supabase: Db,
  workshop: Workshop,
  userId: string,
): Promise<string> {
  const title = `Workshop: ${workshop.title}`.slice(0, 120);
  const { data: existing, error } = await supabase
    .from("use_case_boards")
    .select("id")
    .eq("workspace_id", workshop.workspaceId)
    .eq("title", title)
    .maybeSingle();
  fail(error);
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("use_case_boards")
    .insert({
      workspace_id: workshop.workspaceId,
      title,
      description: `Use cases generated in the ${workshop.title} discovery workshop.`,
      board_type: "workshop",
      created_by: userId,
    })
    .select("id")
    .single();
  fail(createError);
  return (created as { id: string }).id;
}

async function nextPosition(supabase: Db, boardId: string): Promise<number> {
  const { data } = await supabase
    .from("ai_use_cases")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | undefined) ?? -1) + 1;
}

/**
 * Convert a workshop item into the permanent record it belongs in, preserving
 * lineage in both directions (`workshop_items.opportunity_id`/`use_case_id`
 * and `opportunities.source_reference` / `ai_use_cases.source_opportunity_id`).
 */
export async function convertItem(
  supabase: Db,
  workshop: Workshop,
  item: WorkshopItem,
  userId: string,
): Promise<WorkshopItem> {
  if (item.kind !== "opportunity" && item.kind !== "use_case") {
    throw new Error("Only opportunities and use cases can be converted.");
  }
  if (item.opportunityId || item.useCaseId) return item;

  const patch: Record<string, unknown> = { converted_at: new Date().toISOString() };

  if (item.kind === "opportunity") {
    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        workspace_id: workshop.workspaceId,
        created_by: userId,
        owner_user_id: userId,
        title: item.title,
        pain_point: item.detail || null,
        business_function: item.businessFunction || null,
        status: "opportunity",
        source: "workshop",
        source_reference: `workshop:${workshop.id}:item:${item.id}`,
      })
      .select("id")
      .single();
    fail(error);
    patch.opportunity_id = (data as { id: string }).id;
  } else {
    const boardId = await ensureWorkshopBoard(supabase, workshop, userId);
    // Lineage: a use case generated from a converted opportunity keeps the link.
    let sourceOpportunityId: string | null = null;
    if (item.sourceItemId) {
      const { data: parent } = await supabase
        .from("workshop_items")
        .select("opportunity_id")
        .eq("id", item.sourceItemId)
        .maybeSingle();
      sourceOpportunityId = (parent?.opportunity_id as string | null) ?? null;
    }
    const { data, error } = await supabase
      .from("ai_use_cases")
      .insert({
        board_id: boardId,
        title: item.title,
        problem_statement: item.detail || null,
        created_by: userId,
        owner_user_id: userId,
        position: await nextPosition(supabase, boardId),
        status: "draft",
        source_opportunity_id: sourceOpportunityId,
      })
      .select("id")
      .single();
    fail(error);
    patch.use_case_id = (data as { id: string }).id;
  }

  const { data: updated, error: updateError } = await supabase
    .from("workshop_items")
    .update(patch)
    .eq("id", item.id)
    .select(ITEM_SELECT)
    .single();
  fail(updateError);
  return toItem(updated);
}

export async function composeOutcome(supabase: Db, workshopId: string, userId: string) {
  const board = await getBoard(supabase, workshopId, userId);
  if (!board) throw new Error("Workshop not found.");
  const summary = buildOutcomeSummary({
    workshop: board.workshop,
    participants: board.participants,
    items: board.items,
    votes: board.votes,
  });
  const { error } = await supabase.from("workshop_outcomes").upsert(
    {
      workshop_id: workshopId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      summary: summary as any,
      generated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workshop_id" },
  );
  fail(error);
  return summary;
}
