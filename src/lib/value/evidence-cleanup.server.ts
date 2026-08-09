/**
 * Orphaned evidence cleanup (server-only).
 *
 * Evidence uploads live in the private `benefit-evidence` bucket under
 * `<userId>/<useCaseId>/<file>`. When an evidence record is removed from a
 * benefit (or the benefit itself is deleted) the stored object can be left
 * behind. This job compares stored objects against the paths still referenced
 * by `use_case_benefits.evidence_links` and deletes the leftovers.
 *
 * A grace period protects uploads that were just created and are not yet
 * attached to a saved benefit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export const EVIDENCE_BUCKET = "benefit-evidence";

/** Uploads younger than this are never touched — they may still be in a form. */
export const CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;

export interface CleanupSummary {
  scanned: number;
  orphaned: number;
  deleted: number;
  skippedWithinGrace: number;
  dryRun: boolean;
  ranAt: string;
  deletedPaths: string[];
}

async function listReferencedPaths(client: Client, userId?: string): Promise<Set<string>> {
  let query = client.from("use_case_benefits").select("evidence_links");
  if (userId) query = query.eq("created_by", userId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const paths = new Set<string>();
  for (const row of data ?? []) {
    const links = (row as { evidence_links: unknown }).evidence_links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      const path = (link as { path?: unknown })?.path;
      if (typeof path === "string" && path) paths.add(path);
    }
  }
  return paths;
}

interface StoredObject {
  path: string;
  createdAt: number;
}

/** Depth-limited walk of the bucket; the layout is only two levels deep. */
async function listObjects(client: Client, prefix: string, depth = 0): Promise<StoredObject[]> {
  if (depth > 3) return [];
  const { data, error } = await client.storage
    .from(EVIDENCE_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(error.message);

  const out: StoredObject[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    const isFile = Boolean(entry.id);
    if (isFile) {
      out.push({ path, createdAt: Date.parse(entry.created_at ?? "") || Date.now() });
    } else {
      out.push(...(await listObjects(client, path, depth + 1)));
    }
  }
  return out;
}

export interface CleanupOptions {
  /** Restrict the sweep to one user's private folder. */
  userId?: string;
  /** Report what would be removed without deleting anything. */
  dryRun?: boolean;
}

export async function cleanupOrphanedEvidence(
  client: Client,
  options: CleanupOptions = {},
): Promise<CleanupSummary> {
  const ranAt = new Date().toISOString();
  const dryRun = options.dryRun ?? false;

  const [referenced, objects] = await Promise.all([
    listReferencedPaths(client, options.userId),
    listObjects(client, options.userId ?? ""),
  ]);

  const cutoff = Date.now() - CLEANUP_GRACE_MS;
  const orphans = objects.filter((object) => !referenced.has(object.path));
  const deletable = orphans.filter((object) => object.createdAt < cutoff);
  const skippedWithinGrace = orphans.length - deletable.length;

  let deletedPaths: string[] = [];
  if (!dryRun && deletable.length > 0) {
    const paths = deletable.map((object) => object.path);
    const { error } = await client.storage.from(EVIDENCE_BUCKET).remove(paths);
    if (error) throw new Error(error.message);
    deletedPaths = paths;
  }

  const summary: CleanupSummary = {
    scanned: objects.length,
    orphaned: orphans.length,
    deleted: deletedPaths.length,
    skippedWithinGrace,
    dryRun,
    ranAt,
    deletedPaths,
  };

  await client.from("audit_events").insert({
    actor_id: options.userId ?? null,
    entity_type: "benefit_evidence",
    entity_id: null,
    event_type: "benefit.evidence_cleanup",
    new_value: JSON.parse(JSON.stringify(summary)) as Json,
    source: options.userId ? "user" : "scheduler",
    severity: "info",
  });

  return summary;
}
