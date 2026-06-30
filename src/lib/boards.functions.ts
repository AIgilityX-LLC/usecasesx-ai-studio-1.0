// Server-side board access with explicit 404 (missing) vs 403 (denied) errors.
// Client-side RLS hides both as "no rows", which makes UX confusing — this
// helper distinguishes them by re-checking with the admin client when the
// user-scoped read returns nothing.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BoardAccessError =
  | { kind: "not_found"; message: string }
  | { kind: "forbidden"; message: string };

export interface LoadedBoard {
  id: string;
  title: string;
  description: string | null;
  board_type: string | null;
  status: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface LoadedBoardItem {
  id: string;
  title: string;
  problem_statement: string | null;
  ai_type: string | null;
  status: string;
  created_at: string;
  position: number;
  source_use_case_id: string | null;
}

export const loadBoardWithItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ boardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { boardId } = data;
    const userId = context.userId;

    // 1. Try as the signed-in user (RLS-enforced).
    const { data: board, error: boardErr } = await context.supabase
      .from("use_case_boards")
      .select("id, title, description, board_type, status, workspace_id, created_at, updated_at")
      .eq("id", boardId)
      .maybeSingle();
    if (boardErr) {
      console.error("[loadBoardWithItems] user read failed", { userId, boardId, err: boardErr.message });
      throw new Error(boardErr.message);
    }

    if (!board) {
      // 2. Disambiguate missing vs forbidden using the admin client.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: any_board, error: adminErr } = await supabaseAdmin
        .from("use_case_boards")
        .select("id, workspace_id")
        .eq("id", boardId)
        .maybeSingle();
      if (adminErr) {
        console.error("[loadBoardWithItems] admin probe failed", { boardId, err: adminErr.message });
        throw new Error(adminErr.message);
      }
      if (!any_board) {
        console.warn("[loadBoardWithItems] not_found", { userId, boardId });
        const err: any = new Error("This board no longer exists or has been deleted.");
        err.kind = "not_found";
        err.statusCode = 404;
        throw err;
      }
      console.warn("[loadBoardWithItems] forbidden", { userId, boardId, workspace_id: any_board.workspace_id });
      const err: any = new Error("You don't have access to this board. Ask its owner to add you to the workspace.");
      err.kind = "forbidden";
      err.statusCode = 403;
      throw err;
    }

    // 3. Fetch items (RLS-enforced; same access rules).
    const { data: items, error: itemsErr } = await context.supabase
      .from("ai_use_cases")
      .select("id, title, problem_statement, ai_type, status, created_at, position, source_use_case_id, board_id")
      .eq("board_id", boardId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (itemsErr) {
      console.error("[loadBoardWithItems] items read failed", { userId, boardId, err: itemsErr.message });
      throw new Error(itemsErr.message);
    }

    // Defense in depth: every returned item must belong to the requested board.
    // RLS + the .eq filter both enforce this; assert it server-side so any
    // future policy regression is caught loudly instead of leaking cross-board
    // items into the UI.
    const safeItems = (items ?? []).filter((it: any) => it.board_id === boardId);
    if (safeItems.length !== (items?.length ?? 0)) {
      console.error("[loadBoardWithItems] item board_id mismatch — dropping leaked rows", {
        userId, boardId, returned: items?.length, kept: safeItems.length,
      });
    }

    return {
      board: board as LoadedBoard,
      items: safeItems.map(({ board_id: _b, ...rest }: any) => rest) as LoadedBoardItem[],
    };
  });
