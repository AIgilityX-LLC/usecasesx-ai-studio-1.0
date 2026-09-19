import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * "Customize in Studio" — copy a curated global repository entry into a
 * workspace-owned Studio draft.
 *
 * The global `use_cases` record is NEVER modified: the copy is written to
 * `ai_use_cases` (workspace/board scoped, RLS enforced as the signed-in user)
 * and keeps `source_use_case_id` so lineage back to the global source is
 * always resolvable. Re-running for the same source returns the existing
 * draft instead of creating duplicates.
 */
export const customizeUseCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: source, error: srcErr } = await supabase
      .from("use_cases")
      .select(
        `id, slug, title, summary, business_problem, problem, ai_solution_concept, solution,
         business_value, outcomes, data_required, kpis, roi_areas, risk_level,
         governance_notes, cybersecurity_notes, privacy_notes,
         use_case_capabilities ( ai_capabilities ( name ) )`,
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (srcErr) throw new Error(srcErr.message);
    if (!source) throw new Error("This use case is not available for customization.");

    // Workspace provisioning is idempotent (SECURITY DEFINER RPC).
    const { data: workspaceId, error: wsErr } = await supabase.rpc("ensure_user_workspace");
    if (wsErr) throw new Error(wsErr.message);
    if (!workspaceId) throw new Error("Could not resolve your workspace.");

    // One dedicated board per workspace holds customized repository entries.
    const BOARD_TITLE = "Customized from repository";
    const { data: existingBoard, error: boardErr } = await supabase
      .from("use_case_boards")
      .select("id")
      .eq("workspace_id", workspaceId as string)
      .eq("title", BOARD_TITLE)
      .maybeSingle();
    if (boardErr) throw new Error(boardErr.message);

    let boardId = existingBoard?.id as string | undefined;
    if (!boardId) {
      const { data: created, error: createErr } = await supabase
        .from("use_case_boards")
        .insert({
          workspace_id: workspaceId as string,
          title: BOARD_TITLE,
          description: "Private drafts started from curated global repository entries.",
          board_type: "customization",
          status: "active",
          created_by: userId,
        })
        .select("id")
        .single();
      if (createErr || !created) throw new Error(createErr?.message ?? "Could not create board.");
      boardId = created.id;
    }

    // Reuse an existing draft for the same source rather than duplicating.
    const { data: existingDraft, error: draftErr } = await supabase
      .from("ai_use_cases")
      .select("id")
      .eq("board_id", boardId)
      .eq("source_use_case_id", source.id)
      .maybeSingle();
    if (draftErr) throw new Error(draftErr.message);
    if (existingDraft) {
      return { draftId: existingDraft.id as string, boardId, reused: true };
    }

    const { data: last } = await supabase
      .from("ai_use_cases")
      .select("position")
      .eq("board_id", boardId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = ((last?.position as number | undefined) ?? -1) + 1;

    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const capability =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (source as any).use_case_capabilities?.[0]?.ai_capabilities?.name ?? null;

    const { data: draft, error: insErr } = await supabase
      .from("ai_use_cases")
      .insert({
        board_id: boardId,
        source_use_case_id: source.id,
        title: source.title,
        problem_statement: source.business_problem ?? source.problem ?? source.summary ?? null,
        future_state: source.ai_solution_concept ?? source.solution ?? null,
        ai_type: capability,
        risk_level: source.risk_level ?? null,
        data_sources: source.data_required ? [source.data_required] : [],
        expected_benefits: asArray(source.roi_areas),
        kpis: asArray(source.kpis),
        status: "idea",
        position,
        created_by: userId,
      })
      .select("id")
      .single();
    if (insErr || !draft) throw new Error(insErr?.message ?? "Could not create your draft.");

    return { draftId: draft.id as string, boardId, reused: false };
  });
