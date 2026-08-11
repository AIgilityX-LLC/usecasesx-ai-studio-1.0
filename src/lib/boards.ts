// Helpers for the real Use Case Boards feature.
// Reads/writes use_case_boards + ai_use_cases via the user-scoped supabase client.
// Ensures the user has an org + workspace before creating a board.

import { supabase } from "@/integrations/supabase/client";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { ensureUserWorkspaceFn } from "@/lib/workspace.functions";

export interface BoardRow {
  id: string;
  title: string;
  description: string | null;
  board_type: string | null;
  status: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface BoardUseCaseRow {
  id: string;
  title: string;
  problem_statement: string | null;
  ai_type: string | null;
  status: string;
  created_at: string;
}

/** Thrown when a catalog use case already exists on the target board. */
export class DuplicateBoardItemError extends Error {
  constructor(message = "This use case is already on the board.") {
    super(message);
    this.name = "DuplicateBoardItemError";
  }
}

/** Ensure the signed-in user has an organization + workspace; returns workspace.id.
 *  Delegates to the SECURITY DEFINER `ensure_user_workspace` RPC so standard
 *  users (who have no INSERT on organizations) can still create their first
 *  board. Retries once on transient network/RPC errors.
 */
export async function ensureWorkspace(
  _userId: string,
  opts: { onProgress?: (step: string) => void } = {},
): Promise<string> {
  const attempt = async () => {
    opts.onProgress?.("Provisioning your workspace…");
    const data = await ensureUserWorkspaceFn();
    if (!data) throw new Error("Workspace provisioning returned no workspace id.");
    return data as unknown as string;
  };
  try {
    return await attempt();
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const transient = /network|fetch|timeout|temporar|503|502|504/i.test(msg);
    if (!transient) throw new Error(`Workspace provisioning failed: ${msg}`);
    opts.onProgress?.("Retrying workspace provisioning…");
    try {
      return await attempt();
    } catch (e2: any) {
      throw new Error(`Workspace provisioning failed after retry: ${e2?.message ?? e2}`);
    }
  }
}

export interface SavedCatalogUseCase {
  saved_id: string;
  use_case_id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  saved_at: string;
}

/** List the signed-in user's saved catalog use cases (for importing into a board). */
export async function listSavedCatalogUseCases(userId: string): Promise<SavedCatalogUseCase[]> {
  const { data, error } = await supabase
    .from("saved_use_cases")
    .select("id, saved_at, use_case:use_cases(id, title, slug, summary)")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r: any) => r.use_case)
    .map((r: any) => ({
      saved_id: r.id,
      use_case_id: r.use_case.id,
      title: r.use_case.title,
      slug: r.use_case.slug,
      summary: r.use_case.summary,
      saved_at: r.saved_at,
    }));
}

export interface RepositoryUseCaseOption {
  use_case_id: string;
  title: string;
  summary: string | null;
  already_on_board: boolean;
}

/** List published catalog use cases for the "Add from repository" modal,
 *  flagging any that are already present on the given board so the UI can
 *  prevent duplicates. */
export async function listRepositoryUseCasesForBoard(
  boardId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<RepositoryUseCaseOption[]> {
  let query = supabase
    .from("use_cases")
    .select("id, title, summary")
    .eq("status", "published")
    .order("title", { ascending: true })
    .limit(opts.limit ?? 100);
  if (opts.search?.trim()) query = query.ilike("title", `%${opts.search.trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { data: existing, error: existErr } = await supabase
    .from("ai_use_cases")
    .select("source_use_case_id")
    .eq("board_id", boardId)
    .not("source_use_case_id", "is", null);
  if (existErr) throw new Error(existErr.message);
  const onBoard = new Set((existing ?? []).map((r: any) => r.source_use_case_id));

  return (data ?? []).map((r: any) => ({
    use_case_id: r.id,
    title: r.title,
    summary: r.summary,
    already_on_board: onBoard.has(r.id),
  }));
}

/** Import a saved catalog use case onto a board as a new ai_use_cases row. */
export async function addSavedUseCaseToBoard(input: {
  userId: string;
  boardId: string;
  catalogUseCaseId: string;
}): Promise<{ id: string }> {
  const { data: uc, error: ucErr } = await supabase
    .from("use_cases")
    .select("id, title, summary, business_problem")
    .eq("id", input.catalogUseCaseId)
    .maybeSingle();
  if (ucErr) throw new Error(ucErr.message);
  if (!uc) throw new Error("Saved use case is no longer available in the catalog.");

  // Prevent adding the same catalog use case to a board more than once.
  const { data: existing, error: existErr } = await supabase
    .from("ai_use_cases")
    .select("id")
    .eq("board_id", input.boardId)
    .eq("source_use_case_id", input.catalogUseCaseId)
    .maybeSingle();
  if (existErr) throw new Error(existErr.message);
  if (existing) throw new DuplicateBoardItemError(`"${uc.title}" is already on this board.`);

  const nextPosition = await nextBoardPosition(input.boardId);
  const { data, error } = await supabase
    .from("ai_use_cases")
    .insert({
      board_id: input.boardId,
      title: uc.title,
      problem_statement: (uc as any).business_problem ?? uc.summary ?? null,
      status: "idea",
      source_use_case_id: input.catalogUseCaseId,
      position: nextPosition,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if ((error as any)?.code === "23505")
      throw new DuplicateBoardItemError(`"${uc.title}" is already on this board.`);
    throw new Error(error?.message ?? "Could not add saved use case to board.");
  }
  trackCTAEvent("use_case_saved", {
    use_case_id: data.id,
    source_page: `/boards/${input.boardId}`,
  });
  return { id: data.id };
}

/** Hard cap so board lists stay bounded as workspaces grow. */
export const BOARD_LIST_CAP = 200;

export async function listBoards(): Promise<BoardRow[]> {
  const { data, error } = await supabase
    .from("use_case_boards")
    .select(
      "id, title, description, board_type, status, workspace_id, created_at, updated_at, ai_use_cases(count)",
    )
    .order("created_at", { ascending: false })
    .limit(BOARD_LIST_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: any) => ({
    ...b,
    item_count: b.ai_use_cases?.[0]?.count ?? 0,
  }));
}

export async function getBoard(boardId: string): Promise<BoardRow | null> {
  const { data, error } = await supabase
    .from("use_case_boards")
    .select("id, title, description, board_type, status, workspace_id, created_at, updated_at")
    .eq("id", boardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BoardRow | null;
}

export async function getBoardUseCases(boardId: string): Promise<BoardUseCaseRow[]> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("id, title, problem_statement, ai_type, status, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BoardUseCaseRow[];
}

export async function createBoard(input: {
  userId: string;
  title: string;
  description?: string;
  boardType?: string;
  onProgress?: (step: string) => void;
}): Promise<BoardRow> {
  const workspaceId = await ensureWorkspace(input.userId, { onProgress: input.onProgress });
  input.onProgress?.("Creating board…");
  const { data, error } = await supabase
    .from("use_case_boards")
    .insert({
      workspace_id: workspaceId,
      title: input.title.trim() || "Untitled Board",
      description: input.description?.trim() || null,
      board_type: input.boardType ?? "studio",
      created_by: input.userId,
    })
    .select("id, title, description, board_type, status, workspace_id, created_at, updated_at")
    .single();
  if (error || !data)
    throw new Error(error?.message ?? "Board insert failed (check workspace access).");
  return data as BoardRow;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from("use_case_boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
}

export async function renameBoard(input: {
  boardId: string;
  title: string;
  description?: string | null;
}): Promise<void> {
  const patch: { title: string; description?: string | null } = {
    title: input.title.trim() || "Untitled Board",
  };
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  const { error } = await supabase.from("use_case_boards").update(patch).eq("id", input.boardId);
  if (error) throw new Error(error.message);
}

/** Next position value for a new item on a board (max + 1). */
async function nextBoardPosition(boardId: string): Promise<number> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data?.position as number | undefined) ?? -1) + 1;
}

export async function removeBoardUseCase(useCaseId: string): Promise<void> {
  const { error } = await supabase.from("ai_use_cases").delete().eq("id", useCaseId);
  if (error) throw new Error(error.message);
}

/** Persist a new order for a board's use cases (array of ids in display order). */
export async function reorderBoardUseCases(input: {
  boardId: string;
  orderedIds: string[];
}): Promise<void> {
  await Promise.all(
    input.orderedIds.map((id, index) =>
      supabase
        .from("ai_use_cases")
        .update({ position: index })
        .eq("id", id)
        .eq("board_id", input.boardId)
        .then(({ error }) => {
          if (error) throw new Error(error.message);
        }),
    ),
  );
}

export async function createBoardUseCase(input: {
  userId: string;
  boardId: string;
  title: string;
  problem?: string;
  aiType?: string;
}): Promise<{ id: string }> {
  const nextPosition = await nextBoardPosition(input.boardId);
  const { data, error } = await supabase
    .from("ai_use_cases")
    .insert({
      board_id: input.boardId,
      title: input.title.trim() || "New AI Use Case",
      problem_statement: input.problem?.trim() || null,
      ai_type: input.aiType ?? null,
      status: "idea",
      position: nextPosition,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create use case.");
  trackCTAEvent("use_case_created", {
    use_case_id: data.id,
    source_page: `/boards/${input.boardId}`,
  });
  return { id: data.id };
}
