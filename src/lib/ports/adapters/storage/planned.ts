import {
  OBJECT_STORAGE_CATALOGUE,
  type ObjectStorageId,
  type ObjectStoragePort,
} from "@/lib/ports/storage.port";

function planned(id: Exclude<ObjectStorageId, "supabase_storage">): ObjectStoragePort {
  return {
    meta: { ...OBJECT_STORAGE_CATALOGUE[id], port: "object_storage" },
    async createSignedUrl() {
      return { ok: false, reason: `Object storage adapter '${id}' is not implemented yet.` };
    },
  };
}

export const awsS3Adapter = planned("aws_s3");
export const azureBlobAdapter = planned("azure_blob");
export const minioAdapter = planned("minio");

export const PLANNED_STORAGE_ADAPTERS = {
  aws_s3: awsS3Adapter,
  azure_blob: azureBlobAdapter,
  minio: minioAdapter,
} as const;
