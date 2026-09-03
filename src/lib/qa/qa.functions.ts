import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { RUN_TRIGGERS } from "./launch-runs";
import { CHECK_STATUSES, LAUNCH_CHECKS } from "./harness";

const CHECK_IDS = LAUNCH_CHECKS.map((check) => check.id) as [string, ...string[]];

/** Resolves the caller's email and admin tier once, for probe context. */
async function callerContext(context: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  claims?: unknown;
}) {
  const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
    _user_id: context.userId,
  });
  const email =
    (context.claims as { email?: string } | undefined)?.email ??
    (await context.supabase.auth.getUser()).data?.user?.email ??
    null;
  return { userId: context.userId, email, isAdmin: Boolean(isAdmin) };
}

/**
 * Runs a single P0/P1 check by id — the step-by-step harness entry point.
 * Same session, same privileges, one probe at a time.
 */
export const runLaunchCheckFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.enum(CHECK_IDS) }).parse(d))
  .handler(async ({ data, context }) => {
    const { runSingleLaunchCheck } = await import("@/lib/qa/harness.server");
    const probeContext = await callerContext(context);
    return runSingleLaunchCheck(context.supabase, probeContext, data.id);
  });

const specResultSchema = z.object({
  spec: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(400),
  status: z.enum(["passed", "failed", "skipped", "timedOut"]),
  durationMs: z.number().int().min(0).max(3_600_000),
  error: z.string().trim().max(2000).nullish(),
});

/**
 * Records a browser P0/P1 suite run. Browsers cannot run inside the app
 * runtime, so the results come from the Playwright report produced by the
 * suite; this endpoint stores the measurement so the readiness browser gate
 * stops reading "unknown". Admin-only, actor pinned to the caller.
 */
export const recordBrowserSuiteRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        cohort: z.string().trim().min(1).max(60),
        participantEmail: z.string().trim().email().max(200).nullish(),
        durationMs: z.number().int().min(0).max(86_400_000).default(0),
        notes: z.string().trim().max(1000).nullish(),
        specResults: z.array(specResultSchema).min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { recordBrowserSuiteRun } = await import("@/lib/qa/browser-suite.server");
    const probeContext = await callerContext(context);
    if (!probeContext.isAdmin) {
      throw new Error("Only platform admins can record browser suite runs.");
    }
    return recordBrowserSuiteRun(context.supabase, {
      cohort: data.cohort,
      actorId: context.userId,
      actorEmail: probeContext.email,
      participantEmail: data.participantEmail ?? null,
      durationMs: data.durationMs,
      notes: data.notes ?? null,
      specResults: data.specResults.map((result) => ({
        ...result,
        error: result.error ?? null,
      })),
    });
  });

export const listBrowserSuiteRunsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        cohort: z.string().trim().min(1).max(60),
        limit: z.number().int().min(1).max(50).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { listBrowserSuiteRuns } = await import("@/lib/qa/browser-suite.server");
    return listBrowserSuiteRuns(context.supabase, data.cohort, data.limit);
  });

/**
 * Writes an already-completed step-by-step run to the ledger, so a run built
 * one check at a time counts as evidence exactly like a batch run.
 */
export const recordLaunchCheckResultsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        cohort: z.string().trim().min(1).max(60),
        trigger: z.enum(RUN_TRIGGERS).default("manual"),
        triggerDetail: z.string().trim().max(400).optional(),
        results: z
          .array(
            z.object({
              id: z.enum(CHECK_IDS),
              status: z.enum(CHECK_STATUSES),
              observed: z.string().max(2000),
              durationMs: z.number().int().min(0).max(3_600_000),
            }),
          )
          .min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { recordLaunchCheckRun } = await import("@/lib/qa/launch-runs.server");
    const { summarizeResults } = await import("@/lib/qa/harness");
    const probeContext = await callerContext(context);
    if (!probeContext.isAdmin) {
      throw new Error("Only platform admins can record launch check runs.");
    }
    const results = data.results.map((entry) => {
      const spec = LAUNCH_CHECKS.find((check) => check.id === entry.id)!;
      return { ...spec, ...entry };
    });
    return recordLaunchCheckRun(context.supabase, {
      cohort: data.cohort,
      trigger: data.trigger,
      triggerDetail: data.triggerDetail ?? null,
      actorId: context.userId,
      actorEmail: probeContext.email,
      results,
      summary: summarizeResults(results),
    });
  });



/**
 * Runs the signed-in P0/P1 launch checks as the calling user. There is no
 * elevation: the probes see exactly what this session is allowed to see, which
 * is what makes the result evidence.
 */
export const runLaunchChecksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runLaunchChecks } = await import("@/lib/qa/harness.server");
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    return runLaunchChecks(context.supabase, {
      userId: context.userId,
      email,
      isAdmin: Boolean(isAdmin),
    });
  });

/**
 * Runs the same signed-in checks and writes the result to the launch-check
 * ledger so it lands in the pilot evidence timeline. Admin-only: the insert
 * policy pins the actor to the caller and refuses non-admins.
 */
export const runAndRecordLaunchChecksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        cohort: z.string().trim().min(1).max(60),
        trigger: z.enum(RUN_TRIGGERS).default("manual"),
        triggerDetail: z.string().trim().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { runLaunchChecks } = await import("@/lib/qa/harness.server");
    const { recordLaunchCheckRun } = await import("@/lib/qa/launch-runs.server");
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only platform admins can record launch check runs.");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    const run = await runLaunchChecks(context.supabase, {
      userId: context.userId,
      email,
      isAdmin: true,
    });
    const recorded = await recordLaunchCheckRun(context.supabase, {
      cohort: data.cohort,
      trigger: data.trigger,
      triggerDetail: data.triggerDetail ?? null,
      actorId: context.userId,
      actorEmail: email,
      results: run.results,
      summary: run.summary,
    });
    return { run, recorded };
  });

export const listLaunchCheckRunsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        cohort: z.string().trim().min(1).max(60),
        limit: z.number().int().min(1).max(100).default(25),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { listLaunchCheckRuns } = await import("@/lib/qa/launch-runs.server");
    return listLaunchCheckRuns(context.supabase, data.cohort, data.limit);
  });

/**
 * Read model for the release-candidate status page: latest recorded launch
 * check run, the cohort roll-up and whether an evidence waiver is in force.
 * Admin-only, and nothing is invented when a read is not permitted.
 */
export const getLaunchReadinessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Platform administrator access is required.");

    const { getPilotSettings, buildCohortView } = await import("@/lib/pilot/pilot.server");
    const { summarizeCohort, latestEvidenceTimestamp } = await import("@/lib/pilot/pilot.model");
    const { listCohortOnboarding } = await import("@/lib/pilot/pilot.onboarding.server");
    const { listLaunchCheckRuns } = await import("@/lib/qa/launch-runs.server");
    const { listBrowserSuiteRuns } = await import("@/lib/qa/browser-suite.server");
    const { listWaivers } = await import("@/lib/pilot/pilot.governance.server");
    const { activeWaiver } = await import("@/lib/pilot/pilot.governance");

    const settings = await getPilotSettings(context.supabase);
    const [cohortView, runs, browserRuns, waivers, onboarding] = await Promise.all([
      buildCohortView(context.supabase, settings.cohort),
      listLaunchCheckRuns(context.supabase, settings.cohort, 10),
      listBrowserSuiteRuns(context.supabase, settings.cohort, 10),
      listWaivers(context.supabase, settings.cohort),
      listCohortOnboarding(context.supabase, settings.cohort),
    ]);
    const waiver = activeWaiver(waivers);
    const evidence = {
      onboardingProfiles: onboarding.length,
      latestEvidenceAt: latestEvidenceTimestamp(
        cohortView.checkpoints.map((c) => c.createdAt),
        onboarding.map((p) => p.completedAt),
      ),
    };
    return {
      cohort: settings.cohort,
      summary: summarizeCohort(cohortView.rows, settings.seatTarget, evidence),
      evidence,
      runs,
      browserRuns,
      browserRun: browserRuns[0] ?? null,
      waiverActive: Boolean(waiver),
      waiverNote: waiver
        ? `${waiver.reason} (approved by ${waiver.approverName}, ${waiver.approverRole})`
        : null,
      // Surfaced so the readiness page can show and retire the waiver in place.
      waiver: waiver
        ? {
            id: waiver.id,
            scope: waiver.scope,
            reason: waiver.reason,
            approverName: waiver.approverName,
            approverRole: waiver.approverRole,
            expiresAt: waiver.expiresAt,
            createdAt: waiver.createdAt,
          }
        : null,
    };
  });
