/**
 * Storage policy — one definition of what may be stored, for how long a signed
 * URL stays valid, and which MIME types and sizes are acceptable.
 *
 * Pure and client-safe so the upload widget, the server issuer and the tests
 * all enforce the same matrix. The browser check is convenience; the server
 * issuer (`storage-access.server.ts`) is the enforcement point.
 */

export const STORAGE_BUCKETS = ["benefit-evidence", "avatars", "canvas-documents"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export type BucketPolicy = {
  /** Hard upper bound on a single object. */
  maxBytes: number;
  /** Exact MIME allowlist — no wildcards, no "application/octet-stream". */
  mimeTypes: readonly string[];
  /** File extensions accepted, cross-checked against the MIME type. */
  extensions: readonly string[];
  /**
   * Signed URL lifetime in seconds. Deliberately short: a signed URL is a
   * bearer capability that survives copy/paste, so it must expire before it
   * can be shared meaningfully.
   */
  signedUrlTtlSeconds: number;
};

export const BUCKET_POLICIES: Record<StorageBucket, BucketPolicy> = {
  "benefit-evidence": {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/csv",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: ["pdf", "png", "jpg", "jpeg", "webp", "csv", "txt", "xlsx", "docx", "pptx"],
    signedUrlTtlSeconds: 60,
  },
  avatars: {
    maxBytes: 2 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    extensions: ["png", "jpg", "jpeg", "webp"],
    signedUrlTtlSeconds: 300,
  },
  // Canvas documents are policy papers, mandates and baseline extracts, so the
  // allowlist is deliberately document-shaped and the TTL stays short.
  "canvas-documents": {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "text/csv",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: ["pdf", "png", "jpg", "jpeg", "csv", "txt", "xlsx", "docx", "pptx"],
    signedUrlTtlSeconds: 90,
  },
};

/** Export artefacts (CSV/JSON downloads) are streamed, never stored. */
export const EXPORT_ARTIFACT_MIME_TYPES = [
  "text/csv",
  "application/json",
  "application/pdf",
] as const;

export function isStorageBucket(value: string): value is StorageBucket {
  return (STORAGE_BUCKETS as readonly string[]).includes(value);
}

export function signedUrlTtl(bucket: StorageBucket): number {
  return BUCKET_POLICIES[bucket].signedUrlTtlSeconds;
}

export function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

/** Collapse a user-supplied filename into something safe as an object key. */
export function safeObjectName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "");
  return (cleaned || "file").slice(-80);
}

export type UploadDecision = { allowed: true } | { allowed: false; reason: string };

export type UploadCandidate = { name: string; size: number; type: string };

export function humanBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Single source of truth for "may this file be stored in this bucket?". */
export function validateUpload(bucket: StorageBucket, file: UploadCandidate): UploadDecision {
  const policy = BUCKET_POLICIES[bucket];
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { allowed: false, reason: "That file appears to be empty." };
  }
  if (file.size > policy.maxBytes) {
    return {
      allowed: false,
      reason: `That file is larger than the ${humanBytes(policy.maxBytes)} limit for this upload.`,
    };
  }
  const mime = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!policy.mimeTypes.includes(mime)) {
    return {
      allowed: false,
      reason: mime
        ? `${mime} files are not accepted here. Allowed: ${policy.extensions.join(", ")}.`
        : `That file type could not be identified. Allowed: ${policy.extensions.join(", ")}.`,
    };
  }
  const ext = extensionOf(file.name);
  if (!policy.extensions.includes(ext)) {
    return {
      allowed: false,
      reason: `The file extension ".${ext || "?"}" does not match an accepted type (${policy.extensions.join(", ")}).`,
    };
  }
  return { allowed: true };
}

export class StoragePolicyError extends Error {
  readonly code = "storage_policy_denied";
  constructor(reason: string) {
    super(reason);
    this.name = "StoragePolicyError";
  }
}

export function assertUploadAllowed(bucket: StorageBucket, file: UploadCandidate): void {
  const decision = validateUpload(bucket, file);
  if (!decision.allowed) throw new StoragePolicyError(decision.reason);
}

/** Accepted `accept` attribute for a file input, derived from the policy. */
export function acceptAttribute(bucket: StorageBucket): string {
  return BUCKET_POLICIES[bucket].mimeTypes.join(",");
}

/**
 * Evidence object keys are always `<userId>/<useCaseId>/<file>`. Parsing the
 * key server-side is how a signed-URL request is tied to a record the caller
 * is allowed to read.
 */
export function parseEvidencePath(
  path: string,
): { userId: string; useCaseId: string; file: string } | null {
  if (path.includes("..") || path.startsWith("/")) return null;
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [userId, useCaseId, file] = parts as [string, string, string];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(userId) || !uuid.test(useCaseId) || file.length === 0) return null;
  return { userId, useCaseId, file };
}

/**
 * Canvas document keys are always `<workshopId>/<section>/<file>`, so the
 * storage policy and the signed-URL issuer can both tie an object back to the
 * workshop whose membership authorises it.
 */
export function parseCanvasDocumentPath(
  path: string,
): { workshopId: string; section: string; file: string } | null {
  if (path.includes("..") || path.startsWith("/")) return null;
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [workshopId, section, file] = parts as [string, string, string];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(workshopId) || !/^[a-z_]{3,40}$/.test(section) || file.length === 0) return null;
  return { workshopId, section, file };
}
