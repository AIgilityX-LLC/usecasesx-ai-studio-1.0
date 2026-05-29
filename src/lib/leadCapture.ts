// Placeholder lead capture sink.
// Wire to a real server fn / CRM / Supabase table later.
import { trackCTAEvent } from "./usecasex.tracking";

export interface LeadCapturePayload {
  fullName: string;
  email: string;
  organization?: string | null;
  role?: string | null;
  country?: string | null;
  industry?: string | null;
  interestArea?: string | null;
  message?: string | null;
  consent: boolean;
  triggerCase: string;
  sourceUseCase?: string | null;
  sourcePage?: string | null;
}

export async function saveLeadCapture(payload: LeadCapturePayload): Promise<{ ok: true; id: string }> {
  // TODO: replace with Supabase insert / CRM forward / server fn.
  // eslint-disable-next-line no-console
  console.info("[leadCapture:save]", { ...payload, email: maskEmail(payload.email) });
  trackCTAEvent("lead_captured", {
    trigger: payload.triggerCase,
    interest: payload.interestArea,
    source_use_case: payload.sourceUseCase,
  });
  return { ok: true, id: `lead_${Date.now()}` };
}

function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!u || !d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}
