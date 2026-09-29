/**
 * Support access / break-glass (V2-18 / FR-16).
 * Time-bound, explicit, audited. Never impersonates a tenant user.
 */

import { z } from "zod";

export const SUPPORT_SCOPES = ["read", "export"] as const;
export type SupportScope = (typeof SUPPORT_SCOPES)[number];

/** Maximum grant window — operators must re-approve for longer access. */
export const SUPPORT_ACCESS_MAX_HOURS = 72;

export type SupportAccessGrant = {
  id: string;
  organizationId: string;
  workspaceId: string;
  granteeUserId: string;
  grantedBy: string;
  reason: string;
  scopes: SupportScope[];
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
};

export const grantSupportAccessInputSchema = z.object({
  workspaceId: z.string().uuid(),
  granteeUserId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
  scopes: z.array(z.enum(SUPPORT_SCOPES)).min(1).max(4).default(["read"]),
  durationHours: z.number().int().min(1).max(SUPPORT_ACCESS_MAX_HOURS).default(8),
});

export type GrantSupportAccessInput = z.infer<typeof grantSupportAccessInputSchema>;

export const revokeSupportAccessInputSchema = z.object({
  grantId: z.string().uuid(),
  revokeReason: z.string().trim().min(3).max(500).optional(),
});

export function isGrantActive(
  grant: Pick<SupportAccessGrant, "startsAt" | "endsAt" | "revokedAt">,
  now = new Date(),
): boolean {
  if (grant.revokedAt) return false;
  const start = new Date(grant.startsAt).getTime();
  const end = new Date(grant.endsAt).getTime();
  const t = now.getTime();
  return t >= start && t < end;
}

/** Impersonation is prohibited — support always acts under their own user id. */
export const IMPERSONATION_PROHIBITED =
  "Impersonation is prohibited. Support access grants access under the operator's own identity only.";
