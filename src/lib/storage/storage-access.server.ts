/**
 * Server-side authorization for private storage objects.
 *
 * A signed URL is a bearer capability, so it is only ever minted here, after
 * the caller's right to the underlying record has been re-established through
 * an RLS-scoped read. The TTL comes from the storage policy, not the caller.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { EVIDENCE_BUCKET } from "@/lib/storage/buckets";
import { parseEvidencePath, signedUrlTtl } from "@/lib/storage/storage-policy";

export type SignedUrlResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; reason: string };

/**
 * Issue a short-lived URL for an evidence object.
 *
 * Authorization: the uploader always keeps access to their own folder; anyone
 * else must be able to read the parent use case through their own RLS-scoped
 * client, which is exactly the workspace boundary.
 */
export async function issueEvidenceSignedUrl(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  path: string,
): Promise<SignedUrlResult> {
  const parsed = parseEvidencePath(path);
  if (!parsed) return { ok: false, reason: "That evidence reference is not valid." };

  if (parsed.userId !== userId) {
    const { data, error } = await supabase
      .from("ai_use_cases")
      .select("id")
      .eq("id", parsed.useCaseId)
      .maybeSingle();
    if (error || !data) {
      return {
        ok: false,
        reason: "Access denied: this evidence belongs to a workspace record you cannot read.",
      };
    }
  }

  const ttl = signedUrlTtl(EVIDENCE_BUCKET);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) {
    console.error("[storage] signed url failed", { bucket: EVIDENCE_BUCKET });
    return { ok: false, reason: "That evidence file could not be opened." };
  }
  return { ok: true, url: data.signedUrl, expiresInSeconds: ttl };
}
