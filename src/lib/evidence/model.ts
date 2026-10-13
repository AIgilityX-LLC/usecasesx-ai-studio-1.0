/**
 * Evidence domain model (V2-05) — pure, client-safe.
 *
 * Metadata only in audit payloads: never document bodies, prompts, secrets or PII.
 */

import { z } from "zod";

export const EVIDENCE_KINDS = ["link", "note", "file"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_SUBJECT_TYPES = [
  "use_case",
  "opportunity",
  "canvas_section",
  "score",
  "review",
  "benefit",
  "export",
  "workshop",
] as const;
export type EvidenceSubjectType = (typeof EVIDENCE_SUBJECT_TYPES)[number];

export const EVIDENCE_CONFIDENTIALITY = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
export type EvidenceConfidentiality = (typeof EVIDENCE_CONFIDENTIALITY)[number];

export const EVIDENCE_STATUSES = ["active", "stale", "missing", "conflict", "revoked"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const STALE_AFTER_DAYS = 180;

export type EvidenceItem = {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  recordVersionId: string | null;
  kind: EvidenceKind;
  label: string;
  url: string | null;
  note: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  source: string | null;
  ownerUserId: string | null;
  ownerLabel: string | null;
  collectedAt: string | null;
  reviewedAt: string | null;
  confidentiality: EvidenceConfidentiality;
  applicableFields: string[];
  integrityHash: string | null;
  retentionLabel: string | null;
  status: EvidenceStatus;
  statusNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type EvidenceIndicator = {
  status: EvidenceStatus;
  label: string;
  tone: "neutral" | "info" | "warning" | "danger";
  reason: string;
};

export function evidenceIndicator(item: EvidenceItem, now: Date = new Date()): EvidenceIndicator {
  if (item.status === "revoked") {
    return {
      status: "revoked",
      label: "Revoked",
      tone: "danger",
      reason: item.statusNote ?? "This evidence has been revoked.",
    };
  }
  if (item.status === "missing") {
    return {
      status: "missing",
      label: "Missing",
      tone: "warning",
      reason: item.statusNote ?? "Referenced evidence could not be located.",
    };
  }
  if (item.status === "conflict") {
    return {
      status: "conflict",
      label: "Conflict",
      tone: "danger",
      reason: item.statusNote ?? "This evidence conflicts with another record.",
    };
  }
  if (item.status === "stale") {
    return {
      status: "stale",
      label: "Stale",
      tone: "warning",
      reason: item.statusNote ?? "Marked stale by a reviewer.",
    };
  }

  const anchor = item.reviewedAt ?? item.collectedAt ?? item.createdAt;
  const ageMs = now.getTime() - new Date(anchor).getTime();
  const ageDays = ageMs / 86_400_000;
  if (Number.isFinite(ageDays) && ageDays > STALE_AFTER_DAYS) {
    return {
      status: "stale",
      label: "Stale",
      tone: "warning",
      reason: `Last reviewed/collected more than ${STALE_AFTER_DAYS} days ago.`,
    };
  }

  return {
    status: "active",
    label: "Active",
    tone: "info",
    reason: "Evidence is current.",
  };
}

/** Summarise a set of items for Canvas / score / export completeness chips. */
export function evidenceSetIndicators(items: readonly EvidenceItem[]): {
  total: number;
  active: number;
  stale: number;
  missing: number;
  conflict: number;
  warnings: string[];
} {
  const live = items.filter((i) => !i.deletedAt && i.status !== "revoked");
  let stale = 0;
  let missing = 0;
  let conflict = 0;
  let active = 0;
  const warnings: string[] = [];
  for (const item of live) {
    const ind = evidenceIndicator(item);
    if (ind.status === "stale") {
      stale += 1;
      warnings.push(`${item.label}: ${ind.reason}`);
    } else if (ind.status === "missing") {
      missing += 1;
      warnings.push(`${item.label}: ${ind.reason}`);
    } else if (ind.status === "conflict") {
      conflict += 1;
      warnings.push(`${item.label}: ${ind.reason}`);
    } else {
      active += 1;
    }
  }
  return { total: live.length, active, stale, missing, conflict, warnings };
}

export const EvidenceCreateInput = z
  .object({
    workspaceId: z.string().uuid(),
    organizationId: z.string().uuid().nullable().optional(),
    subjectType: z.enum(EVIDENCE_SUBJECT_TYPES),
    subjectId: z.string().uuid(),
    recordVersionId: z.string().uuid().nullable().optional(),
    kind: z.enum(EVIDENCE_KINDS),
    label: z.string().trim().min(1).max(200),
    url: z.string().trim().url().max(2000).nullable().optional(),
    note: z.string().trim().min(1).max(4000).nullable().optional(),
    storagePath: z.string().trim().min(3).max(500).nullable().optional(),
    mimeType: z.string().trim().max(120).nullable().optional(),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024)
      .nullable()
      .optional(),
    source: z.string().trim().max(300).nullable().optional(),
    ownerLabel: z.string().trim().max(160).nullable().optional(),
    collectedAt: z.string().date().nullable().optional(),
    reviewedAt: z.string().date().nullable().optional(),
    confidentiality: z.enum(EVIDENCE_CONFIDENTIALITY).default("internal"),
    applicableFields: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
    integrityHash: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{32,128}$/i, "Integrity hash must be hex.")
      .nullable()
      .optional(),
    retentionLabel: z.string().trim().max(80).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "link" && !val.url) {
      ctx.addIssue({ code: "custom", message: "Link evidence requires a URL.", path: ["url"] });
    }
    if (val.kind === "note" && !val.note) {
      ctx.addIssue({
        code: "custom",
        message: "Note evidence requires note text.",
        path: ["note"],
      });
    }
    if (val.kind === "file" && !val.storagePath) {
      ctx.addIssue({
        code: "custom",
        message: "File evidence requires a storage path.",
        path: ["storagePath"],
      });
    }
  });

export type EvidenceCreateInput = z.infer<typeof EvidenceCreateInput>;

/**
 * Audit-safe metadata only — strips note bodies, URLs query strings beyond host,
 * and any accidental sensitive keys (redactRecord still applied at write time).
 */
export function evidenceAuditMetadata(item: {
  id: string;
  kind: EvidenceKind;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  recordVersionId?: string | null;
  label: string;
  confidentiality: EvidenceConfidentiality;
  status: EvidenceStatus;
  mimeType?: string | null;
  sizeBytes?: number | null;
  integrityHash?: string | null;
  applicableFields?: string[];
  retentionLabel?: string | null;
}): Record<string, unknown> {
  return {
    evidenceId: item.id,
    kind: item.kind,
    subjectType: item.subjectType,
    subjectId: item.subjectId,
    recordVersionId: item.recordVersionId ?? null,
    label: item.label.slice(0, 120),
    confidentiality: item.confidentiality,
    status: item.status,
    mimeType: item.mimeType ?? null,
    sizeBytes: item.sizeBytes ?? null,
    hasIntegrityHash: Boolean(item.integrityHash),
    applicableFieldCount: item.applicableFields?.length ?? 0,
    retentionLabel: item.retentionLabel ?? null,
  };
}

export function rowToEvidenceItem(row: Record<string, unknown>): EvidenceItem {
  return {
    id: String(row.id),
    organizationId: (row.organization_id as string | null) ?? null,
    workspaceId: String(row.workspace_id),
    subjectType: row.subject_type as EvidenceSubjectType,
    subjectId: String(row.subject_id),
    recordVersionId: (row.record_version_id as string | null) ?? null,
    kind: row.kind as EvidenceKind,
    label: String(row.label),
    url: (row.url as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    storagePath: (row.storage_path as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    source: (row.source as string | null) ?? null,
    ownerUserId: (row.owner_user_id as string | null) ?? null,
    ownerLabel: (row.owner_label as string | null) ?? null,
    collectedAt: (row.collected_at as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    confidentiality: (row.confidentiality as EvidenceConfidentiality) ?? "internal",
    applicableFields: Array.isArray(row.applicable_fields)
      ? (row.applicable_fields as string[])
      : [],
    integrityHash: (row.integrity_hash as string | null) ?? null,
    retentionLabel: (row.retention_label as string | null) ?? null,
    status: (row.status as EvidenceStatus) ?? "active",
    statusNote: (row.status_note as string | null) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}
