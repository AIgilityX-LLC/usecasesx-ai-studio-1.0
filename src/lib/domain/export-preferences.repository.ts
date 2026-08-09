/**
 * Workspace-scoped export preferences.
 *
 * Stores the chosen export columns per workspace and export surface (for
 * example `roadmap`). RLS keeps a workspace's preferences to its own members.
 */

import { supabase } from "@/integrations/supabase/client";
import { unwrapResult } from "./errors";
import { parseInput, uuidSchema } from "./validation";

export async function getExportPreferences(
  workspaceId: string,
  exportKey: string,
): Promise<string[] | null> {
  const id = parseInput(uuidSchema, workspaceId);
  const result = await supabase
    .from("workspace_export_preferences")
    .select("columns")
    .eq("workspace_id", id)
    .eq("export_key", exportKey)
    .maybeSingle();
  const row = unwrapResult(result, { allowNull: true }) as { columns?: string[] } | null;
  return row?.columns ?? null;
}

export async function saveExportPreferences(
  workspaceId: string,
  exportKey: string,
  columns: string[],
  userId?: string | null,
): Promise<void> {
  const id = parseInput(uuidSchema, workspaceId);
  const result = await supabase.from("workspace_export_preferences").upsert(
    {
      workspace_id: id,
      export_key: exportKey,
      columns,
      updated_by: userId ?? null,
    },
    { onConflict: "workspace_id,export_key" },
  );
  unwrapResult(result, { allowNull: true });
}
