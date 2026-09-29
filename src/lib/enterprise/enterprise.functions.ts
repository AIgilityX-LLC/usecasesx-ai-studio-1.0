/**
 * Thin createServerFn wrappers for enterprise SSO + tenant policy + support access.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ssoConfigInputSchema, ssoDiscoverInputSchema, SCIM_STATUS } from "./sso";
import { tenantPolicyInputSchema } from "./tenant-policy";
import { grantSupportAccessInputSchema, revokeSupportAccessInputSchema } from "./support-access";
import { AUDIT_EVENTS } from "@/lib/telemetry/events";

export const discoverSsoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => ssoDiscoverInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { discoverSsoByEmail } = await import("./sso.server");
    const hit = await discoverSsoByEmail(supabaseAdmin, data.email);
    return { hit, scim: SCIM_STATUS };
  });

export const getSsoConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { getSsoConfigForOrg } = await import("./sso.server");
    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);
    const config = await getSsoConfigForOrg(context.supabase as any, organizationId);
    return { organizationId, config, scim: SCIM_STATUS };
  });

export const saveSsoConfigFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ssoConfigInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { upsertSsoConfig } = await import("./sso.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { evaluate } = await import("@/lib/authz/permission-service");
    const { resolveSubject, serverCapabilityFlags } = await import("@/lib/authz.server");

    if (!serverCapabilityFlags().sso) {
      throw new Error("SSO is not enabled for this deployment.");
    }

    const subject = await resolveSubject(context.supabase as any, context.userId);
    if (!evaluate(subject, "sso.configure").allowed) {
      throw new Error("You do not have permission to configure SSO.");
    }

    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);
    const config = await upsertSsoConfig(
      context.supabase as any,
      organizationId,
      context.userId,
      data,
    );

    await writeAuditEvent(
      {
        supabase: context.supabase as any,
        userId: context.userId,
        tenant: { organizationId, workspaceId: subject.workspaceId },
      },
      {
        event: AUDIT_EVENTS.adminAction,
        entity: { type: "organization_sso_config", id: config.id },
        next: {
          protocol: config.protocol,
          enabled: config.enabled,
          domainCount: config.allowedDomains.length,
          jitEnabled: config.jitEnabled,
        },
        severity: "notice",
        source: "enterprise.sso",
      },
    );

    return { config };
  });

export const completeSsoJitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ organizationId: z.string().uuid(), email: z.string().email() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { completeSsoJit } = await import("./sso.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const result = await completeSsoJit({
      supabase: context.supabase as any,
      admin: supabaseAdmin,
      userId: context.userId,
      email: data.email,
      organizationId: data.organizationId,
    });

    if (result.provisioned) {
      await writeAuditEvent(
        {
          supabase: context.supabase as any,
          userId: context.userId,
          tenant: { organizationId: data.organizationId, workspaceId: null },
        },
        {
          event: AUDIT_EVENTS.memberAdded,
          entity: { type: "organization", id: data.organizationId },
          next: { role: result.role, via: "sso_jit" },
          severity: "notice",
          source: "enterprise.sso.jit",
        },
      );
    }
    return result;
  });

export const getTenantPolicyFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveOrganizationId } = await import("@/lib/organization.server");
    const { organizationId, role } = await resolveOrganizationId(
      context.supabase as any,
      context.userId,
    );
    if (!organizationId) return { policy: null, canManage: false };

    const { data, error } = await (context.supabase as any)
      .from("organizations")
      .select("id, data_region, allowed_ai_provider_routes, preferred_locale")
      .eq("id", organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return {
      canManage: role === "owner" || role === "admin",
      policy: data
        ? {
            organizationId: data.id,
            dataRegion: data.data_region ?? "unspecified",
            allowedAiProviderRoutes: data.allowed_ai_provider_routes ?? ["default"],
            preferredLocale: data.preferred_locale ?? "en",
          }
        : null,
    };
  });

export const saveTenantPolicyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => tenantPolicyInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);

    const { data: row, error } = await (context.supabase as any)
      .from("organizations")
      .update({
        data_region: data.dataRegion,
        allowed_ai_provider_routes: data.allowedAiProviderRoutes,
        preferred_locale: data.preferredLocale,
      })
      .eq("id", organizationId)
      .select("id, data_region, allowed_ai_provider_routes, preferred_locale")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditEvent(
      {
        supabase: context.supabase as any,
        userId: context.userId,
        tenant: { organizationId, workspaceId: null },
      },
      {
        event: AUDIT_EVENTS.adminAction,
        entity: { type: "organization", id: organizationId },
        next: {
          dataRegion: data.dataRegion,
          allowedAiProviderRoutes: data.allowedAiProviderRoutes,
          preferredLocale: data.preferredLocale,
        },
        severity: "notice",
        source: "enterprise.tenant_policy",
      },
    );

    return {
      policy: {
        organizationId: row.id,
        dataRegion: row.data_region,
        allowedAiProviderRoutes: row.allowed_ai_provider_routes,
        preferredLocale: row.preferred_locale,
      },
    };
  });

export const listSupportAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { listSupportGrantsForOrg } = await import("./support-access.server");
    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);
    const grants = await listSupportGrantsForOrg(context.supabase as any, organizationId);
    return { grants };
  });

export const grantSupportAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => grantSupportAccessInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { grantSupportAccess } = await import("./support-access.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);
    const grant = await grantSupportAccess(
      context.supabase as any,
      organizationId,
      context.userId,
      data,
    );

    await writeAuditEvent(
      {
        supabase: context.supabase as any,
        userId: context.userId,
        tenant: { organizationId, workspaceId: grant.workspaceId },
      },
      {
        event: AUDIT_EVENTS.adminAction,
        entity: { type: "support_access_grant", id: grant.id },
        next: {
          granteeUserId: grant.granteeUserId,
          scopes: grant.scopes,
          endsAt: grant.endsAt,
          impersonation: false,
        },
        severity: "warning",
        source: "enterprise.support_access",
      },
    );

    return { grant };
  });

export const revokeSupportAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => revokeSupportAccessInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { revokeSupportAccess } = await import("./support-access.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { organizationId } = await requireOrgManager(context.supabase as any, context.userId);
    const grant = await revokeSupportAccess(
      context.supabase as any,
      data.grantId,
      data.revokeReason,
    );

    await writeAuditEvent(
      {
        supabase: context.supabase as any,
        userId: context.userId,
        tenant: { organizationId, workspaceId: grant.workspaceId },
      },
      {
        event: AUDIT_EVENTS.adminAction,
        entity: { type: "support_access_grant", id: grant.id },
        next: { revoked: true, revokeReason: data.revokeReason ?? null },
        severity: "notice",
        source: "enterprise.support_access",
      },
    );

    return { grant };
  });
