/**
 * Evidence persistence + short-lived file access (server-only).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EvidenceCreateInput,
  evidenceAuditMetadata,
  rowToEvidenceItem,
  type EvidenceItem,
  type EvidenceStatus,
} from "./model";
import { AUDIT_EVENTS } from "@/lib/telemetry/events";
import { writeAuditEvent } from "@/lib/telemetry/recorder.server";
import { parseEvidenceItemsPath, signedUrlTtl } from "@/lib/storage/storage-policy";
import { EVIDENCE_ITEMS_BUCKET } from "@/lib/storage/buckets";

type Client = SupabaseClient<any, any, any>;

const SELECT =
  "id, organization_id, workspace_id, subject_type, subject_id, record_version_id, kind, label, url, note, storage_path, mime_type, size_bytes, source, owner_user_id, owner_label, collected_at, reviewed_at, confidentiality, applicable_fields, integrity_hash, retention_label, status, status_note, created_by, created_at, updated_at, deleted_at";

export async function listEvidenceForSubject(
  supabase: Client,
  subjectType: string,
  subjectId: string,
): Promise<EvidenceItem[]> {
  const { data, error } = await supabase
    .from("evidence_items")
    .select(SELECT)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .is("deleted_at", null)
    .neq("status", "revoked")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToEvidenceItem(row as Record<string, unknown>));
}

export async function createEvidenceItem(
  supabase: Client,
  userId: string,
  raw: unknown,
): Promise<EvidenceItem> {
  const input = EvidenceCreateInput.parse(raw);

  if (input.kind === "file" && input.storagePath) {
    const parsed = parseEvidenceItemsPath(input.storagePath);
    if (
      !parsed ||
      parsed.workspaceId !== input.workspaceId ||
      parsed.subjectType !== input.subjectType ||
      parsed.subjectId !== input.subjectId
    ) {
      throw new Error("That file reference does not belong to this evidence subject.");
    }
  }

  const { data, error } = await supabase
    .from("evidence_items")
    .insert({
      organization_id: input.organizationId ?? null,
      workspace_id: input.workspaceId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      record_version_id: input.recordVersionId ?? null,
      kind: input.kind,
      label: input.label,
      url: input.kind === "link" ? input.url : null,
      note: input.kind === "note" ? input.note : (input.note ?? null),
      storage_path: input.kind === "file" ? input.storagePath : null,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      source: input.source ?? null,
      owner_user_id: userId,
      owner_label: input.ownerLabel ?? null,
      collected_at: input.collectedAt ?? null,
      reviewed_at: input.reviewedAt ?? null,
      confidentiality: input.confidentiality,
      applicable_fields: input.applicableFields,
      integrity_hash: input.integrityHash ?? null,
      retention_label: input.retentionLabel ?? null,
      status: "active",
      created_by: userId,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);

  const item = rowToEvidenceItem(data as Record<string, unknown>);
  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: item.organizationId, workspaceId: item.workspaceId },
    },
    {
      event: AUDIT_EVENTS.evidenceAttached,
      entity: { type: "evidence_item", id: item.id },
      next: evidenceAuditMetadata(item),
      severity: "notice",
      source: "evidence",
      workspaceId: item.workspaceId,
      organizationId: item.organizationId,
    },
  );
  return item;
}

export async function setEvidenceStatus(
  supabase: Client,
  userId: string,
  id: string,
  status: EvidenceStatus,
  statusNote?: string | null,
): Promise<EvidenceItem> {
  const patch: Record<string, unknown> = { status, status_note: statusNote ?? null };
  if (status === "revoked") patch.deleted_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("evidence_items")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);

  const item = rowToEvidenceItem(data as Record<string, unknown>);
  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: item.organizationId, workspaceId: item.workspaceId },
    },
    {
      event: status === "revoked" ? AUDIT_EVENTS.evidenceRevoked : AUDIT_EVENTS.evidenceUpdated,
      entity: { type: "evidence_item", id: item.id },
      next: evidenceAuditMetadata(item),
      severity: status === "conflict" || status === "revoked" ? "warning" : "notice",
      source: "evidence",
      workspaceId: item.workspaceId,
      organizationId: item.organizationId,
    },
  );
  return item;
}

export async function issueEvidenceItemSignedUrl(
  supabase: Client,
  userId: string,
  evidenceId: string,
): Promise<{ ok: true; url: string; expiresInSeconds: number } | { ok: false; reason: string }> {
  const { data, error } = await supabase
    .from("evidence_items")
    .select(SELECT)
    .eq("id", evidenceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, reason: "Evidence not found or access denied." };
  }
  const item = rowToEvidenceItem(data as Record<string, unknown>);
  if (item.kind !== "file" || !item.storagePath) {
    return { ok: false, reason: "That evidence item is not a file." };
  }

  const parsed = parseEvidenceItemsPath(item.storagePath);
  if (!parsed || parsed.workspaceId !== item.workspaceId) {
    return { ok: false, reason: "Evidence file path is invalid." };
  }

  const ttl = signedUrlTtl(EVIDENCE_ITEMS_BUCKET);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const signed = await supabaseAdmin.storage
    .from(EVIDENCE_ITEMS_BUCKET)
    .createSignedUrl(item.storagePath, ttl);
  if (signed.error || !signed.data?.signedUrl) {
    return { ok: false, reason: "That evidence file could not be opened." };
  }

  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: item.organizationId, workspaceId: item.workspaceId },
    },
    {
      event: AUDIT_EVENTS.evidenceAccessed,
      entity: { type: "evidence_item", id: item.id },
      next: {
        ...evidenceAuditMetadata(item),
        access: "signed_url",
        expiresInSeconds: ttl,
      },
      severity: "info",
      source: "evidence",
      workspaceId: item.workspaceId,
      organizationId: item.organizationId,
    },
  );

  return { ok: true, url: signed.data.signedUrl, expiresInSeconds: ttl };
}

export async function listEvidenceActivity(
  supabase: Client,
  input: { workspaceId: string; subjectId?: string; limit?: number },
): Promise<
  Array<{
    id: string;
    eventType: string;
    entityId: string | null;
    actorId: string | null;
    createdAt: string;
    requestId: string | null;
    metadata: Record<string, unknown> | null;
  }>
> {
  let query = supabase
    .from("audit_events")
    .select("id, event_type, entity_id, actor_id, created_at, request_id, new_value")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", "evidence_item")
    .in("event_type", [
      AUDIT_EVENTS.evidenceAttached,
      AUDIT_EVENTS.evidenceUpdated,
      AUDIT_EVENTS.evidenceRevoked,
      AUDIT_EVENTS.evidenceAccessed,
    ])
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row: any) => ({
    id: row.id as string,
    eventType: row.event_type as string,
    entityId: (row.entity_id as string | null) ?? null,
    actorId: (row.actor_id as string | null) ?? null,
    createdAt: row.created_at as string,
    requestId: (row.request_id as string | null) ?? null,
    metadata: (row.new_value as Record<string, unknown> | null) ?? null,
  }));

  if (input.subjectId) {
    return rows.filter((r) => r.metadata?.subjectId === input.subjectId);
  }
  return rows;
}
