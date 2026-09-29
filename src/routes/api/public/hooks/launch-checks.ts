/**
 * Scheduled P0/P1 launch-check run.
 *
 * Called by the platform scheduler (pg_cron) with the `CRON_HOOK_SECRET`
 * shared secret in the `Authorization: Bearer …` header.
 *
 * The probes are only meaningful when they run through a real signed-in
 * session — the whole point is to observe what a participant's own
 * row-level-security scope allows. So this hook signs in a dedicated
 * checks account (`LAUNCH_CHECK_EMAIL` / `LAUNCH_CHECK_PASSWORD`) and runs
 * the harness as that user. Without those credentials it refuses to run
 * rather than recording a run that proves nothing.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCronHook, unauthorized } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/launch-checks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAuthorizedCronHook(request, "launch-checks"))) return unauthorized();
        const { assertOptionalWebhookReplay } = await import("@/lib/cron-auth.server");
        const replay = assertOptionalWebhookReplay(request);
        if (replay) return replay;

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const email = process.env["LAUNCH_CHECK_EMAIL"];
        const password = process.env["LAUNCH_CHECK_PASSWORD"];

        if (!url || !key) {
          return Response.json(
            { ok: false, error: "Backend configuration is missing." },
            { status: 500 },
          );
        }
        if (!email || !password) {
          return Response.json(
            {
              ok: false,
              error:
                "LAUNCH_CHECK_EMAIL and LAUNCH_CHECK_PASSWORD are not configured. The checks need a real session to be meaningful, so no run was recorded.",
            },
            { status: 503 },
          );
        }

        let cohort = "pilot";
        try {
          const raw = (await request.json()) as { cohort?: unknown } | null;
          if (raw && typeof raw.cohort === "string" && raw.cohort.trim()) {
            cohort = raw.cohort.trim().slice(0, 60);
          }
        } catch {
          // Empty body is the normal scheduler shape.
        }

        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (signIn.error || !signIn.data.user) {
          console.error("[launch-checks] sign-in failed", signIn.error?.message);
          return Response.json(
            { ok: false, error: "The launch-check account could not sign in." },
            { status: 502 },
          );
        }

        const userId = signIn.data.user.id;

        try {
          const { runLaunchChecks } = await import("@/lib/qa/harness.server");
          const { recordLaunchCheckRun } = await import("@/lib/qa/launch-runs.server");
          const { data: isAdmin } = await supabase.rpc("is_admin_tier", { _user_id: userId });

          const run = await runLaunchChecks(supabase, {
            userId,
            email,
            isAdmin: Boolean(isAdmin),
          });

          const recorded = await recordLaunchCheckRun(supabase, {
            cohort,
            trigger: "scheduled",
            triggerDetail: "Automated daily run",
            actorId: userId,
            actorEmail: email,
            results: run.results,
            summary: run.summary,
          });

          return Response.json({
            ok: true,
            runId: recorded.id,
            summary: run.summary,
          });
        } catch (error) {
          console.error("[launch-checks] run failed", error);
          return Response.json({ ok: false, error: "Launch checks failed" }, { status: 500 });
        } finally {
          await supabase.auth.signOut();
        }
      },
    },
  },
});
