import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { RUN_TRIGGERS } from "./launch-runs";

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
    const { listWaivers } = await import("@/lib/pilot/pilot.governance.server");
    const { activeWaiver } = await import("@/lib/pilot/pilot.governance");

    const settings = await getPilotSettings(context.supabase);
    const [cohortView, runs, waivers, onboarding] = await Promise.all([
      buildCohortView(context.supabase, settings.cohort),
      listLaunchCheckRuns(context.supabase, settings.cohort, 10),
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
      waiverActive: Boolean(waiver),
      waiverNote: waiver
        ? `${waiver.reason} (approved by ${waiver.approverName}, ${waiver.approverRole})`
        : null,
    };
  });
