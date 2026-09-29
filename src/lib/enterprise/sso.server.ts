/**
 * Server-only SSO persistence + discovery + JIT (V2-18).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  domainAllowed,
  emailDomain,
  mayJitProvision,
  type OrganizationSsoConfig,
  type SsoConfigInput,
  type SsoDiscoveryHit,
  type SsoDefaultRole,
} from "./sso";

type Db = SupabaseClient<any, any, any>;

function toConfig(row: any): OrganizationSsoConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    protocol: row.protocol,
    enabled: !!row.enabled,
    allowedDomains: (row.allowed_domains ?? []) as string[],
    jitEnabled: row.jit_enabled !== false,
    defaultMemberRole: (row.default_member_role ?? "viewer") as SsoDefaultRole,
    providerSlug: row.provider_slug ?? null,
    metadataUrl: row.metadata_url ?? null,
    entityId: row.entity_id ?? null,
    attributeEmailClaim: row.attribute_email_claim ?? "email",
    attributeNameClaim: row.attribute_name_claim ?? "name",
    notes: row.notes ?? null,
  };
}

export async function getSsoConfigForOrg(
  supabase: Db,
  organizationId: string,
): Promise<OrganizationSsoConfig | null> {
  const { data, error } = await supabase
    .from("organization_sso_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toConfig(data) : null;
}

export async function upsertSsoConfig(
  supabase: Db,
  organizationId: string,
  userId: string,
  input: SsoConfigInput,
): Promise<OrganizationSsoConfig> {
  const domains = [...new Set(input.allowedDomains.map((d) => d.trim().toLowerCase()))];
  const payload = {
    organization_id: organizationId,
    protocol: input.protocol,
    enabled: input.enabled,
    allowed_domains: domains,
    jit_enabled: input.jitEnabled,
    default_member_role: input.defaultMemberRole,
    provider_slug: input.providerSlug ?? null,
    metadata_url: input.metadataUrl ?? null,
    entity_id: input.entityId ?? null,
    attribute_email_claim: input.attributeEmailClaim,
    attribute_name_claim: input.attributeNameClaim,
    notes: input.notes ?? null,
    created_by: userId,
    deleted_at: null,
  };

  const { data, error } = await supabase
    .from("organization_sso_configs")
    .upsert(payload, { onConflict: "organization_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toConfig(data);
}

/**
 * Domain discovery for /sso. Uses service-role client so unsigned visitors
 * can resolve an allow-listed domain without reading other org rows broadly.
 */
export async function discoverSsoByEmail(
  admin: Db,
  email: string,
): Promise<SsoDiscoveryHit | null> {
  const domain = emailDomain(email);
  if (!domain) return null;

  const { data, error } = await admin
    .from("organization_sso_configs")
    .select(
      "organization_id, protocol, provider_slug, metadata_url, entity_id, jit_enabled, allowed_domains, enabled, organizations(name)",
    )
    .eq("enabled", true)
    .is("deleted_at", null)
    .contains("allowed_domains", [domain])
    .limit(5);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const hit = rows.find((r) => domainAllowed(domain, r.allowed_domains ?? []));
  if (!hit) return null;

  return {
    organizationId: hit.organization_id,
    organizationName: hit.organizations?.name ?? "Organization",
    protocol: hit.protocol,
    providerSlug: hit.provider_slug ?? null,
    metadataUrl: hit.metadata_url ?? null,
    entityId: hit.entity_id ?? null,
    jitEnabled: hit.jit_enabled !== false,
  };
}

/**
 * After a successful IdP login, ensure the user is an active org member when
 * JIT + domain policy allow it. Idempotent.
 */
export async function completeSsoJit(opts: {
  supabase: Db;
  admin: Db;
  userId: string;
  email: string;
  organizationId: string;
}): Promise<{ provisioned: boolean; role: string | null; reason?: string }> {
  const { data: cfgRow, error } = await opts.admin
    .from("organization_sso_configs")
    .select("*")
    .eq("organization_id", opts.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!cfgRow) return { provisioned: false, role: null, reason: "no_config" };

  const cfg = toConfig(cfgRow);
  const gate = mayJitProvision({
    enabled: cfg.enabled,
    jitEnabled: cfg.jitEnabled,
    allowedDomains: cfg.allowedDomains,
    email: opts.email,
  });
  if (!gate.ok) return { provisioned: false, role: null, reason: gate.reason };

  const { data: existing } = await opts.admin
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", opts.organizationId)
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (existing) {
    if ((existing as any).status !== "active") {
      await opts.admin
        .from("organization_members")
        .update({ status: "active" })
        .eq("id", (existing as any).id);
    }
    return { provisioned: false, role: (existing as any).role };
  }

  const { error: insErr } = await opts.admin.from("organization_members").insert({
    organization_id: opts.organizationId,
    user_id: opts.userId,
    role: cfg.defaultMemberRole,
    status: "active",
  });
  if (insErr) throw new Error(insErr.message);
  return { provisioned: true, role: cfg.defaultMemberRole };
}
