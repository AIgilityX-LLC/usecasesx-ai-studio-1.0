import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";

export type CtaEvent =
  | "view_use_case"
  | "filter_used"
  | "search_used"
  | "custom_use_case_requested"
  | "cta_clicked"
  | "results_load_more"
  | "collection_selected"
  | "conversion_intent"
  | "save_to_shortlist"
  | "customize_in_studio"
  | "share_use_case"
  | "contact_form_submitted"
  | "print_use_case";

export function track(event: CtaEvent, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  void persistEvent(event, payload);
}

export function trackCTAEvent(cta: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  void persistEvent(cta, payload);
}

/** Coarse device class derived from viewport width and touch capability. */
export function detectDevice(
  width: number,
  coarsePointer: boolean,
): "desktop" | "tablet" | "mobile" {
  if (width < 640) return "mobile";
  if (width < 1024 || coarsePointer) return "tablet";
  return "desktop";
}

async function persistEvent(cta: string, payload: Record<string, unknown> = {}): Promise<void> {
  if (!PUBLIC_LAUNCH_FEATURES.lifecycleAnalytics) return;
  const { data } = await supabase.auth.getUser();
  const useCaseId = typeof payload.use_case_id === "string" ? payload.use_case_id : null;
  const { error } = await supabase.from("cta_events").insert({
    cta: cta.slice(0, 100),
    user_id: data.user?.id ?? null,
    use_case_id: useCaseId,
    source_page:
      typeof payload.source_page === "string"
        ? payload.source_page.slice(0, 500)
        : window.location.pathname,
    target_route:
      typeof payload.target_route === "string" ? payload.target_route.slice(0, 500) : null,
    target_platform:
      typeof payload.target_platform === "string" ? payload.target_platform.slice(0, 100) : null,
    session_id: window.sessionStorage.getItem("usecasex_session_id"),
    device: detectDevice(
      window.innerWidth,
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches,
    ),
  });
  if (error) console.warn("[usecasex:analytics] event rejected", cta, error.message);
}
