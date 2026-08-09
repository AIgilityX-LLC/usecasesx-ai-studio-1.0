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

export const EVIDENCE_BUCKET = "benefit-evidence";

/** 10 MB keeps a proof document reasonable without blocking real exports. */
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
}

export function newEvidenceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadEvidenceFile(
  useCaseId: string,
  file: File,
): Promise<BenefitEvidenceItem> {
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new DomainError("validation", "That file is larger than the 10 MB evidence limit.");
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    throw new DomainError("unauthorized", "Sign in to attach evidence.");
  }
  const path = `${userId}/${useCaseId}/${Date.now()}-${safeName(file.name)}`;
  const result = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
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

/** Short-lived signed URL so a reviewer can open an uploaded proof document. */
export async function getEvidenceUrl(path: string): Promise<string> {
  const result = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 300);
  if (result.error) throw normalizeError(result.error);
  return result.data.signedUrl;
}

export async function removeEvidenceFile(path: string): Promise<void> {
  const result = await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (result.error) throw normalizeError(result.error);
}
