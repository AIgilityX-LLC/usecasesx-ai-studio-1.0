/**
 * Server-side enforcement for report and roadmap export artefacts.
 *
 * The client-side matrix in `report-access.ts` keeps the UI honest; this is the
 * authority. It re-resolves the caller's workspace role and edition from the
 * database (never from request data), applies the entitlement catalogue, then
 * applies the same format matrix. A crafted request cannot claim a role.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveSubject } from "@/lib/authz.server";
import { evaluate } from "@/lib/authz/permission-service";
import { canExportReport, type ExportFormat } from "./report-access";

export type ExportAuthorization =
  | { allowed: true; role: string | null; workspaceId: string | null }
  | { allowed: false; reason: string };

/**
 * Authorize one export in one workspace.
 *
 * `workspaceId` is optional: when omitted the caller's primary workspace is
 * used, which matches how the reports page reads its records.
 */
export async function authorizeExport(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  format: ExportFormat,
  workspaceId?: string | null,
): Promise<ExportAuthorization> {
  let subject: Awaited<ReturnType<typeof resolveSubject>>;
  try {
    subject = await resolveSubject(supabase, userId, workspaceId ?? null);
  } catch {
    return { allowed: false, reason: "We could not verify your workspace access." };
  }

  // Entitlement first: generating an export is a plan-gated capability.
  const entitlement = evaluate(subject, "reports.generate");
  if (!entitlement.allowed) {
    return {
      allowed: false,
      reason: entitlement.message ?? "Your plan does not include report exports.",
    };
  }

  // Platform staff keep access even without a workspace membership row.
  const role = subject.isPlatformAdmin ? (subject.workspaceRole ?? "admin") : subject.workspaceRole;
  const decision = canExportReport(role, format);
  if (!decision.allowed) return { allowed: false, reason: decision.reason };

  return { allowed: true, role: role ?? null, workspaceId: subject.workspaceId };
}

/** Resolve the workspace that owns a portfolio, through the caller's own RLS. */
export async function portfolioWorkspaceId(
  supabase: SupabaseClient<any, any, any>,
  portfolioId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("portfolios")
    .select("workspace_id")
    .eq("id", portfolioId)
    .maybeSingle();
  return (data?.workspace_id as string | null) ?? null;
}
