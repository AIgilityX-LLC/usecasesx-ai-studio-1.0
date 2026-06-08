// Helpers for the real Use Case Boards feature.
// Reads/writes use_case_boards + ai_use_cases via the user-scoped supabase client.
// Ensures the user has an org + workspace before creating a board.

import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase.rpc("ensure_user_workspace" as any);
    if (error) throw error;
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

  const { data, error } = await supabase
    .from("ai_use_cases")
    .insert({
      board_id: input.boardId,
      title: uc.title,
      problem_statement: (uc as any).business_problem ?? uc.summary ?? null,
      status: "idea",
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add saved use case to board.");
  return { id: data.id };
}

export async function listBoards(): Promise<BoardRow[]> {
  const { data, error } = await supabase
    .from("use_case_boards")
    .select(
      "id, title, description, board_type, status, workspace_id, created_at, updated_at, ai_use_cases(count)",
    )
    .order("created_at", { ascending: false });
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
}): Promise<BoardRow> {
  const workspaceId = await ensureWorkspace(input.userId);
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
  if (error || !data) throw new Error(error?.message ?? "Board insert failed (check workspace access).");
  return data as BoardRow;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from("use_case_boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
}

export async function createBoardUseCase(input: {
  userId: string;
  boardId: string;
  title: string;
  problem?: string;
  aiType?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .insert({
      board_id: input.boardId,
      title: input.title.trim() || "New AI Use Case",
      problem_statement: input.problem?.trim() || null,
      ai_type: input.aiType ?? null,
      status: "idea",
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create use case.");
  return { id: data.id };
}
