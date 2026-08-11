/**
 * Server-only assembly of the pilot triage report.
 *
 * Reads existing signal surfaces (cohort view, feedback queue, launch-learning
 * aggregates, security alerts) and runs the pure triage rules over them. No new
 * tables, no new writes — this is a read-only stabilisation view.
 */
import { summarizeCohort } from "@/lib/pilot/pilot.model";
import {
  evaluateEvidenceGap,
  recommendFreeze,
  triagePilotEvidence,
  type EvidenceGapAlert,
  type FreezeRecommendation,
  type PilotEvidence,
  type TriageFinding,
} from "@/lib/pilot/pilot.triage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export type PilotTriageReport = {
  cohort: string;
  windowDays: number;
  evidence: PilotEvidence;
  findings: TriageFinding[];
  freeze: FreezeRecommendation;
  evidenceGap: EvidenceGapAlert;
  generatedAt: string;
};

export async function buildPilotTriageReport(
  supabase: Client,
  options: { windowDays?: number } = {},
): Promise<PilotTriageReport> {
  const windowDays = Math.min(90, Math.max(7, options.windowDays ?? 30));
  const { getPilotSettings, buildCohortView } = await import("@/lib/pilot/pilot.server");
  const { listFeedbackQueue } = await import("@/lib/feedback/feedback.server");
  const { aggregateLaunchLearning } = await import("@/lib/analytics/launch-learning.server");
  const { securityAlerts } = await import("@/lib/observability/observability.server");

  const settings = await getPilotSettings(supabase);
  const to = new Date();
  const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [cohortView, feedback, learning, alerts] = await Promise.all([
    buildCohortView(supabase, settings.cohort),
    listFeedbackQueue(supabase, { includeDemo: false }),
    aggregateLaunchLearning(supabase, { from: from.toISOString(), to: to.toISOString() }).catch(
      () => null,
    ),
    securityAlerts(supabase, null, Math.min(windowDays, 30)).catch(() => null),
  ]);

  const evidence: PilotEvidence = {
    cohort: summarizeCohort(cohortView.rows, settings.seatTarget),
    checkpoints: cohortView.checkpoints,
    feedback,
    aiUsage: learning?.aiUsage ?? [],
    noResultSearches: learning?.noResultSearches ?? [],
    securityAlerts: alerts?.alerts ?? [],
  };

  const findings = triagePilotEvidence(evidence);
  const invitedAts = cohortView.rows
    .map((row: { invitedAt: string | null }) => row.invitedAt)
    .filter((value: string | null): value is string => Boolean(value))
    .sort();
  return {
    cohort: settings.cohort,
    windowDays,
    evidence,
    findings,
    freeze: recommendFreeze(evidence, findings),
    evidenceGap: evaluateEvidenceGap(evidence, {
      cohortStartedAt: invitedAts[0] ?? null,
      cohortOpenedAt: settings.updatedAt ?? settings.pausedAt ?? null,
      now: to,
    }),
    generatedAt: to.toISOString(),
  };
}
