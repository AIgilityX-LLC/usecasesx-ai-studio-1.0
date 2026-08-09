import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Re-execute the launch-corpus quality gate over the whole global catalogue
 * and diff it against the currently published set. Publisher roles only —
 * the check is re-done server-side and never trusted from the client.
 */
export const runLaunchCorpusQa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = ["admin", "super_admin", "moderator", "ai_hub_admin", "usecasex_admin"] as const;
    let allowed = false;
    for (const role of roles) {
      const { data } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: role,
      });
      if (data === true) {
        allowed = true;
        break;
      }
    }
    if (!allowed) throw new Error("Forbidden");

    const { runCorpusQa } = await import("@/lib/admin/corpus-qa.server");
    return runCorpusQa(context.supabase);
  });
