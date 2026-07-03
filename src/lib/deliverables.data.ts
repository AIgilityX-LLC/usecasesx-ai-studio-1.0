import { supabase } from "@/integrations/supabase/client";
import type { DeliverableType, DeliverableStatus } from "@/lib/deliverables";

export interface DeliverableRow {
  id: string;
  use_case_id: string;
  deliverable_type: DeliverableType;
  status: DeliverableStatus;
  content: Record<string, unknown>;
  updated_at: string;
}

export async function loadDeliverables(useCaseId: string): Promise<DeliverableRow[]> {
  const { data, error } = await supabase
    .from("use_case_deliverables")
    .select("id,use_case_id,deliverable_type,status,content,updated_at")
    .eq("use_case_id", useCaseId);
  if (error) throw error;
  return (data ?? []) as DeliverableRow[];
}

export async function loadDeliverable(
  useCaseId: string,
  type: DeliverableType,
): Promise<DeliverableRow | null> {
  const { data, error } = await supabase
    .from("use_case_deliverables")
    .select("id,use_case_id,deliverable_type,status,content,updated_at")
    .eq("use_case_id", useCaseId)
    .eq("deliverable_type", type)
    .maybeSingle();
  if (error) throw error;
  return (data as DeliverableRow | null) ?? null;
}

export async function saveDeliverable(
  useCaseId: string,
  type: DeliverableType,
  content: Record<string, unknown>,
  status: DeliverableStatus,
): Promise<void> {
  const { data: existing } = await supabase
    .from("use_case_deliverables")
    .select("id")
    .eq("use_case_id", useCaseId)
    .eq("deliverable_type", type)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("use_case_deliverables")
      .update({ content: content as never, status })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("use_case_deliverables").insert({
      use_case_id: useCaseId,
      deliverable_type: type,
      content: content as never,
      status,
      created_by: userData.user?.id ?? null,
    });
    if (error) throw error;
  }
}