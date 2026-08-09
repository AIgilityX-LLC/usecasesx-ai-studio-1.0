/**
 * Server-only helpers for the launch-corpus QA action.
 * Receives an already-authorized Supabase client (RLS as the calling admin).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  buildQaReport,
  type ImportLogEntry,
  type QaRecord,
  type QaReport,
} from "@/lib/admin/corpus-quality";

const QA_SELECT = `id, slug, title, status, visibility, provenance, provenance_note,
  quality_status, quality_checked_at, summary, business_problem, ai_solution_concept,
  implementation_notes, governance_required, governance_notes, privacy_review_required,
  privacy_notes, cyber_review_required, cybersecurity_notes, updated_at`;

export interface CorpusQaPayload {
  report: QaReport;
  importLog: ImportLogEntry[];
}

export async function runCorpusQa(sb: any, logLimit = 500): Promise<CorpusQaPayload> {
  const { data, error } = await sb.from("use_cases").select(QA_SELECT).limit(5000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as QaRecord[];
  const report = buildQaReport(rows);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const { data: logRows, error: logError } = await sb
    .from("use_case_audit_log")
    .select("use_case_id, actor_id, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(logLimit);
  if (logError) throw new Error(logError.message);

  const importLog: ImportLogEntry[] = (logRows ?? []).map((r: any) => {
    const uc = r.use_case_id ? byId.get(r.use_case_id) : undefined;
    return {
      ts: r.created_at as string,
      actor: (r.actor_id as string | null) ?? "system",
      action: r.action as string,
      detail: (r.detail as string | null) ?? "",
      useCaseId: (r.use_case_id as string | null) ?? null,
      slug: uc?.slug ?? null,
      provenance: uc?.provenance ?? null,
      qualityStatus: uc?.quality_status ?? null,
    };
  });

  return { report, importLog };
}
