/**
 * Canvas evidence persistence (server-only).
 *
 * Reads and writes go through the caller's authenticated client, so the
 * workshop policies remain the security boundary: members read, facilitators
 * attach documents and record versions. Every attach, detach and version
 * record also writes an append-only audit event.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CANVAS_BUCKET } from "@/lib/storage/buckets";
import { parseCanvasDocumentPath, signedUrlTtl } from "@/lib/storage/storage-policy";
import {
  isCanvasSection,
  normalizeCanvasVersion,
  type CanvasDocument,
  type CanvasVersion,
} from "@/lib/workshops.canvas-evidence";
import {
  assessCanvas,
  type CanvasSection,
  type CanvasSections,
} from "@/lib/workshops.public-value";

type Client = any;

const DOCUMENT_COLUMNS =
  "id, workshop_id, section, label, storage_path, mime_type, size_bytes, note, uploaded_by, created_at";

function toDocument(row: any): CanvasDocument {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    section: (isCanvasSection(row.section) ? row.section : "mandate") as CanvasSection,
    label: row.label,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    note: row.note ?? null,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

async function recordAudit(
  supabase: Client,
  input: {
    userId: string;
    workshopId: string;
    eventType: string;
    value: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_id: input.userId,
    entity_type: "workshop_canvas",
    entity_id: input.workshopId,
    event_type: input.eventType,
    new_value: input.value,
    source: "public_value_canvas",
  });
  // An audit write must never silently vanish, but it must not fail the action
  // it describes either: the failure is surfaced in the server log.
  if (error) console.error("[canvas] audit write failed", input.eventType, error.message);
}

export async function listCanvasDocuments(
  supabase: Client,
  workshopId: string,
): Promise<CanvasDocument[]> {
  const { data, error } = await supabase
    .from("workshop_canvas_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toDocument);
}

export async function recordCanvasDocument(
  supabase: Client,
  input: {
    workshopId: string;
    section: CanvasSection;
    label: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    note: string | null;
    userId: string;
  },
): Promise<CanvasDocument> {
  const parsed = parseCanvasDocumentPath(input.storagePath);
  if (!parsed || parsed.workshopId !== input.workshopId || parsed.section !== input.section) {
    throw new Error("That file reference does not belong to this canvas section.");
  }
  const { data, error } = await supabase
    .from("workshop_canvas_documents")
    .insert({
      workshop_id: input.workshopId,
      section: input.section,
      label: input.label,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      note: input.note,
      uploaded_by: input.userId,
    })
    .select(DOCUMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  await recordAudit(supabase, {
    userId: input.userId,
    workshopId: input.workshopId,
    eventType: "canvas.document.attached",
    value: {
      section: input.section,
      label: input.label,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
    },
  });
  return toDocument(data);
}

export async function deleteCanvasDocument(
  supabase: Client,
  input: { workshopId: string; documentId: string; userId: string },
): Promise<{ removed: boolean }> {
  const { data, error } = await supabase
    .from("workshop_canvas_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", input.documentId)
    .eq("workshop_id", input.workshopId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { removed: false };
  const document = toDocument(data);

  const removal = await supabase.storage.from(CANVAS_BUCKET).remove([document.storagePath]);
  if (removal.error) throw new Error(removal.error.message);
  const deletion = await supabase
    .from("workshop_canvas_documents")
    .delete()
    .eq("id", input.documentId);
  if (deletion.error) throw new Error(deletion.error.message);

  await recordAudit(supabase, {
    userId: input.userId,
    workshopId: input.workshopId,
    eventType: "canvas.document.removed",
    value: { section: document.section, label: document.label, storagePath: document.storagePath },
  });
  return { removed: true };
}

/** Short-lived URL for a canvas document, after re-checking workshop access. */
export async function issueCanvasDocumentUrl(
  supabase: Client,
  userId: string,
  path: string,
): Promise<{ ok: true; url: string; expiresInSeconds: number } | { ok: false; reason: string }> {
  const parsed = parseCanvasDocumentPath(path);
  if (!parsed) return { ok: false, reason: "That document reference is not valid." };
  // RLS decides: a non-member cannot read the row that names this object.
  const { data, error } = await supabase
    .from("workshop_canvas_documents")
    .select("id, workshop_id")
    .eq("storage_path", path)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, reason: "That document belongs to a workshop you cannot read." };
  }
  const ttl = signedUrlTtl(CANVAS_BUCKET);
  const signed = await supabase.storage.from(CANVAS_BUCKET).createSignedUrl(path, ttl);
  if (signed.error || !signed.data?.signedUrl) {
    console.error("[canvas] signed url failed", { userId });
    return { ok: false, reason: "That document link could not be created." };
  }
  return { ok: true, url: signed.data.signedUrl, expiresInSeconds: ttl };
}

/* ------------------------------------------------------------- versions */

const VERSION_COLUMNS =
  "id, workshop_id, version, sections, completeness, answered, note, created_by, created_at";

export async function listCanvasVersions(
  supabase: Client,
  workshopId: string,
): Promise<CanvasVersion[]> {
  const { data, error } = await supabase
    .from("workshop_canvas_versions")
    .select(VERSION_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("version", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeCanvasVersion);
}

/**
 * Appends a version snapshot for a submission. The version number is derived
 * from what is already stored, so history stays gap-free and append-only.
 */
export async function recordCanvasVersion(
  supabase: Client,
  input: {
    workshopId: string;
    sections: CanvasSections;
    note: string | null;
    userId: string;
  },
): Promise<CanvasVersion> {
  const { data: latest, error: latestError } = await supabase
    .from("workshop_canvas_versions")
    .select("version")
    .eq("workshop_id", input.workshopId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error(latestError.message);
  const readiness = assessCanvas(input.sections);
  const version = Number(latest?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("workshop_canvas_versions")
    .insert({
      workshop_id: input.workshopId,
      version,
      sections: input.sections,
      completeness: readiness.completeness,
      answered: readiness.answered,
      note: input.note,
      created_by: input.userId,
    })
    .select(VERSION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);

  await recordAudit(supabase, {
    userId: input.userId,
    workshopId: input.workshopId,
    eventType: "canvas.version.recorded",
    value: {
      version,
      completeness: readiness.completeness,
      answered: readiness.answered,
      note: input.note,
    },
  });
  return normalizeCanvasVersion(data);
}
