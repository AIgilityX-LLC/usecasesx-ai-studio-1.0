/**
 * Enterprise SSO model (V2-18 / FR-18 + security baseline).
 * Pure — no DB / secrets. OIDC or SAML via existing Supabase Auth identity stack.
 * SCIM is intentionally not modelled here (see docs/v2/enterprise-identity-v2.md).
 */

import { z } from "zod";

export const SSO_PROTOCOLS = ["oidc", "saml"] as const;
export type SsoProtocol = (typeof SSO_PROTOCOLS)[number];

export const SSO_DEFAULT_ROLES = [
  "owner",
  "admin",
  "contributor",
  "viewer",
  "facilitator",
] as const;
export type SsoDefaultRole = (typeof SSO_DEFAULT_ROLES)[number];

export type OrganizationSsoConfig = {
  id: string;
  organizationId: string;
  protocol: SsoProtocol;
  enabled: boolean;
  allowedDomains: string[];
  jitEnabled: boolean;
  defaultMemberRole: SsoDefaultRole;
  providerSlug: string | null;
  metadataUrl: string | null;
  entityId: string | null;
  attributeEmailClaim: string;
  attributeNameClaim: string;
  notes: string | null;
};

export type SsoDiscoveryHit = {
  organizationId: string;
  organizationName: string;
  protocol: SsoProtocol;
  providerSlug: string | null;
  metadataUrl: string | null;
  entityId: string | null;
  jitEnabled: boolean;
};

/** Normalize email domain for allow-list matching. */
export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".") || domain.includes(" ")) return null;
  return domain;
}

export function domainAllowed(domain: string, allowed: string[]): boolean {
  const d = domain.trim().toLowerCase();
  return allowed.some((a) => a.trim().toLowerCase() === d);
}

export const ssoConfigInputSchema = z.object({
  protocol: z.enum(SSO_PROTOCOLS),
  enabled: z.boolean(),
  allowedDomains: z
    .array(z.string().trim().toLowerCase().min(3).max(253))
    .min(1)
    .max(50),
  jitEnabled: z.boolean().default(true),
  defaultMemberRole: z.enum(SSO_DEFAULT_ROLES).default("viewer"),
  providerSlug: z.string().trim().min(1).max(120).nullable().optional(),
  metadataUrl: z.string().url().max(2000).nullable().optional(),
  entityId: z.string().trim().max(500).nullable().optional(),
  attributeEmailClaim: z.string().trim().min(1).max(120).default("email"),
  attributeNameClaim: z.string().trim().min(1).max(120).default("name"),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type SsoConfigInput = z.infer<typeof ssoConfigInputSchema>;

export const ssoDiscoverInputSchema = z.object({
  email: z.string().trim().email().max(320),
});

/**
 * Whether JIT may provision this user into the org after a successful IdP login.
 * Never provisions when SSO is disabled, JIT is off, or the domain is not listed.
 */
export function mayJitProvision(opts: {
  enabled: boolean;
  jitEnabled: boolean;
  allowedDomains: string[];
  email: string;
}): { ok: true; domain: string } | { ok: false; reason: string } {
  if (!opts.enabled) return { ok: false, reason: "sso_disabled" };
  if (!opts.jitEnabled) return { ok: false, reason: "jit_disabled" };
  const domain = emailDomain(opts.email);
  if (!domain) return { ok: false, reason: "invalid_email" };
  if (!domainAllowed(domain, opts.allowedDomains)) {
    return { ok: false, reason: "domain_not_allowlisted" };
  }
  return { ok: true, domain };
}

/** SCIM is deferred — identity stack has no safe tenant-scoped SCIM surface yet. */
export const SCIM_STATUS = {
  supported: false as const,
  reason:
    "Supabase Auth does not expose a tenant-safe SCIM lifecycle API for organization membership. Deprovisioning via SCIM remains deferred until a Design Partner IdP contract exists.",
};
