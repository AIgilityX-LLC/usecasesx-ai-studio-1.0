/**
 * Active object-storage adapter — uses the user-scoped Supabase client.
 * Server-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OBJECT_STORAGE_CATALOGUE,
  type ObjectStoragePort,
  type SignedUrlRequest,
  type SignedUrlResult,
} from "@/lib/ports/storage.port";

export function createSupabaseStorageAdapter(
  supabase: SupabaseClient<any, any, any>,
): ObjectStoragePort {
  return {
    meta: { ...OBJECT_STORAGE_CATALOGUE.supabase_storage, port: "object_storage" },
    async createSignedUrl(req: SignedUrlRequest): Promise<SignedUrlResult> {
      if (req.mode === "upload") {
        const { data, error } = await supabase.storage
          .from(req.bucket)
          .createSignedUploadUrl(req.path);
        if (error || !data?.signedUrl) {
          return { ok: false, reason: error?.message ?? "Could not mint upload URL." };
        }
        return {
          ok: true,
          url: data.signedUrl,
          expiresInSeconds: req.expiresInSeconds,
        };
      }

      const { data, error } = await supabase.storage
        .from(req.bucket)
        .createSignedUrl(req.path, req.expiresInSeconds);
      if (error || !data?.signedUrl) {
        return { ok: false, reason: error?.message ?? "Could not mint download URL." };
      }
      return {
        ok: true,
        url: data.signedUrl,
        expiresInSeconds: req.expiresInSeconds,
      };
    },
  };
}
