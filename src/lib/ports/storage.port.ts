/**
 * ObjectStorage port — bucket + signed URL surface without naming a vendor.
 */

import type { AdapterMeta } from "./types";

export const OBJECT_STORAGE_IDS = [
  "supabase_storage",
  "aws_s3",
  "azure_blob",
  "minio",
] as const;

export type ObjectStorageId = (typeof OBJECT_STORAGE_IDS)[number];

export type SignedUrlRequest = {
  bucket: string;
  path: string;
  expiresInSeconds: number;
  /** upload | download */
  mode: "download" | "upload";
};

export type SignedUrlResult =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; reason: string };

export type ObjectStoragePort = {
  readonly meta: AdapterMeta & { port: "object_storage"; id: ObjectStorageId };
  createSignedUrl(req: SignedUrlRequest): Promise<SignedUrlResult>;
};

export const OBJECT_STORAGE_CATALOGUE: Record<
  ObjectStorageId,
  Omit<AdapterMeta, "port"> & { id: ObjectStorageId }
> = {
  supabase_storage: {
    id: "supabase_storage",
    label: "Supabase Storage",
    status: "active",
    implementation: "src/lib/storage/* + ports/adapters/storage/supabase.adapter.ts",
  },
  aws_s3: {
    id: "aws_s3",
    label: "AWS S3",
    status: "planned",
    implementation: "src/lib/ports/adapters/storage/planned.ts",
  },
  azure_blob: {
    id: "azure_blob",
    label: "Azure Blob Storage",
    status: "planned",
    implementation: "src/lib/ports/adapters/storage/planned.ts",
  },
  minio: {
    id: "minio",
    label: "MinIO",
    status: "planned",
    implementation: "src/lib/ports/adapters/storage/planned.ts",
    notes: "S3-compatible on-prem / air-gap candidate.",
  },
};
