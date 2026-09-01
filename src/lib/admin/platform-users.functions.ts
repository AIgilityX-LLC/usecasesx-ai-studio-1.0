/**
 * Platform administrator management — server functions (thin wrappers).
 *
 * Every handler re-verifies that the caller holds `super_admin` through the
 * authenticated (RLS-scoped) client before loading the service-role helpers.
 * Route-level role gates are UX only; this is the security boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["super_admin", "admin"]);

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(14).max(72),
  fullName: z.string().trim().min(2).max(120),
  roles: z.array(roleSchema).min(1).max(2),
  organizationId: z.string().uuid().nullable().optional(),
});

const idSchema = z.object({ userId: z.string().uuid() });

async function assertSuperAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(`Authorization check failed: ${error.message}`);
  if (data !== true) throw new Error("Forbidden: super_admin role required.");
}

export const listPlatformAdminsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { listPlatformAdmins, listOrganizationOptions } =
      await import("@/lib/admin/platform-users.server");
    const [accounts, organizations] = await Promise.all([
      listPlatformAdmins(),
      listOrganizationOptions(),
    ]);
    return { accounts, organizations, viewerId: context.userId };
  });

export const createPlatformAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { createPlatformAdmin } = await import("@/lib/admin/platform-users.server");
    return createPlatformAdmin(context.userId, {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      roles: data.roles,
      organizationId: data.organizationId ?? null,
    });
  });

export const setPlatformAdminDisabledFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.extend({ disabled: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { setPlatformAdminDisabled } = await import("@/lib/admin/platform-users.server");
    return setPlatformAdminDisabled(context.userId, data.userId, data.disabled);
  });

export const resetPlatformAdminPasswordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema
      .extend({ password: z.string().min(14).max(72), email: z.string().trim().email() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { resetPlatformAdminPassword } = await import("@/lib/admin/platform-users.server");
    return resetPlatformAdminPassword(context.userId, data.userId, data.password, data.email);
  });

export const updatePlatformAdminRolesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema.extend({ roles: z.array(roleSchema).min(1).max(2) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { updatePlatformAdminRoles } = await import("@/lib/admin/platform-users.server");
    return updatePlatformAdminRoles(context.userId, data.userId, data.roles);
  });

export const assignPlatformAdminOrganizationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema.extend({ organizationId: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { assignPlatformAdminOrganization } = await import("@/lib/admin/platform-users.server");
    return assignPlatformAdminOrganization(context.userId, data.userId, data.organizationId);
  });
