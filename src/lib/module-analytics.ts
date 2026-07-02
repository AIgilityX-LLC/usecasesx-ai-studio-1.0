import { supabase } from "@/integrations/supabase/client";

export type ModuleEventType = "view" | "click" | "lock_attempt" | "unlock_attempt";

/**
 * Fire-and-forget module engagement tracking. Inserts into module_events.
 * Works for signed-in (attaches user_id) and anonymous users (RLS allows anon
 * insert of the whitelisted event types).
 */
export async function trackModuleEvent(
  moduleKey: string,
  eventType: ModuleEventType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("module_events").insert({
      module_key: moduleKey,
      event_type: eventType,
      user_id: data.user?.id ?? null,
      metadata: metadata as never,
    });
  } catch {
    /* analytics must never break UX */
  }
}

export const MODULE_LABELS: Record<string, string> = {
  repository: "Global Repository",
  studio: "AI Use Case Studio",
  sarpi: "SARPI Suite",
  advisorx: "AdvisorX",
  boards: "Use Case Boards",
  feasibility: "Feasibility Scoring",
  "data-readiness": "Data Readiness",
  blueprint: "Blueprint Builder",
  roadmap: "Portfolio Roadmap",
  collections: "Collections",
  patterns: "Pattern Library",
  insights: "Deployment Intelligence",
};

export function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key;
}
