/**
 * Server-only support-access grants (V2-18). No impersonation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isGrantActive,
  type GrantSupportAccessInput,
  type SupportAccessGrant,
  type SupportScope,
} from "./support-access";

type Db = SupabaseClient<any, any, any>;

function toGrant(row: any): SupportAccessGrant {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    granteeUserId: row.grantee_user_id,
    grantedBy: row.granted_by,
    reason: row.reason,
    scopes: (row.scopes ?? ["read"]) as SupportScope[],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    revokedAt: row.revoked_at ?? null,
    revokeReason: row.revoke_reason ?? null,
  };
}

export async function listSupportGrantsForOrg(
  supabase: Db,
  organizationId: string,
): Promise<SupportAccessGrant[]> {
  const { data, error } = await supabase
    .from("support_access_grants")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toGrant);
}

export async function grantSupportAccess(
  supabase: Db,
  organizationId: string,
  grantedBy: string,
  input: GrantSupportAccessInput,
): Promise<SupportAccessGrant> {
  // Confirm workspace belongs to the org
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", input.workspaceId)
    .maybeSingle();
  if (wsErr) throw new Error(wsErr.message);
  if (!ws || (ws as any).organization_id !== organizationId) {
    throw new Error("Workspace is not part of this organization.");
  }

  const starts = new Date();
  const ends = new Date(starts.getTime() + input.durationHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("support_access_grants")
    .insert({
      organization_id: organizationId,
      workspace_id: input.workspaceId,
      grantee_user_id: input.granteeUserId,
      granted_by: grantedBy,
      reason: input.reason,
      scopes: input.scopes,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toGrant(data);
}

export async function revokeSupportAccess(
  supabase: Db,
  grantId: string,
  revokeReason?: string,
): Promise<SupportAccessGrant> {
  const { data, error } = await supabase
    .from("support_access_grants")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: revokeReason ?? "revoked_by_admin",
    })
    .eq("id", grantId)
    .is("revoked_at", null)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toGrant(data);
}

export async function assertActiveSupportAccess(
  supabase: Db,
  userId: string,
  workspaceId: string,
): Promise<SupportAccessGrant> {
  const { data, error } = await supabase
    .from("support_access_grants")
    .select("*")
    .eq("grantee_user_id", userId)
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("ends_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const active = (data ?? []).map(toGrant).find((g) => isGrantActive(g));
  if (!active) throw new Error("No active support access grant for this workspace.");
  return active;
}
