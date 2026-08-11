/**
 * Evidence attachments for benefits.
 *
 * Links are stored inline on the benefit row (`evidence_links` JSON). Uploads
 * live in the private `benefit-evidence` bucket under the uploader's own user
 * folder, which is exactly what the storage policies allow. Nothing is public:
 * viewing an upload issues a short-lived signed URL.
 */

import { supabase } from "@/integrations/supabase/client";
import { DomainError, normalizeError } from "./errors";
import type { BenefitEvidenceItem } from "@/lib/value/benefits.model";
import { EVIDENCE_BUCKET as EVIDENCE_BUCKET_ID } from "@/lib/storage/buckets";
import { BUCKET_POLICIES, safeObjectName, validateUpload } from "@/lib/storage/storage-policy";
import { createEvidenceSignedUrlFn } from "@/lib/storage.functions";

export const EVIDENCE_BUCKET = EVIDENCE_BUCKET_ID;

/** Size and MIME rules live in the shared storage policy. */
export const MAX_EVIDENCE_BYTES = BUCKET_POLICIES[EVIDENCE_BUCKET_ID].maxBytes;

export function newEvidenceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadEvidenceFile(
  useCaseId: string,
  file: File,
): Promise<BenefitEvidenceItem> {
  const decision = validateUpload(EVIDENCE_BUCKET_ID, {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!decision.allowed) throw new DomainError("validation", decision.reason);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    throw new DomainError("unauthenticated", "Sign in to attach evidence.");
  }
  const path = `${userId}/${useCaseId}/${Date.now()}-${safeObjectName(file.name)}`;
  const result = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (result.error) throw normalizeError(result.error);
  return {
    id: newEvidenceId(),
    kind: "file",
    label: file.name,
    path,
    addedAt: new Date().toISOString(),
    addedBy: userId,
  };
}

/**
 * Short-lived signed URL so a reviewer can open an uploaded proof document.
 * Minted server-side after the caller's access to the parent use case is
 * re-checked — the browser cannot sign a URL for an object it merely names.
 */
export async function getEvidenceUrl(path: string): Promise<string> {
  const result = await createEvidenceSignedUrlFn({ data: { path } });
  if (!result.ok) throw new DomainError("forbidden", result.reason);
  return result.url;
}

export async function removeEvidenceFile(path: string): Promise<void> {
  const result = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (result.error) throw normalizeError(result.error);
}
