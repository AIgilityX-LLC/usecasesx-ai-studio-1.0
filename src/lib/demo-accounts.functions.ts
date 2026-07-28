import { createServerFn } from "@tanstack/react-start";

export type DemoAccount = {
  email: string;
  password: string;
  label: string;
  role: "admin" | "moderator" | null;
  plan_type: "lite" | "pro" | "enterprise";
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@demo.usecasex.app",
    password: "Demo@123",
    label: "Admin",
    role: "admin",
    plan_type: "enterprise",
  },
  {
    email: "moderator@demo.usecasex.app",
    password: "Demo@123",
    label: "Moderator",
    role: "moderator",
    plan_type: "pro",
  },
  {
    email: "enterprise@demo.usecasex.app",
    password: "Demo@123",
    label: "Enterprise",
    role: null,
    plan_type: "enterprise",
  },
  {
    email: "pro@demo.usecasex.app",
    password: "Demo@123",
    label: "Pro",
    role: null,
    plan_type: "pro",
  },
  {
    email: "lite@demo.usecasex.app",
    password: "Demo@123",
    label: "Lite",
    role: null,
    plan_type: "lite",
  },
];

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const results: Array<{ email: string; created: boolean }> = [];

  for (const acct of DEMO_ACCOUNTS) {
    // Check if user already exists by listing (cheap because demo set is small)
    const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed?.users.find((u) => u.email?.toLowerCase() === acct.email.toLowerCase());

    let userId = existing?.id;
    let created = false;

    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        email_confirm: true,
        user_metadata: { demo: true, label: acct.label },
      });
      if (error) {
        console.error("[seedDemoAccounts] create error", acct.email, error.message);
        continue;
      }
      userId = data.user?.id;
      created = true;
    } else {
      // Ensure password matches Demo@123 in case it drifted
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: acct.password,
        email_confirm: true,
      });
    }

    if (!userId) continue;

    // Upsert profile with plan
    await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        email: acct.email,
        plan_type: acct.plan_type,
        full_name: `${acct.label} Demo`,
      },
      { onConflict: "user_id" },
    );

    // Assign role (if any)
    if (acct.role) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: acct.role }, { onConflict: "user_id,role" });
    }

    results.push({ email: acct.email, created });
  }

  return { ok: true, results };
});
