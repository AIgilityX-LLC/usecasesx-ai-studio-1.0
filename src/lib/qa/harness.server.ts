/**
 * Signed-in launch check probes (server-only).
 *
 * Each probe runs through the caller's own authenticated client, so what it
 * observes is exactly what that user's session is allowed to see. Probes are
 * read-only apart from one deliberate spoofed-insert attempt, which must be
 * refused by row-level security.
 */

import {
  LAUNCH_CHECKS,
  summarizeResults,
  type CheckResult,
  type CheckStatus,
  type HarnessCheck,
} from "./harness";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

type Probe = () => Promise<{ status: CheckStatus; observed: string }>;

export type HarnessRun = {
  runAt: string;
  actor: string;
  isAdmin: boolean;
  results: CheckResult[];
  summary: ReturnType<typeof summarizeResults>;
};

const check = (id: string): HarnessCheck => {
  const found = LAUNCH_CHECKS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown launch check: ${id}`);
  return found;
};

const RANDOM_UUID = "00000000-0000-4000-8000-000000000000";

export async function runLaunchChecks(
  supabase: Client,
  context: { userId: string; email: string | null; isAdmin: boolean },
): Promise<HarnessRun> {
  const probes: [string, Probe][] = [
    [
      "session.identity",
      async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) return { status: "error", observed: error.message };
        const id = data?.user?.id ?? null;
        return id === context.userId
          ? { status: "pass", observed: `Token resolves to the requesting user.` }
          : { status: "fail", observed: `Token resolved to ${id ?? "no user"}.` };
      },
    ],
    [
      "profile.exists",
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", context.userId);
        if (error) return { status: "error", observed: error.message };
        const count = (data ?? []).length;
        return count === 1
          ? { status: "pass", observed: "Exactly one profile row." }
          : { status: "fail", observed: `${count} profile row(s) readable for this user.` };
      },
    ],
    [
      "entitlement.resolves",
      async () => {
        const { data, error } = await supabase.rpc("has_pro_entitlement", {
          _user_id: context.userId,
        });
        if (error) return { status: "error", observed: error.message };
        return typeof data === "boolean"
          ? { status: "pass", observed: `Pro entitlement resolved to ${data}.` }
          : { status: "fail", observed: `Entitlement returned ${JSON.stringify(data)}.` };
      },
    ],
    [
      "roles.own_scope",
      async () => {
        const { data, error } = await supabase.from("user_roles").select("user_id, role");
        if (error) return { status: "error", observed: error.message };
        const rows = (data ?? []) as { user_id: string }[];
        const foreign = rows.filter((row) => row.user_id !== context.userId).length;
        return foreign === 0
          ? { status: "pass", observed: `${rows.length} own role row(s), no foreign rows.` }
          : { status: "fail", observed: `${foreign} role row(s) belong to other users.` };
      },
    ],
    [
      "repository.published_read",
      async () => {
        const { count, error } = await supabase
          .from("use_cases")
          .select("id", { count: "exact", head: true })
          .eq("status", "published");
        if (error) return { status: "error", observed: error.message };
        return (count ?? 0) > 0
          ? { status: "pass", observed: `${count} published use case(s) readable.` }
          : { status: "fail", observed: "No published use cases are readable." };
      },
    ],
    [
      "repository.unpublished_hidden",
      async () => {
        if (context.isAdmin) {
          return {
            status: "skipped",
            observed: "Caller is a platform admin and is expected to see unpublished rows.",
          };
        }
        const { data, error } = await supabase
          .from("use_cases")
          .select("id, status")
          .neq("status", "published")
          .limit(5);
        if (error) return { status: "error", observed: error.message };
        const leaked = (data ?? []).length;
        return leaked === 0
          ? { status: "pass", observed: "No unpublished rows returned." }
          : { status: "fail", observed: `${leaked} unpublished row(s) leaked to a non-admin.` };
      },
    ],
    [
      "submissions.own_scope",
      async () => {
        const { data, error } = await supabase
          .from("use_case_submissions")
          .select("id, submitted_by")
          .limit(50);
        if (error) return { status: "error", observed: error.message };
        const rows = (data ?? []) as { submitted_by: string | null }[];
        if (context.isAdmin) {
          return {
            status: "skipped",
            observed: `Platform admin reads the review queue (${rows.length} row(s)).`,
          };
        }
        const foreign = rows.filter((row) => row.submitted_by !== context.userId).length;
        return foreign === 0
          ? { status: "pass", observed: `${rows.length} own submission(s), no foreign rows.` }
          : { status: "fail", observed: `${foreign} submission(s) belong to other users.` };
      },
    ],
    [
      "saved.own_scope",
      async () => {
        const { data, error } = await supabase
          .from("saved_use_cases")
          .select("id, user_id")
          .limit(50);
        if (error) return { status: "error", observed: error.message };
        const rows = (data ?? []) as { user_id: string | null }[];
        const foreign = rows.filter((row) => row.user_id !== context.userId).length;
        return foreign === 0
          ? { status: "pass", observed: `${rows.length} own saved row(s), no foreign rows.` }
          : { status: "fail", observed: `${foreign} saved row(s) belong to other users.` };
      },
    ],
    [
      "workspace.membership",
      async () => {
        const { data, error } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", context.userId);
        if (error) return { status: "error", observed: error.message };
        const count = (data ?? []).length;
        return count > 0
          ? { status: "pass", observed: `Member of ${count} workspace(s).` }
          : { status: "fail", observed: "No workspace membership resolved for this user." };
      },
    ],
    [
      "tenancy.cross_workspace_denied",
      async () => {
        const { data: memberships, error: membershipError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", context.userId);
        if (membershipError) return { status: "error", observed: membershipError.message };
        const mine = ((memberships ?? []) as { workspace_id: string }[]).map(
          (row) => row.workspace_id,
        );
        if (mine.length === 0) {
          return { status: "skipped", observed: "No workspace to probe from." };
        }
        const { data, error } = await supabase
          .from("portfolios")
          .select("id, workspace_id")
          .not("workspace_id", "in", `(${mine.join(",")})`)
          .limit(5);
        if (error) return { status: "error", observed: error.message };
        const leaked = (data ?? []).length;
        return leaked === 0
          ? { status: "pass", observed: "Cross-workspace portfolio read returned nothing." }
          : { status: "fail", observed: `${leaked} portfolio row(s) from other workspaces.` };
      },
    ],
    [
      "telemetry.own_scope",
      async () => {
        const { data, error } = await supabase
          .from("ai_usage_events")
          .select("id, user_id")
          .limit(50);
        if (error) return { status: "error", observed: error.message };
        const rows = (data ?? []) as { user_id: string | null }[];
        if (context.isAdmin) {
          return {
            status: "skipped",
            observed: `Platform admin reads AI usage for observability (${rows.length} row(s)).`,
          };
        }
        const foreign = rows.filter((row) => row.user_id && row.user_id !== context.userId).length;
        return foreign === 0
          ? { status: "pass", observed: `${rows.length} own AI usage row(s).` }
          : { status: "fail", observed: `${foreign} AI usage row(s) belong to other users.` };
      },
    ],
    [
      "rls.spoofed_insert_denied",
      async () => {
        const { data, error } = await supabase
          .from("pilot_verdict_snapshots")
          .insert({
            verdict: "harness_probe",
            headline: "Harness spoofed-owner probe — must be refused",
            recorded_by: RANDOM_UUID,
          })
          .select("id");
        if (error) {
          return {
            status: "pass",
            observed: `Database refused the spoofed insert: ${error.code ?? "denied"}.`,
          };
        }
        const inserted = ((data ?? []) as { id: string }[])[0]?.id ?? "unknown";
        return {
          status: "fail",
          observed: `Spoofed insert succeeded (row ${inserted}) — the owner column is not pinned to the caller.`,
        };
      },
    ],
    [
      "admin.surface_gated",
      async () => {
        const { data, error } = await supabase
          .from("pilot_settings")
          .select("cohort")
          .eq("id", true);
        const rows = (data ?? []).length;
        if (context.isAdmin) {
          if (error) return { status: "error", observed: `Admin read failed: ${error.message}` };
          return rows > 0
            ? { status: "pass", observed: "Platform admin reads pilot settings." }
            : { status: "fail", observed: "Platform admin could not read pilot settings." };
        }
        return error || rows === 0
          ? { status: "pass", observed: "Non-admin cannot read pilot settings." }
          : { status: "fail", observed: "Non-admin read admin-only pilot settings." };
      },
    ],
  ];

  const results: CheckResult[] = [];
  for (const [id, probe] of probes) {
    const spec = check(id);
    const started = Date.now();
    try {
      const outcome = await probe();
      results.push({ ...spec, ...outcome, durationMs: Date.now() - started });
    } catch (error) {
      results.push({
        ...spec,
        status: "error",
        observed: error instanceof Error ? error.message : "Probe threw an unknown error.",
        durationMs: Date.now() - started,
      });
    }
  }

  return {
    runAt: new Date().toISOString(),
    actor: context.email ?? context.userId,
    isAdmin: context.isAdmin,
    results,
    summary: summarizeResults(results),
  };
}
