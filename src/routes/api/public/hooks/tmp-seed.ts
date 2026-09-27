// TEMPORARY one-shot seeding hook — removed after use.
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/hooks/tmp-seed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const body = (await request.json()) as Record<string, string>;
        const logs: string[] = [];
        const orig = console.log;
        console.log = (...a: unknown[]) => logs.push(a.map(String).join(" "));
        const env = process.env as Record<string, string | undefined>;
        env["SUPABASE_URL"] ||= env["VITE_SUPABASE_URL"] || import.meta.env.VITE_SUPABASE_URL;
        env["SUPABASE_SERVICE_ROLE_KEY"] ||= env["DB_SERVICE_ROLE_KEY"];
        logs.push(`url:${!!env["SUPABASE_URL"]} key:${!!env["SUPABASE_SERVICE_ROLE_KEY"]}`);
        try {
          if (body.task === "tenants") {
            process.env["SAMPLE_TENANT_PASSWORD"] = body.password;
            await import(/* @vite-ignore */ "../../../../../scripts/seed/sample-tenants.mjs");
          } else if (body.task === "super") {
            process.env["SUPERADMIN_EMAIL"] = body.email;
            process.env["SUPERADMIN_PASSWORD"] = body.password;
            process.env["SUPERADMIN_NAME"] = body.name;
            await import(/* @vite-ignore */ "../../../../../scripts/seed/create-superadmin.mjs");
          }
          return Response.json({ ok: true, logs });
        } catch (e) {
          return Response.json({ ok: false, error: String(e), logs }, { status: 500 });
        } finally {
          console.log = orig;
        }
      },
    },
  },
});
