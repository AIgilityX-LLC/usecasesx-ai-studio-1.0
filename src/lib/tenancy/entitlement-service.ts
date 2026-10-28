/**
 * EntitlementService — subscriptions, quotas, and feature entitlements.
 *
 * SoT composition:
 * - Edition / plan codes → `src/lib/authz/editions.ts`
 * - Feature catalogue → `src/lib/authz/catalogue.ts` + permission-service
 * - AI quotas → `src/lib/ai/fair-use.ts` (+ optional `plans.limits` jsonb)
 * - Subscription ledger → `public.entitlements`
 */

import {
  editionFromPlanCode,
  editionUnlocks,
  resolveEdition,
  type Edition,
  type FoundingAccessConfig,
} from "@/lib/authz/editions";
import { can, evaluate, type AuthzSubject } from "@/lib/authz/permission-service";
import type { EntitlementKey } from "@/lib/authz/catalogue";
import { limitsForEdition } from "@/lib/ai/fair-use";
import type { FeatureEntitlement, QuotaSet, Subscription } from "./models";

export type EntitlementLedgerRow = {
  organization_id: string;
  plan_code: string | null;
  expires_at: string | null;
  revoked_at?: string | null;
  source?: string | null;
};

export type EntitlementServiceApi = {
  editionFromPlanCode: (code: string | null | undefined) => Edition;
  editionUnlocks: (edition: Edition, required: Edition) => boolean;
  resolveEdition: typeof resolveEdition;
  subscriptionFromRow: (row: EntitlementLedgerRow | null | undefined) => Subscription | null;
  quotasForEdition: (
    edition: Edition,
    planLimits?: Record<string, unknown> | null,
    env?: Record<string, string | undefined>,
  ) => QuotaSet;
  canFeature: (subject: AuthzSubject, key: EntitlementKey) => boolean;
  evaluateFeature: (subject: AuthzSubject, key: EntitlementKey) => FeatureEntitlement;
  effectiveSubscriptionEdition: (
    row: EntitlementLedgerRow | null | undefined,
    founding: FoundingAccessConfig,
    profile?: {
      storedTier?: string | null;
      expiresAt?: string | null;
      planType?: string | null;
      foundingMember?: boolean | null;
    },
  ) => Edition;
};

function subscriptionFromRow(
  row: EntitlementLedgerRow | null | undefined,
): Subscription | null {
  if (!row?.organization_id) return null;
  if (row.revoked_at) return null;
  return {
    organizationId: row.organization_id,
    planCode: row.plan_code,
    edition: editionFromPlanCode(row.plan_code),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    source: row.source ?? null,
  };
}

function quotasForEdition(
  edition: Edition,
  planLimits: Record<string, unknown> | null | undefined = null,
  env: Record<string, string | undefined> = {},
): QuotaSet {
  const fair = limitsForEdition(edition, env);
  return {
    edition,
    aiPerUserPerDay: fair.perUserPerDay,
    aiPerWorkspacePerDay: fair.perWorkspacePerDay,
    planLimits: planLimits ?? {},
  };
}

export const EntitlementService: EntitlementServiceApi = {
  editionFromPlanCode,
  editionUnlocks,
  resolveEdition,
  subscriptionFromRow,
  quotasForEdition,
  canFeature: can,
  evaluateFeature(subject, key) {
    const decision = evaluate(subject, key);
    return {
      key,
      allowed: decision.allowed,
      requiredEdition: decision.requiredEdition,
      message: decision.message,
    };
  },
  effectiveSubscriptionEdition(row, founding, profile = {}) {
    return resolveEdition(
      {
        storedTier: (profile.storedTier as Edition | null | undefined) ?? null,
        expiresAt: profile.expiresAt ?? null,
        planType: profile.planType ?? null,
        orgPlanCode: row?.plan_code ?? null,
        orgPlanExpiresAt: row?.expires_at ?? null,
        foundingMember: profile.foundingMember ?? null,
      },
      founding,
    );
  },
};
