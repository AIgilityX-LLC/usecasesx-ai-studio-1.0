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
 *  board.
 */
export async function ensureWorkspace(_userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_user_workspace" as any);
  if (error || !data) throw new Error(error?.message ?? "Could not provision workspace.");
  return data as unknown as string;
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
  if (error || !data) throw new Error(error?.message ?? "Could not create board.");
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
