// Lead capture wired to Supabase via usecasex services.
import {
  createLeadCapture,
  trackCTAEvent as supabaseTrackCTAEvent,
  trackUseCaseDownload,
} from "./usecasex.services";
import { trackCTAEvent } from "./usecasex.tracking";
import { isEligibleEmail } from "./entitlements";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  /** Free-form source ref (slug or label). */
  sourceUseCase?: string | null;
  /** UUID of the source use case if known. */
  sourceUseCaseId?: string | null;
  sourcePage?: string | null;
}

export async function saveLeadCapture(
  payload: LeadCapturePayload,
): Promise<{ ok: true; id: string }> {
  const sourceUuid =
    payload.sourceUseCaseId && UUID_RE.test(payload.sourceUseCaseId)
      ? payload.sourceUseCaseId
      : payload.sourceUseCase && UUID_RE.test(payload.sourceUseCase)
        ? payload.sourceUseCase
        : null;

  // Founding-member / waitlist submissions carry an eligibility flag so the
  // team can triage who qualifies for gratis Pro vs. the Free Pro waitlist.
  const eligible = isEligibleEmail(payload.email);

  // 1. lead_captures
  await createLeadCapture({
    fullName: payload.fullName,
    email: payload.email,
    company: payload.organization ?? null,
    role: payload.role ?? null,
    country: payload.country ?? null,
    industry: payload.industry ?? null,
    interestArea: payload.interestArea ?? null,
    sourceUseCase: sourceUuid,
    sourcePage: payload.sourcePage ?? null,
    cta: payload.triggerCase,
    eligible,
    waitlistStatus: eligible ? "eligible" : "pending",
  });

  // 2. cta_events
  await supabaseTrackCTAEvent({
    cta: `lead_${payload.triggerCase}`,
    useCaseId: sourceUuid,
    targetPlatform: "usecasex",
    sourcePage: payload.sourcePage ?? null,
  });

  // 3. use_case_downloads (only for Lite PDF and when a real UUID is known)
  if (payload.triggerCase === "lite-pdf" && sourceUuid) {
    await trackUseCaseDownload({
      useCaseId: sourceUuid,
      assetKind: "lite_pdf",
      sourcePage: payload.sourcePage ?? null,
    });
  }

  trackCTAEvent("lead_captured", {
    trigger: payload.triggerCase,
    interest: payload.interestArea,
    source_use_case: payload.sourceUseCase,
  });

  return { ok: true, id: `lead_${Date.now()}` };
}
